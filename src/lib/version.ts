import { getFetcher } from './getFetcher';
import { APIGatewayProxyEvent } from 'aws-lambda';

export async function getLatestVersion() {
  const fetch = getFetcher();
  const url = 'https://github.com/apollographql/rover/releases/latest';

  const res = await fetch(url, {
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

export async function getVersionFromEvent(event: APIGatewayProxyEvent) {
  const latestVersion = await getLatestVersion();
  const paramVersion =
    event.queryStringParameters && event.queryStringParameters.version;
  return {
    latestVersion,
    downloadVersion: paramVersion ? paramVersion : latestVersion,
  };
}
