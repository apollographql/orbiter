import { APIGatewayProxyResult } from "aws-lambda";
import { getFetcher } from "./getFetcher";
import { MalformedRequestError, NotFoundError } from "./error";
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
    if (downloadType == "installer") {
      endpoint = await binary.getInstallScriptUrl(inputTarget, version);
    } else if (downloadType == "tarball") {
      endpoint = await binary.getReleaseTarballUrl(inputTarget, version);
    } else {
      throw new MalformedRequestError("You must either download a tarball or an install script");
    }
    let response = await fetch(endpoint);
    if (response.ok) {
      const headers = {
        "X-Version": version,
      };
      const statusCode = 200;

      if (downloadType == "installer") {
        return {
          statusCode,
          body: await response.text(),
          headers,
        };
      } else if (downloadType == "tarball") {
        return {
          statusCode,
          body: Buffer.from(await response.buffer()).toString("base64"),
          headers,
          isBase64Encoded: true,
        };
      }
    }

    if (response.status === 404) {
      throw new NotFoundError(
        `couldn't find a GitHub release for ${binary.name}@${version}. ${endpoint} returned 404.`
      );
    }
    return {
      statusCode: 500,
      body: `an unknown error occurred when loading the ${downloadType} for ${binary.name}@${version} from GitHub Releases. the error we received from GitHub was '${response.statusText}'`,
    };
  } catch (e) {
    if (e instanceof MalformedRequestError) {
      return {
        statusCode: 400,
        body: e.message,
      };
    } else if (e instanceof NotFoundError) {
      return {
        statusCode: 404,
        body: e.message,
      };
    }
    return {
      statusCode: 500,
      body: `An unknown error occurred when loading the ${inputBinaryName} ${downloadType} for ${inputVersion}.`,
    };
  }
}
