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

    let winInstallScriptRes = await fetch(
      `https://raw.githubusercontent.com/apollographql/rover/${latestVersion}/installers/binstall/scripts/windows/install.ps1`,
    );
    let winInstallScript = await winInstallScriptRes.text();

    return {
      statusCode: 200,
      body: winInstallScript,
    };
  } catch (e) {
    throw e;
  }
};

module.exports.handler = handler;
