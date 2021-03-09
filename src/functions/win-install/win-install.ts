import {
  Handler,
  APIGatewayProxyResult,
  APIGatewayProxyEvent,
} from 'aws-lambda';
import { getFetcher } from '../../lib/getFetcher';
import { track } from '../../lib/segment';
import { getVersionFromEvent } from '../../lib/version';
import { initSentry, sentryWrapHandler } from '../../lib/sentry';

initSentry();

const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  event,
) => {
  const fetch = getFetcher();
  const { downloadVersion, latestVersion } = await getVersionFromEvent(event);

  // always fetch the script from `latest`. We will amend the script to make
  // sure it downloads the proper version of Rover.
  // This will allow us to fix potential bugs in the script later on, while
  // still allowing downloads of old versions of Rover :)
  let winInstallScriptRes = await fetch(
    `https://raw.githubusercontent.com/apollographql/rover/${latestVersion}/installers/binstall/scripts/windows/install.ps1`,
  );
  let winInstallScript: string = await winInstallScriptRes.text();

  // TODO 404

  // this is where the version overwriting happens. We inline a env var
  // declaration at the top of the installer :)
  // TODO: maybe we should add a line to unset this, since this will persist?
  if (downloadVersion !== latestVersion) {
    winInstallScript =
      `$Env:VERSION='${downloadVersion}' # added by Orbiter\n\n` +
      winInstallScript;
  }

  // Track the download, but explicitly _don't_ block on it
  track({
    event: 'Rover Download',
    context: {
      app: 'Rover',
      os: 'windows',
    },
    properties: {
      release_version: downloadVersion,
    },
  });

  return {
    statusCode: 200,
    body: winInstallScript,
  };
};

module.exports.handler = sentryWrapHandler(handler);
