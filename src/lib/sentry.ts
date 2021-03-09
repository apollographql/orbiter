// https://docs.sentry.io/platforms/node/guides/aws-lambda/
const Sentry = require('@sentry/serverless');

const { SENTRY_DSN } = process.env;

export function initSentry() {
  if (SENTRY_DSN) {
    Sentry.AWSLambda.init({ dsn: SENTRY_DSN });
  }
}

export const sentryWrapHandler = Sentry.AWSLambda.wrapHandler;
