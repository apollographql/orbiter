import { Fetcher } from "make-fetch-happen";
import {
  InternalServerError,
  MalformedRequestError,
  NotFoundError,
} from "./error";
import { getFetcher } from "./getFetcher";

export class Binary {
  name: BinaryName;
  repo: Repo;
  inputVersion: InputVersion;

  constructor(inputBinaryName: string, inputVersion: string) {
    this.name = enumFromStringValue(BinaryName, inputBinaryName);
    this.inputVersion = new InputVersion(inputVersion, this.name);
    this.repo = new Repo(this.name);
  }

  private getReleaseTagName(version: string): string {
    let tagName: string;
    switch (this.name) {
      case BinaryName.Router:
      case BinaryName.Rover:
      case BinaryName.RoverFed2:
        tagName = version;
        break;
      case BinaryName.Supergraph:
        tagName = encodeURIComponent(`supergraph@${version}`);
        break;
      default:
        throw new MalformedRequestError(
          `invalid binary name '${this.name
          }'. possible names are ${possibleValues(BinaryName)}`
        );
    }
    return tagName;
  }

  private getReleaseTarballName(
    inputTargetTriple: string,
    version: string
  ): string {
    let targetTriple = enumFromStringValue(TargetTriple, inputTargetTriple);
    if (targetTriple === TargetTriple.AppleArm && this.name === BinaryName.Supergraph) {
      throw new MalformedRequestError(`invalid target '${targetTriple}' for '${this.name}' binary, you should download the 'x86_64-apple-darwin' target instead and it will work on Mac machines with Apple's ARM processor via emulation.`)
    }
    return `${this.name}-${version}-${targetTriple}.tar.gz`;
  }

  getReleaseTarballUrl(inputTargetTriple: string, version: string): string {
    return `https://github.com/${this.repo.slug
      }/releases/download/${this.getReleaseTagName(
        version
      )}/${this.getReleaseTarballName(inputTargetTriple, version)}`;
  }

  async getFullyQualifiedRoverVersion(fetch: Fetcher): Promise<string> {
    let versionUrl = this.versionUrl();
    let response = await fetch(versionUrl, {
      method: "HEAD",
      redirect: "manual",
    });
    if (response?.status === 301 || response?.status === 302) {
      let realLatestUrl = response.headers.get("location");
      // https:, , github.com, apollographql, rover, releases, v0.99.99
      const urlComponents = realLatestUrl?.split("/");
      // grab the last element
      const latestVersion = urlComponents?.pop();
      if (!latestVersion) {
        throw new NotFoundError("could not get latest version");
      }
      return latestVersion;
    } else if (response.status === 404) {
      throw new NotFoundError(
        `could not find release. ${versionUrl} returned 404`
      );
    } else {
      throw new InternalServerError(
        `something went wrong while fetching ${versionUrl}`
      );
    }
  }

