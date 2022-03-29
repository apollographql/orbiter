// https://docs.sentry.io/platforms/node/guides/aws-lambda/
import { AWSLambda } from "@sentry/serverless";
import { Handler } from "aws-lambda";

export function initSentry() {
  AWSLambda.init();
}

function wrapHandler<TEvent, TResult>(
  handler: Handler<TEvent, TResult>,
  wrapOptions?: Partial<AWSLambda.WrapperOptions> | undefined
): Handler<TEvent, TResult | undefined> {
  if (process.env.SENTRY_DSN) {
    return AWSLambda.wrapHandler(handler, wrapOptions);
  } else {
    return handler;
  }
}

export const sentryWrapHandler = wrapHandler;
