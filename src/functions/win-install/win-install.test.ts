import { unwrappedHandler as handler } from './win-install';
import nock from 'nock';

jest.mock('../../lib/sentry', () => ({
  initSentry: jest.fn(),
  sentryWrapHandler: jest.fn(() => {}),
}));

jest.mock('../../lib/segment', () => ({
  track: jest.fn(),
}));

const buildInstallUrl = (downloadVersion) =>
  `https://raw.githubusercontent.com/apollographql/rover/${downloadVersion}/installers/binstall/scripts/windows/install.ps1`;

beforeEach(() => {
  if (!nock.isActive()) nock.activate();
  nock.cleanAll();
});

it('pulls from a version if passed', async () => {
  nock(buildInstallUrl('v0.0.1')).get('').reply(200, '# bash script');

  const res = await handler({
    path: '/nix/v0.0.1',
  });

  expect(res.statusCode).toEqual(200);
  expect(res.body).toContain('# bash script');
});

it('returns a 500 if no version is passed', async () => {
  const res = await handler({
    path: '/nix',
  });

  expect(res.statusCode).toEqual(500);
  expect(res.body).toContain('version');
});

it('returns a 500 if no platform is passed', async () => {
  const res = await handler({
    path: '/',
  });

  expect(res.statusCode).toEqual(500);
  expect(res.body).toContain('platform');
});

it('returns a 500 if GitHub is down', async () => {
  nock(buildInstallUrl('v0.0.1')).get('').reply(500, 'oh noe big err');

  const res = await handler({
    path: '/nix/v0.0.1',
  });

  expect(res.statusCode).toEqual(500);
  expect(res.body).toContain('Internal Server Error');
});

it('returns a 500 if asking for a bad version', async () => {
  nock(buildInstallUrl('0.0.1')).get('').reply(500, 'oh noe big err');

  // note the missing `v`
  const res = await handler({
    path: '/nix/0.0.1',
  });

  expect(res.statusCode).toEqual(500);
  expect(res.body).toContain('Invalid version');
});

it('returns a 400 if asking for a nonexistent version', async () => {
  nock(buildInstallUrl('v0.0.999')).get('').reply(404, 'lol not found');

  const res = await handler({
    path: '/nix/v0.0.999',
  });

  expect(res.statusCode).toEqual(400);
  expect(res.body).toContain("Couldn't find release");
});
