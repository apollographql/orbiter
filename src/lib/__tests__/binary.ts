import nock from "nock";
import { Binary } from "../binary";
import { downloadEvent } from "../download";

const INSTALLER_CONTENTS = "installer contents";

beforeEach(() => {
  if (!nock.isActive()) nock.activate();
  nock.cleanAll();
});

const nockGitHubLatest = (binary: Binary, version: string) => {
  nock(binary.versionUrl())
    .head("")
    .reply(301, undefined, {
      Location: `https://github.com/${binary.repo.slug}/releases/${version}`,
    });
};

const nockInstaller = async (
  binary: Binary,
  version: string,
  platform: string
) => {
  nock(await binary.getInstallScriptUrl(platform, version))
    .get("")
    .reply(200, INSTALLER_CONTENTS);
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
  let version = res.headers["X-Version"];
  expect(version).toEqual("v0.99.99");
  expect(res.body).toEqual(INSTALLER_CONTENTS);
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
  let version = res.headers["X-Version"];
  expect(version).toEqual("v0.99.99");
  expect(res.body).toEqual(INSTALLER_CONTENTS);
});

it("errors when invalid platform passed", async () => {
  let realVersion = "v0.99.99";
  let rover = new Binary("rover", realVersion);
  let platform = "myInvalidOS";
  nockGitHubLatest(rover, realVersion);
  nockInstaller(rover, realVersion, platform);

  let res = await downloadEvent(
    rover.name.toString(),
    platform,
    realVersion,
    "installer"
  );
  expect(res.body).toContain("invalid");
  expect(res.statusCode).toEqual(400);
});

it("errors when invalid version format passed", async () => {
  let realVersion = "notarealversion";
  expect(async () => {
    return new Binary("rover", realVersion);
  }).rejects.toThrow(/version/gi);
});
