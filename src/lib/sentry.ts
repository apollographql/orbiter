// https://docs.sentry.io/platforms/node/guides/aws-lambda/
import { AWSLambda } from '@sentry/serverless';

export function initSentry() {
  AWSLambda.init();
}

export const sentryWrapHandler = AWSLambda.wrapHandler;
