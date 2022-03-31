import {
  RoverTrackDocument,
  RoverTrackMutationVariables,
} from "../generated/studio";
import { request } from "graphql-request";
const graphQLEndpoint = "https://graphql.api.apollographql.com/api/graphql";

const STUDIO_API_KEY = process.env["STUDIO_API_KEY"];

export async function track(
  variables: RoverTrackMutationVariables,
  userAgent: string
) {
  if (STUDIO_API_KEY) {
    try {
      request({
        url: graphQLEndpoint,
        document: RoverTrackDocument,
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
