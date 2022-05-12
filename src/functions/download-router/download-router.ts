import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { downloadEvent } from "../../lib/download";
import { initSentry, sentryWrapHandler } from "../../lib/sentry";

initSentry();

const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  event
) => {
  try {
    // router.apollo.dev / download / nix / latest
    // router.apollo.dev / download / win / v0.1.0
    let [_, __, inputPlatform, inputVersion] =
      event.path.split("/");
    return downloadEvent("router", inputPlatform, inputVersion, "installer");
  } catch (e) {
    return {
      statusCode: 500,
      body: e.message,
    };
  }
};

module.exports = {
  handler: sentryWrapHandler(handler),
  unwrappedHandler: handler,
};
