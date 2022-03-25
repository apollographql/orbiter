// https://docs.sentry.io/platforms/node/guides/aws-lambda/
import { AWSLambda } from "@sentry/serverless";
import { Handler } from "aws-lambda";

export function initSentry() {
  AWSLambda.init();
}

function wrapHandler<TEvent, TResult>(
  handler: Handler<TEvent, TResult>,
  wrapOptions?: Partial<AWSLambda.WrapperOptions>
): Handler<TEvent, TResult> {
  let wrappedHandler: Handler<TEvent, TResult>;
  if (process.env.SENTRY_DSN) {
    let tryHandler = AWSLambda.wrapHandler(handler, wrapOptions);
    if (typeof tryHandler == typeof undefined) {
      throw new Error(
        "Something went wrong while initiating the Sentry handler"
      );
    } else {
      wrappedHandler = tryHandler as Handler<TEvent, TResult>;
    }
  } else {
    throw new Error("$SENTRY_DSN is not defined.");
  }

  return wrappedHandler;
}

export const sentryWrapHandler = wrapHandler;
