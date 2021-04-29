import { Handler } from '@netlify/functions';
import { getFetcher } from '../../lib/getFetcher';
import { track } from '../../lib/segment';
import { getVersionFromEvent } from '../../lib/version';
import { initSentry, sentryWrapHandler } from '../../lib/sentry';

initSentry();

const handler: Handler = async (
  event,
) => {
  const fetch = getFetcher();
  let downloadVersion;
  try {
    downloadVersion = await getVersionFromEvent(event);
  } catch (e) {
    return {
      statusCode: 500,
      body: e.message,
    };
  }

  let response = await fetch(
    `https://raw.githubusercontent.com/apollographql/rover/${downloadVersion}/installers/binstall/scripts/windows/install.ps1`,
  );
  
  if(response.ok) {
    const winInstallScript: string = await response.text();

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
      headers: {
        "X-Version": downloadVersion
      }
    };
  }

  if (response.status === 404){
    return {
      statusCode: 400,
      body: `Couldn't find release for version ${downloadVersion} on GitHub Releases. This could be a problem with GitHub being offline or missing this version`,
    }
  }

  return {
    statusCode: 500,
    body: `Error when loading Rover installer for ${downloadVersion} from GitHub releases. This could be because GitHub is down. The error we received from GitHub was ${response.statusText}`
  }
};

module.exports = {
  handler: sentryWrapHandler(handler),
  unwrappedHandler: handler,
};