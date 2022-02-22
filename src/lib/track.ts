import {
  RoverTrackDocument,
  RoverTrackMutationVariables,
} from "../generated/studio";
import { request } from "graphql-request";
const graphQLEndpoint =
  "https://graphql-staging.api.apollographql.com/api/graphql";

export async function track(
  variables: RoverTrackMutationVariables,
  userAgent: string
) {
  try {
    request({
      url: graphQLEndpoint,
      document: RoverTrackDocument,
      variables,
      requestHeaders: { "User-Agent": userAgent },
    });
  } catch (e) {
    console.error(e);
  }
}
