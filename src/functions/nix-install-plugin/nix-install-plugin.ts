import {
  Handler,
  APIGatewayProxyResult,
  APIGatewayProxyEvent,
} from 'aws-lambda';
import { getFetcher } from '../../lib/getFetcher';
import { track } from '../../lib/segment';
import { getPluginFromEvent } from '../../lib/plugin';
import { initSentry, sentryWrapHandler } from '../../lib/sentry';

initSentry();

const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  event,
) => {
  const fetch = getFetcher();
  let plugin: [string, string];
  try {
    plugin = await getPluginFromEvent(event);
  } catch (e) {
    return {
      statusCode: 500,
      body: e.message,
    };
  }

  let plugin_name = plugin[0];
  let plugin_version = plugin[1];

  let response = await fetch(
    `https://raw.githubusercontent.com/apollographql/rover/${plugin_version}/installers/binstall/scripts/nix/install_${plugin_name.replace("-", "_")}.sh`,
  );

  if(response.ok){
    const nixInstallScript = await response.text();

    // Track the download, but explicitly _don't_ block on it
    track({
      event: `${plugin_name} Download`,
      context: {
        app: 'Rover',
        os: 'linux',
      },
      properties: {
        release_version: plugin_version,
      },
    });

    return {
      statusCode: 200,
      body: nixInstallScript,
      headers: {
        "X-Version": plugin_version
      }
    };
  }

  if (response.status === 404){
    return {
      statusCode: 400,
      body: `Couldn't find release for version ${plugin_name}@${plugin_version} on GitHub Releases. This could be a problem with GitHub being offline or missing this version`,
    }
  }

  return {
    statusCode: 500,
    body: `Error when loading Rover installer for ${plugin_name}@${plugin_version} from GitHub releases. This could be because GitHub is down. The error we received from GitHub was ${response.statusText}`
  }

};

module.exports = {
  handler: sentryWrapHandler(handler),
  unwrappedHandler: handler,
};