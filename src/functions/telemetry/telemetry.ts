import {
  Handler,
  APIGatewayProxyResult,
  APIGatewayProxyEvent,
} from 'aws-lambda';
// import { track } from '../../lib/segment';

const CLI_NAME: string = 'rover';

// interface Platform {
//   // the platform from which the command was run (i.e. linux, macOS, or windows)
//   os: string;
//   // CI info
//   continuous_integration: string | null;
// }

// interface Command {
//   // the name of the command that was run
//   name: string;
//   // the arguments that were passed to the command
//   arguments: object;
// }

// interface Session {
//   // the command usage where commands are paths and flags are query strings
//   // i.e. ap schema push --graph --variant would become ap/schema/push?graph&variant
//   command: Command;
//   // Apollo generated machine ID. This is a UUID and stored globally at ~/.apollo/config.toml
//   machine_id: string;
//   // A unique session id
//   session_id: string;
//   // the sha-256 hash of the current working directory
//   cwd_hash: string;
//   // Information about the current architecture/platform
//   platform: Platform;
//   // The current version of the CLI
//   cli_version: string;
// }

const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  event,
  _context,
) => {
  const headers = event.headers;
  const contentType = headers['content-type'];
  const userAgent = headers['user-agent'];
  console.log(userAgent);
  if (!userAgent || !userAgent.startsWith(CLI_NAME)) {
    return {
      statusCode: 403,
      body: 'Invalid Permissions',
    };
  }
  if (!contentType || !contentType.includes('application/json')) {
    //   return event.respondWith(
    //     new Response('Malformed Request', { statusCode: 400 }),
    //   );
    return {
      statusCode: 400,
      body: 'Malformed Request',
    };
  }

  return {
    statusCode: 200,
    body: 'TODO',
  };

  //   const body = event.request.json();
  // we make this non-block to respond back to the CLI right away
  //   event.waitUntil(waitUntil(event, body));
  //   event.respondWith(respondWith(body));
};

module.exports.handler = handler;

// export function reportTelemetry(_: any, event: FetchEvent) {
//   const { headers } = event.request;
//   const contentType = headers.get('content-type');
//   const userAgent = headers.get('user-agent');
//   if (!userAgent || !userAgent.startsWith(CLI_NAME)) {
//     return event.respondWith(
//       new Response('Invalid Permission', { status: 403 }),
//     );
//   }
//   if (!contentType || !contentType.includes('application/json')) {
//     return event.respondWith(
//       new Response('Malformed Request', { status: 400 }),
//     );
//   }

//   const body = event.request.json();
//   // we make this non-block to respond back to the CLI right away
//   event.waitUntil(waitUntil(event, body));
//   event.respondWith(respondWith(body));
// }

// async function respondWith(body: Promise<Session>): Promise<Response> {
//   await body;
//   return new Response('Report received', { status: 200 });
// }

// export async function waitUntil(event: FetchEvent, body: Promise<Session>) {
//   const userAgent = event.request.headers.get('user-agent') || undefined;
//   const parsed = await body;

//   const event_payload = {
//     anonymousId: parsed.machine_id,
//     event: 'rover invocation',
//     context: {
//       app: {
//         name: CLI_NAME,
//         version: parsed.cli_version,
//       },
//       os: {
//         name: parsed.platform.os,
//       },
//       userAgent,
//     },
//     messageId: parsed.session_id,
//     properties: {
//       command: parsed.command.name,
//       cwd_hash: parsed.cwd_hash,
//       arguments: parsed.command.arguments,
//       continuous_integration: parsed.platform.continuous_integration,
//     },
//   };
//   await track(event_payload);
// }
