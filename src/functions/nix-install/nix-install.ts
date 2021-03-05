import {
  Handler,
  APIGatewayProxyResult,
  APIGatewayProxyEvent,
} from 'aws-lambda';
import { getFetcher } from '../../lib/getFetcher';
import { track } from '../../lib/segment';
import { getVersionFromEvent } from '../../lib/version';

const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  event,
  _context,
) => {
  try {
    const fetch = getFetcher();
    const { downloadVersion, latestVersion } = await getVersionFromEvent(event);

    const TEMP_INSTALL_SCRIPT_UNTIL_RELEASED =
      'https://raw.githubusercontent.com/apollographql/rover/fcddd64ddedf162329c0d12ca3b1c0f67013114d/installers/binstall/scripts/nix/install.sh';

    // always fetch the script from `latest`. We will amend the script to make
    // sure it downloads the proper version of Rover.
    // This will allow us to fix potential bugs in the script later on, while
    // still allowing downloads of old versions of Rover :)
    let nixInstallScriptRes = await fetch(
      TEMP_INSTALL_SCRIPT_UNTIL_RELEASED,
      // TODO: this should be a stable url later
      // `https://raw.githubusercontent.com/apollographql/rover/${downloadVersion}/installers/binstall/scripts/nix/install.sh`,
    );
    let nixInstallScript = await nixInstallScriptRes.text();

    // TODO 404

    // this is where the version overwriting happens. We inline a env var
    // declaration at the top of the installer :)
    if (downloadVersion !== latestVersion) {
      nixInstallScript =
        `VERSION=${downloadVersion} # added by Orbiter\n\n` + nixInstallScript;
    }

    await track({
      event: 'Rover Download',
      context: {
        app: 'Rover',
        os: 'linux',
      },
      properties: {
        release_version: downloadVersion,
      },
    });

    return {
      statusCode: 200,
      body: nixInstallScript,
    };
  } catch (e) {
    throw e;
  }
};

module.exports.handler = handler;
