import { request } from "graphql-request";
import {DocumentNode} from "graphql";
//const graphQLEndpoint = "https://engine-dev0-api-gateway.c0.gql.zone/api/graphql";
const graphQLEndpoint = "https://graphql.api.apollographql.com/api/graphql";

const STUDIO_API_KEY = process.env["STUDIO_API_KEY"];

export async function track(
    document: DocumentNode,
  variables: any,
  userAgent: string
) {
  if (STUDIO_API_KEY) {
    try {
      request({
        url: graphQLEndpoint,
        document: document,
        variables,
        requestHeaders: {
          "User-Agent": userAgent,
          "X-Api-Key": STUDIO_API_KEY,
        },
      });
    } catch (e) {
      console.error(e);
    }
  } else {
    throw "Could not find $STUDIO_API_KEY";
  }
}
