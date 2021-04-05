import nock from 'nock';
import { getVersionFromEvent, LATEST_URL, getLatestVersion } from '../version';
import { APIGatewayProxyEvent } from 'aws-lambda';

beforeEach(() => {
  if (!nock.isActive()) nock.activate();
  nock.cleanAll();
});

it('fetches latest version from a redirected url', async () => {
  nock(LATEST_URL)
    .head('')
    .reply(301, undefined, { Location: 'https://lol.wow/v0.99.99' });
  const res = await getLatestVersion();
  expect(res).toEqual('v0.99.99');
});

it('gets latest version with /latest', async () => {
  nock(LATEST_URL)
    .head('')
    .reply(301, undefined, { Location: 'https://lol.wow/v0.99.99' });
  const res = await getVersionFromEvent({
    path: '/nix/latest',
  } as APIGatewayProxyEvent);
  expect(res).toEqual('v0.99.99');
});

it('returns proper version with /vx.x.x', async () => {
  const res = await getVersionFromEvent({
    path: '/nix/v0.99.99',
  } as APIGatewayProxyEvent);
  expect(res).toEqual('v0.99.99');
});

it('errors when invalid platform passed', async () => {
  // check that this fn throws with an error that includes the word 'platform'
  // this `gi` is global/case insensitive
  await expect(
    async () =>
      await getVersionFromEvent({
        path: '/MyOS/v0.7.0',
      } as APIGatewayProxyEvent),
  ).rejects.toThrow(/platform/gi);
});

it('errors when invalid version format passed', async () => {
  // check that this fn throws with an error that includes the word 'platform'
  // this `gi` is global/case insensitive
  await expect(
    async () =>
      await getVersionFromEvent({
        path: '/nix/0.7.0',
      } as APIGatewayProxyEvent),
  ).rejects.toThrow(/version/gi);
});
