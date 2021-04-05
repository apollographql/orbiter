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
  const downloadVersion = await getVersionFromEvent(event);

  // always fetch the script from `latest`. We will amend the script to make
  // sure it downloads the proper version of Rover.
  // This will allow us to fix potential bugs in the script later on, while
  // still allowing downloads of old versions of Rover :)
  let nixInstallScriptRes = await fetch(
    `https://raw.githubusercontent.com/apollographql/rover/${downloadVersion}/installers/binstall/scripts/nix/install.sh`,
  );
  let nixInstallScript = await nixInstallScriptRes.text();

  // Track the download, but explicitly _don't_ block on it
  track({
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
};

module.exports = {
  handler: sentryWrapHandler(handler),
  unwrappedHandler: handler,
};