import nock from "nock";
import { Binary, InputVersion } from "../binary";
import { MalformedRequestError } from "../error";
import { downloadEvent } from "../download";

const INSTALLER_CONTENTS = "installer contents";

beforeEach(() => {
  if (!nock.isActive()) nock.activate();
  nock.cleanAll();
});

const nockGitHubLatest = (binary: Binary, version: string) => {
  let latestReleaseEndpoint = binary.repo.releaseUrl(
    new InputVersion("latest", binary.name)
  );
  let thisReleaseEndpoint = binary.repo.releaseUrl(
    new InputVersion(version, binary.name)
  );
  nock(latestReleaseEndpoint).head("").reply(302, undefined, {
    Location: thisReleaseEndpoint,
  });
};

const nockInstaller = (binary: Binary, version: string, platform: string) => {
  let githubInstallerEndpoint = binary.getInstallScriptUrl(platform, version);
  nock(githubInstallerEndpoint).head("").reply(200, INSTALLER_CONTENTS);
};

it("fetches latest version from a redirected url", async () => {
  let rover = new Binary("rover", "latest");
  let realVersion = "v0.99.99";
  let platform = "nix";
  nockGitHubLatest(rover, realVersion);
  nockInstaller(rover, realVersion, platform);
  const res = await downloadEvent(
    rover.name.toString(),
    platform,
    "latest",
    "installer"
  );
  let version = res.headers?.["X-Version"];
  let cacheControl = res.headers?.["Cache-Control"];
  let location = res.headers?.["Location"];
  expect(version).toEqual("v0.99.99");
  expect(cacheControl).toEqual(
    "max-age=60, stale-if-error=18000, stale-while-revalidate=30"
  );
  expect(location).toContain("v0.99.99");
});

it("returns proper version with /vx.x.x", async () => {
  let realVersion = "v0.99.99";
  let rover = new Binary("rover", realVersion);
  let platform = "nix";
  nockGitHubLatest(rover, realVersion);
  nockInstaller(rover, realVersion, platform);
  const res = await downloadEvent(
    rover.name.toString(),
    platform,
    realVersion,
    "installer"
  );
  let location = res.headers?.["Location"];
  let cacheControl = res.headers?.["Cache-Control"];
  let version = res.headers?.["X-Version"];
  expect(location).toContain("githubusercontent");
  expect(location).toContain("v0.99.99");
  expect(cacheControl).toContain(
    "max-age=60, stale-if-error=18000, stale-while-revalidate=30"
  );
  expect(version).toEqual("v0.99.99");
});

it("errors when invalid platform passed", async () => {
  let realVersion = "v0.99.99";
  let platform = "myInvalidOS";

  let res = await downloadEvent("rover", platform, realVersion, "installer");
  let cacheControl = res.headers?.["Cache-Control"];
  expect(res.body).toContain("invalid");
  expect(cacheControl).toBeUndefined();
  expect(res.statusCode).toEqual(400);
});

it("errors when invalid version passed", async () => {
  let version = "badbadversion";
  let platform = "nix";

  let res = await downloadEvent("rover", platform, version, "installer");
  let cacheControl = res.headers?.["Cache-Control"];
  expect(res.body).toContain("invalid");
  expect(cacheControl).toBeUndefined();
  expect(res.statusCode).toEqual(400);
});

it("fetches arm only for router 1.38.0 and 1.39.0", async () => {
  const appleAmdTriplet = "x86_64-apple-darwin";
  const appleArmTriplet = "aarch64-apple-darwin";

  const version = "v1.39.1";
  const routerBinary = new Binary("router", version);

  const validRoutersForOSXx64 = ["v1.37.0", "v1.39.1"];
  const validRoutersForOSXarmOnly = ["v1.38.0", "v1.39.0"];

  for (const r of validRoutersForOSXx64) {
    const actualAmd = routerBinary.getReleaseTarballUrl(appleAmdTriplet, r);
    const actualArm = routerBinary.getReleaseTarballUrl(appleArmTriplet, r);

    expect(actualAmd).toBe(
      `https://github.com/apollographql/router/releases/download/${r}/router-${r}-x86_64-apple-darwin.tar.gz`
    );
    expect(actualArm).toBe(
      `https://github.com/apollographql/router/releases/download/${r}/router-${r}-aarch64-apple-darwin.tar.gz`
    );
  }

  for (const r of validRoutersForOSXarmOnly) {
    const actualArm = routerBinary.getReleaseTarballUrl(appleArmTriplet, r);

    expect(actualArm).toBe(
      `https://github.com/apollographql/router/releases/download/${r}/router-${r}-aarch64-apple-darwin.tar.gz`
    );
    expect(() => {
      routerBinary.getReleaseTarballUrl(appleAmdTriplet, r);
    }).toThrow(
      "malformed request: invalid target 'x86_64-apple-darwin' for 'router' binary, you should download the 'x86_64-apple-darwin' target for router v1.39.1 or later."
    );
  }
});
