import { APIGatewayProxyEvent } from 'aws-lambda';
import { getLatestVersion } from './version';

export const LATEST_URL = 'https://github.com/apollographql/rover/releases/latest';

export async function getPluginFromEvent(event: APIGatewayProxyEvent): Promise<[string, string]> {
  // /plugins/rover-fed2/nix/v0.0.2
  // @ts-ignore TS6133
  const [_, __, plugin_name, platform, version] = event.path.split('/');

  const supportedPlugins = ['rover-fed2'];
  if (!plugin_name) {
    throw new Error(`No plugin provided. Must be one of: ${supportedPlugins}`)
  }

  if (!supportedPlugins.includes(plugin_name)) {
    throw new Error(`Plugin ${plugin_name} does not exist. Must be one of: ${supportedPlugins}`)
  }

  const supportedPlatforms = ['nix', 'win'];
  if (!platform) {
    throw new Error(`No platform provided. Must include one of: ${supportedPlatforms}`)
  }

  if (!version) {
    throw new Error('No version provided. Versions must be `latest` or in semver format `v0.0.0`')
  }

  // check for unsupported platform
  if (!supportedPlatforms.includes(platform.toLowerCase())) {
    throw new Error(`Invalid platform: ${platform}. Supported platforms: ${supportedPlatforms}`);
  }

  // check for 'latest' or properly formatted version id
  if (version.toLowerCase() == 'latest'){
    const latestVersion = await getLatestVersion();
    return [plugin_name, latestVersion];
  }
  else if (version.toLowerCase().startsWith('v')) {
    return [plugin_name, version];
  } else {
    throw new Error(`Invalid version: (${version}). Versions must start with a 'v' or be 'latest'.`)
  }
}
