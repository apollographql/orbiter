import {
  Handler,
  APIGatewayProxyResult,
  APIGatewayProxyEvent,
} from "aws-lambda";
import { track } from "../../lib/track";
import { sentryWrapHandler, initSentry } from "../../lib/sentry";
import {
  RoverTrackMutationVariables,
  RoverArgumentInput,
} from "../../generated/studio";

const CLI_NAME: string = "rover";

initSentry();

interface Platform {
  // the platform from which the command was run (i.e. linux, macOS, or windows)
  os: string;
  // CI info
  continuous_integration: string | null;
}

interface Command {
  // the name of the command that was run
  name: string;
  // the arguments that were passed to the command
  arguments: object;
}

interface Session {
  // the command usage where commands are paths and flags are query strings
  // i.e. ap schema push --graph --variant would become ap/schema/push?graph&variant
  command: Command;
  // Apollo generated machine ID. This is a UUID and stored globally at ~/.apollo/config.toml
  machine_id: string;
  // A unique session id
  session_id: string;
  // the sha-256 hash of the current working directory
  cwd_hash: string;
  // the sha-256 hash of the git remote URL
  remote_url_hash: string | null;
  // Information about the current architecture/platform
  platform: Platform;
  // The current version of the CLI
  cli_version: string;
}

const MALFORMED_REQUEST = {
  statusCode: 400,
  body: "Malformed Request",
};

const INVALID_PERMISSIONS = {
  statusCode: 403,
  body: "Invalid Permissions",
};

const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  event
) => {
  const headers = event.headers;
  const contentType = headers["content-type"];
  const userAgent = headers["user-agent"];

  if (!userAgent || !userAgent.startsWith(CLI_NAME)) return INVALID_PERMISSIONS;
  if (!contentType || !contentType.includes("application/json"))
    return MALFORMED_REQUEST;

  // Make sure the body exists and contains the right keys to properly build
  // a Session
  if (!event.body) return MALFORMED_REQUEST;
  const session: Session = JSON.parse(event.body);
  if (!session || !session.platform || !session.command)
    return MALFORMED_REQUEST;

  // we intentionally don't `await` this fn, because we don't want to block
  trackSession(session, userAgent);

  return {
    statusCode: 200,
    body: "Report received",
  };
};

module.exports.handler = sentryWrapHandler(handler);

export async function trackSession(session: Session, userAgent: string) {
  let args = new Array<RoverArgumentInput>();
  for (const key in session.command.arguments) {
    let value = session.command.arguments[key as keyof object];
    let input: RoverArgumentInput = {
      key,
      value,
    };
    args.push(input);
  }
  const event_payload: RoverTrackMutationVariables = {
    anonymousId: session.machine_id,
    command: session.command.name,
    cwdHash: session.cwd_hash,
    os: session.platform.os,
    remoteUrlHash: session.remote_url_hash,
    sessionId: session.session_id,
    version: session.cli_version,
    arguments: args,
    ci: session.platform.continuous_integration,
  };
  await track(event_payload, userAgent);
}
