import {
  Handler,
  APIGatewayProxyResult,
  APIGatewayProxyEvent,
} from 'aws-lambda';
// import btoa from 'btoa';
import { getFetcher } from '../../lib/getFetcher';
import { track } from '../../lib/segment';
import { initSentry, sentryWrapHandler } from '../../lib/sentry';

initSentry();

const GITHUB_RELEASE =
  'https://github.com/apollographql/apollo-tooling/releases';

const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  event,
  _context,
) => {
  const fetch = getFetcher();

  // silence unused variable warning
  // @ts-ignore: TS6133
  const [_, __, platform, version] = event.path.split('/');

  // we don't need to check and see if platform and version both exist.
  // The redirect rules should ensure that there's always SOMETHING for those
  // values, otherwise the route will 404 and not reach here

  // this only supports 64 bit architectures. I don't see us changing this but if we do, this will become gross
  const downloadUrl = `${GITHUB_RELEASE}/download/apollo@${version}/apollo-v${version}-darwin-x64.tar.gz`;

  // we just want to make sure it's a valid download so we just need to HEAD
  const response = await fetch(downloadUrl, {
    method: 'HEAD',
  });

  if (response.ok) {
    track({
      event: 'Legacy CLI download',
      context: {
        app: 'Apollo iOS',
        os: 'darwin',
      },
      properties: {
        release_version: version,
      },
    });

    return {
      statusCode: 301,
      headers: {
        Location: downloadUrl,
      },
      body: `Redirecting to ${downloadUrl}`,
    };
  }

  if (response.status === 404) {
    return {
      statusCode: 400,
      body: `Couldn't find release for version ${version} on ${platform} on GitHub Releases. This could be a problem with GitHub being offline or missing this version`,
    };
  }
  return {
    statusCode: 500,
    body: `Error when loading the legacy CLI for ${version} on ${platform} on GitHub releases. This could be because GitHub is down. The error we received from GitHub was ${response.statusText}`,
  };
};

module.exports.handler = sentryWrapHandler(handler);
