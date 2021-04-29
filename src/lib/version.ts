import { getFetcher } from './getFetcher';
import { HandlerEvent } from '@netlify/functions';
export const LATEST_URL = 'https://github.com/apollographql/rover/releases/latest';

export async function getLatestVersion() {
  const fetch = getFetcher();

  const res = await fetch(LATEST_URL, {
    method: 'HEAD',
    redirect: 'manual',
  });

  let latestUrl = res.headers.get('location');
  const splits = latestUrl && latestUrl.split('/');

  const latestVersion = splits && splits[splits.length - 1];
  if (!latestVersion) {
    throw new Error('Could not get latest version');
  }

  return latestVersion;
}

export async function getVersionFromEvent(event: HandlerEvent): Promise<string> {
  // /nix/v0.0.2
  // @ts-ignore TS6133
  const [_, platform, version] = event.path.split('/');
  
  const supportedPlatforms = ['nix', 'win'];
  if(!platform) {
    throw new Error(`No platform provided. Must include one of: ${supportedPlatforms}`)
  }

  if(!version) {
    throw new Error('No version provided. Versions must be `latest` or in semver format `v0.0.0`')
  }

  // check for unsupported platform
  if(!supportedPlatforms.includes(platform.toLowerCase())) {
    throw new Error(`Invalid platform: ${platform}. Supported platforms: ${supportedPlatforms}`);
  }

  // check for 'latest' or properly formatted version id
  if (version.toLowerCase() == 'latest'){
    const latestVersion = await getLatestVersion();
    return latestVersion;
  }
  else if (version.toLowerCase().startsWith('v')) {
    return version;
  } else {
    throw new Error(`Invalid version: (${version}). Versions must start with a 'v' or be 'latest'.`)
  }
}