  async getFullyQualifiedSupergraphVersion(
    fetch: Fetcher,
    version: string
  ): Promise<string> {
    // supergraph is a bit weird because we have a "latest" for fed 1 _and_ for fed 2
    // `cargo xtask tag` automatically bumps the ref that `composition-latest-0`/`composition-latest-2` point to
    // and the tag annotation includes the fully resolved version
    // there are a few hoops to jump through but it's not _too_ bad
    let latestTag: string;
    if (version === "latest-0") {
      latestTag = "refs/tags/composition-latest-0";
    } else if (version === "latest-2") {
      latestTag = "refs/tags/composition-latest-2";
    } else {
      throw new MalformedRequestError(
        `invalid version '${this.inputVersion}'. must be 'latest-0', 'latest-2', or in semver form 'v0.0.0'`
      );
    }
    // this is the same url that's used under the hood when running `git ls-remote`
    // it's a good way to get info about tags without having to clone the entire repository
    const tagsUrl = this.repo.tagsUrl();
    let allTagsResponse = await fetch(tagsUrl);
    const allTags = await allTagsResponse.text();
    let ref: string | null = null;
    // slice the first two lines because they are C headers or something
    // and skip the last line is an empty 0000
    for (let refTag of allTags.split("\n").slice(2, -1)) {
      // each line looks like this:
      // 004cbfc117e2ddd919d56f1172f39e407558c4f975aa refs/tags/composition-latest-2
      // 004c65b6f9847e772e1b0510b97c39d399df9c911f03 refs/tags/composition@v2.0.0-preview.2
      let [thisRef, thisTag] = refTag.trim().split(" ");
      if (thisTag === latestTag) {
        // the `004c` prefix must be trimmed to get the correct tag.
        ref = thisRef.slice(4);
      }
    }

    if (ref === null) {
      throw new NotFoundError(
        `could not find ref for tag ${latestTag} in https://github.com/${this.repo.slug}`
      );
    }
    // now that we have the ref, we can query for the message inside our annotated tag that contains
    // the real version we're looking to download.
    // API docs on this endpoint are here: https://docs.github.com/en/rest/reference/git#get-a-tag
    const tagUrl = this.repo.tagUrl(ref);
    let ghToken = process.env.GH_TOKEN;
    if (!ghToken) {
      throw new InternalServerError("$GH_TOKEN is not set");
    }
    let tagResponse = await fetch(tagUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${ghToken}`,
      },
    });
    if (tagResponse.status === 404) {
      throw new NotFoundError(`could not find a git tag at ${tagUrl}`);
    } else if (!tagResponse.ok) {
      throw new InternalServerError(
        `an unknown error occurred when fetching the tag for ${this.name}@${this.inputVersion}`
      );
    }
    let tag = await tagResponse.json();
    if (typeof tag.message === "string") {
      // the message has a newline at the end of it so let's discard that.
      let latest = tag.message.trim();

      // let's verify that the message is looking good
      if (latest?.startsWith("v")) {
        return latest;
      } else {
        throw new InternalServerError(
          `version from tag ${latestTag} is malformed`
        );
      }
    } else {
      throw new InternalServerError(`.message is not a string`);
    }
  }

  async getFullyQualifiedVersion(): Promise<string> {
    let fetcher = getFetcher();
    let version = this.inputVersion.toString();
    if (version.startsWith("v")) {
      return version;
    }

    if (!version.startsWith("latest")) {
      throw new InternalServerError(
        "an unknown error occurred while getting fully qualified version"
      );
    }

    switch (this.name) {
      case BinaryName.Router:
      case BinaryName.Rover:
        return this.getFullyQualifiedRoverVersion(fetcher);
      case BinaryName.RoverFed2:
        // rover_fed2@v0.4.8 was the latest version ever released for this plugin
        return "v0.4.8";
      case BinaryName.Supergraph:
        return this.getFullyQualifiedSupergraphVersion(fetcher, version);

      default:
        throw new MalformedRequestError(
          `invalid binary name '${this.name
          }'. possible names are ${possibleValues(BinaryName)}`
        );
    }
  }

  getInstallScriptUrl(inputTargetPlatform: string, version: string): string {
    let targetPlatform = enumFromStringValue(
      TargetPlatform,
      inputTargetPlatform
    );
    let installerFileExtension = null;
    let installerPlatform = null;
    switch (targetPlatform) {
      case TargetPlatform.Nix:
        installerFileExtension = ".sh";
        installerPlatform = "nix";
        break;
      case TargetPlatform.Windows:
        installerFileExtension = ".ps1";
        installerPlatform = "windows";
        break;
    }

    if (!installerFileExtension || !installerPlatform) {
      throw new MalformedRequestError(
        "could not determine the correct URL for this platform"
      );
    }

    switch (this.name) {
      case BinaryName.Router:
        return `https://raw.githubusercontent.com/${this.repo.slug}/${version}/scripts/install.sh`;
      case BinaryName.Rover:
        return `https://raw.githubusercontent.com/${this.repo.slug}/${version}/installers/binstall/scripts/${installerPlatform}/install${installerFileExtension}`;
      case BinaryName.RoverFed2:
        return `https://raw.githubusercontent.com/${this.repo.slug}/${version}/installers/binstall/scripts/${installerPlatform}/install_rover_fed2${installerFileExtension}`;
      case BinaryName.Supergraph:
        throw new MalformedRequestError(
          "The supergraph binary does not have an install script. You must download the tarball instead."
        );
      default:
        throw new MalformedRequestError(
          `invalid binary name '${this.name
          }'. possible names are ${possibleValues(BinaryName)}`
        );
    }
  }

  versionUrl(): string {
    return this.repo.releaseUrl(this.inputVersion);
  }

  tagsUrl(): string {
    return this.repo.tagsUrl();
  }
}

