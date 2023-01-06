import {
  APIGatewayProxyResult,
  APIGatewayProxyEvent,
} from "aws-lambda";
import {track} from "../../lib/track";
import {
  RouterTrackDocument,
  RouterTrackMutationVariables,
  RouterUsageInput,
} from "../../generated/studio";
import {MALFORMED_REQUEST, Platform} from "./telemetry";

export const ROUTER_AGENT: string = "router";

interface Request {
  // A random ID that is generated on first startup of the Router. It is not persistent between restarts of the Router, but will be persistent for hot reloads
  session_id: string
  // The version of the Router
  version: string
  // Information about the current architecture/platform
  platform: Platform;
  // A hash of the supergraph schema
  supergraph_hash: string
  // The apollo key if specified
  apollo_key: string
  // The apollo graph ref is specified
  apollo_graph_ref: string
  // Information about what was being used
  usage: object;
}

export async function routerHandler(event: APIGatewayProxyEvent, userAgent: string) : Promise<APIGatewayProxyResult> {
  // Make sure the body exists and contains the right keys to properly build
  // a Session
  if (!event.body) return MALFORMED_REQUEST;
  const request: Request = JSON.parse(event.body);
  if (!request || !request.platform || !request.usage)
    return MALFORMED_REQUEST;

  // we intentionally don't `await` this fn, because we don't want to block
  trackRouter(request, userAgent);

  return {
    statusCode: 200,
    body: "Report received",
  };
}

export async function trackRouter(request: Request, userAgent: string) {
  let usage = new Array<RouterUsageInput>();
  for (const key in request.usage) {
    let frequency = request.usage[key as keyof object];
    let input: RouterUsageInput = {
      key,
      frequency,
    };
    usage.push(input);
  }
  const variables: RouterTrackMutationVariables = {
    sessionId: request.session_id,
    os: request.platform.os,
    ci: request.platform.continuous_integration,
    version: request.version,
    usage: usage,
    apolloKey: request.apollo_key,
    apolloGraphRef: request.apollo_graph_ref,
    supergraphHash: request.supergraph_hash
  };
  await track(RouterTrackDocument, variables, userAgent);
}
