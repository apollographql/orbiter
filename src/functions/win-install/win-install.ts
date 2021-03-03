import {
  Handler,
  APIGatewayProxyResult,
  APIGatewayProxyEvent,
} from 'aws-lambda';
import { getFetcher } from '../../lib/getFetcher';
import { getVersionFromEvent } from '../../lib/version';

const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  event,
  _context,
) => {
  try {
    const fetch = getFetcher();
    const { downloadVersion, latestVersion } = await getVersionFromEvent(event);

    const TEMP_INSTALL_SCRIPT_UNTIL_RELEASED =
      'https://raw.githubusercontent.com/apollographql/rover/39c817a8fcf1dc81b33025449d36d43ccf881ce5/installers/binstall/scripts/windows/install.ps1';

    // always fetch the script from `latest`. We will amend the script to make
    // sure it downloads the proper version of Rover.
    // This will allow us to fix potential bugs in the script later on, while
    // still allowing downloads of old versions of Rover :)
    let winInstallScriptRes = await fetch(
      TEMP_INSTALL_SCRIPT_UNTIL_RELEASED,
      // TODO: this should be a stable url later
      // `https://raw.githubusercontent.com/apollographql/rover/${downloadVersion}/installers/binstall/scripts/windows/install.ps1`,
    );
    let winInstallScript: string = await winInstallScriptRes.text();

    // this is where the version overwriting happens. We inline a env var
    // declaration at the top of the installer :)
    // TODO: maybe we should add a line to unset this, since this will persist?
    if (downloadVersion !== latestVersion) {
      winInstallScript =
        `$Env:VERSION='${downloadVersion}' # added by Orbiter\n\n` +
        winInstallScript;
    }

    return {
      statusCode: 200,
      body: winInstallScript,
    };
  } catch (e) {
    throw e;
  }
};

module.exports.handler = handler;