enum BinaryName {
  Router = "router",
  Rover = "rover",
  Supergraph = "supergraph",
  RoverFed2 = "rover-fed2",
}

enum TargetTriple {
  AppleAmd = "x86_64-apple-darwin",
  AppleArm = "aarch64-apple-darwin",
  LinuxAmdGnu = "x86_64-unknown-linux-gnu",
  LinuxAmdMusl = "x86_64-unknown-linux-musl",
  LinuxArm = "aarch64-unknown-linux-gnu",
  WindowsAmd = "x86_64-pc-windows-msvc",
}

export enum TargetPlatform {
  Nix = "nix",
  Windows = "win",
}

class Repo {
  org: string;
  name: string;
  slug: string;

  constructor(binaryName: BinaryName) {
    this.org = "apollographql";
    let repoName = null;

    switch (binaryName) {
      case BinaryName.RoverFed2:
      case BinaryName.Rover:
        repoName = "rover";
        break;
      case BinaryName.Router:
        repoName = "router";
        break;
      case BinaryName.Supergraph:
        repoName = "federation-rs";
        break;
      default:
        throw new MalformedRequestError(
          `invalid binary name '${binaryName}'. Possible names are ${possibleValues(
            BinaryName
          )}`
        );
    }

    this.name = repoName;
    this.slug = `${this.org}/${repoName}`;
  }

  releaseUrl(version: InputVersion): string {
    return `${this.toString()}/releases/${version.toString()}`;
  }

  // this is the same url that's used under the hood when running `git ls-remote`
  // it's a good way to get info about tags without having to clone the entire repository
  tagsUrl(): string {
    return `${this.toString()}/info/refs?service=git-upload-pack`;
  }

  // this is the endpoint that allows us to query for the message associated with a git tag
  // https://docs.github.com/en/rest/reference/git#get-a-tag
  tagUrl(ref: string): string {
    return `https://api.github.com/repos/${this.slug}/git/tags/${ref}`;
  }

  toString(): string {
    return `https://github.com/${this.slug}`;
  }
}

export class InputVersion {
  descriptor: string;

  constructor(inputVersion: string, binaryName: BinaryName) {
    let version = inputVersion.toLowerCase();
    let isValidVersionTag =
      version.startsWith("v") && version.split(".").length >= 2;
    if (version == "latest" || isValidVersionTag) {
      this.descriptor = version;
    } else if (
      binaryName === BinaryName.Supergraph &&
      (version === "latest-0" || version === "latest-2" || isValidVersionTag)
    ) {
      this.descriptor = version;
    } else {
      throw new MalformedRequestError(
        `invalid version '${inputVersion}'. versions must be 'latest' or in semver form 'v0.0.0'.`
      );
    }
  }

  toString(): string {
    return this.descriptor;
  }
}

function possibleValues<O extends object>(obj: O): string[] {
  let values: string[] = [];
  Object.values(obj)
    .filter((k) => typeof k === "string")
    .map((k) => values.push(k));
  return values;
}

export function enumFromStringValue<T>(
  enm: { [s: string]: T },
  value: string
): T {
  const values: string = possibleValues(enm).toString().split(",").join(", ");
  if ((Object.values(enm) as unknown as string[]).includes(value)) {
    return value as unknown as T;
  } else {
    throw new MalformedRequestError(
      `invalid input '${value}', must be one of: ${values}`
    );
  }
}
