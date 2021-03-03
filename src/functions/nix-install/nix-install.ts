import {
  Handler,
  APIGatewayProxyResult,
  APIGatewayProxyEvent,
} from 'aws-lambda';
import { getFetcher } from '../../lib/getFetcher';
import { getLatestVersion } from '../../lib/getLatestVersion';

const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  _event,
  _context,
) => {
  try {
    const fetch = getFetcher();

    const latestVersion = await getLatestVersion();

    let nixInstallScriptRes = await fetch(
      `https://raw.githubusercontent.com/apollographql/rover/${latestVersion}/installers/binstall/scripts/nix/install.sh`,
    );
    let nixInstallScript = await nixInstallScriptRes.text();

    return {
      statusCode: 200,
      body: nixInstallScript,
    };
  } catch (e) {
    throw e;
  }
};

module.exports.handler = handler;
