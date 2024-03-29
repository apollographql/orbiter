import { APIGatewayProxyResult } from "aws-lambda";
import { getFetcher } from "./getFetcher";
import {
  InternalServerError,
  MalformedRequestError,
  NotFoundError,
} from "./error";
import { Binary } from "./binary";

// this is the main function meant to be called from the various endpoints
// the logic for getting the input is left up to the callers in ./functions
export async function downloadEvent(
  inputBinaryName: string | null,
  inputTarget: string | null,
  inputVersion: string | null,
  downloadType: "tarball" | "installer"
): Promise<APIGatewayProxyResult> {
  try {
    if (!inputBinaryName) {
      throw new MalformedRequestError("You must specify a binary to download");
    }
    if (!inputTarget) {
      throw new MalformedRequestError("You must specify a platform to target");
    }
    if (!inputVersion) {
      throw new MalformedRequestError("You must specify a version to download");
    }
    let binary = new Binary(inputBinaryName, inputVersion);
    let version = await binary.getFullyQualifiedVersion();
    let fetch = getFetcher();
    let endpoint: string;
    if (downloadType === "installer") {
      endpoint = binary.getInstallScriptUrl(inputTarget, version);
    } else if (downloadType === "tarball") {
      endpoint = binary.getReleaseTarballUrl(inputTarget, version);
    } else {
      throw new MalformedRequestError(
        "You must either download a tarball or an install script"
      );
    }
    // In order to mitigate an outage, we no longer follow redirects here (which is the m-f-h default)
    // but instead accept that we **may** get a redirect.
    // Slack: https://apollograph.slack.com/archives/C04933VF6CV/p1700645363560329
    let response = await fetch(endpoint, {
      method: "HEAD",
      redirect: "manual",
    });
    if (response.ok || response.status === 302) {
      return {
        statusCode: 302,
        body: `You are being redirected to ${endpoint}`,
        headers: {
          Location: endpoint,
          "Cache-Control": "max-age=60, stale-if-error=18000, stale-while-revalidate=30",
          "X-Version": version,
        },
      };
    } else if (response.status === 404) {
      throw new NotFoundError(
        `couldn't find a GitHub release for ${binary.name}@${version}. ${endpoint} returned 404.`
      );
    } else {
      throw new InternalServerError(
        `an unknown error occurred when loading the ${downloadType} for ${binary.name}@${version} from GitHub Releases. the error we received from GitHub was: '${response.statusText}'`
      );
    }
  } catch (e) {
    return {
      statusCode: e?.status || 500,
      body: e.message,
    };
  }
}
