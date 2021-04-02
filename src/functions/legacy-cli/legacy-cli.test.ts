// import { mockGlobal } from '../mock';
// import fetchMock from 'fetch-mock';

jest.mock('../../lib/sentry', () => ({
  initSentry: jest.fn(),
  sentryWrapHandler: jest.fn(() => {}),
}));

jest.mock('../../lib/segment', () => ({
  track: jest.fn(),
}));

import { unwrappedHandler as handler } from './legacy-cli';
import nock from 'nock';

const GITHUB_RELEASE =
  'https://github.com/apollographql/apollo-tooling/releases';
// beforeEach(() => {
//   mockGlobal();
//   jest.resetModules();
// });

// afterEach(fetchMock.resetBehavior);

// it('runs', async () => {
//   nock(GITHUB_RELEASE)
//     .head('/download/apollo@0.0.1/apollo-v0.0.1-darwin-x64.tar.gz')
//     .reply(200, 'binary file');
//   const res = await handler({
//     path: '/legacy-cli/darwin/0.0.1',
//   });
//   console.log(res);
// });

beforeEach(() => {
  if (!nock.isActive()) nock.activate();
  nock.cleanAll();
});

it('pulls from a version if passed', async () => {
  nock(GITHUB_RELEASE)
    .head('/download/apollo@0.0.1/apollo-v0.0.1-darwin-x64.tar.gz')
    .reply(200, 'binary file');

  const res = await handler({
    path: '/legacy-cli/darwin/0.0.1',
  });

  expect(res.statusCode).toEqual(301);
  expect(res.body).toContain('Redirecting');
});

it('returns a 500 if no version is passed', async () => {
  nock(GITHUB_RELEASE)
    .head('/download/apollo@0.0.1/apollo-v0.0.1-darwin-x64.tar.gz')
    .reply(200, 'binary file');

  const res = await handler({
    path: '/legacy-cli/darwin',
  });

  expect(res.statusCode).toEqual(400);
  expect(res.body).toContain('Missing');
});

it('returns a 500 if no platform is passed', async () => {
  nock(GITHUB_RELEASE)
    .head('/download/apollo@0.0.1/apollo-v0.0.1-darwin-x64.tar.gz')
    .reply(200, 'binary file');

  const res = await handler({
    path: '/legacy-cli',
  });

  expect(res.statusCode).toEqual(400);
  expect(res.body).toContain('Missing');
});

// right now, we only provide darwin builds no matter what, so we
// don't even check WHAT the platform is, just that it exists :/
// it('returns a 500 if not asking for darwin builds', async () => {
//   nock(GITHUB_RELEASE)
//     .head('/download/apollo@0.0.1/apollo-v0.0.1-darwin-x64.tar.gz')
//     .reply(200, 'binary file');

//   const res = await handler({
//     path: '/legacy-cli/ya-boi/0.0.1',
//   });

//   expect(res.statusCode).toEqual(400);
// });

it('returns a 500 if GitHub is down', async () => {
  nock(GITHUB_RELEASE)
    .head('/download/apollo@0.0.1/apollo-v0.0.1-darwin-x64.tar.gz')
    .reply(500, 'lol no');

  const res = await handler({
    path: '/legacy-cli/darwin/0.0.1',
  });

  expect(res.statusCode).toEqual(500);
  expect(res.body).toContain('Internal Server Error');
});

it('returns a 500 if asking for a bad version', async () => {
  nock(GITHUB_RELEASE)
    .head(
      '/download/apollo@0.0.blblblblbblbl/apollo-v0.0.blblblblbblbl-darwin-x64.tar.gz',
    )
    .reply(500, 'lol no');

  const res = await handler({
    path: '/legacy-cli/darwin/0.0.blblblblbblbl',
  });

  expect(res.statusCode).toEqual(500);
  expect(res.body).toContain('Internal Server Error');
});
