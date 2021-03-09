<img src="https://raw.githubusercontent.com/apollographql/space-kit/main/src/illustrations/svgs/satellite2.svg" width="100%" height="144">

# Orbiter

This folder contains the code that powers the [Netlify Functions](https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&cad=rja&uact=8&ved=2ahUKEwjRmPfBh5rvAhUxxVkKHaeNBlYQFjAAegQIERAD&url=https%3A%2F%2Fwww.netlify.com%2Fproducts%2Ffunctions%2F&usg=AOvVaw0WgqqN2xZx2ARRVLWP61oD) which are responsible for installing and telemetry reporting for [Rover](https://github.com/apollographql/rover).

The function run from this project provides an unchanging url for users to install any version of Rover from, download the legacy apollo cli, and report telemetry from Rover.

There are four functions included to be aware of:

* __[Legacy CLI installer](./src/functions/nix-install/)__: This folder contains the function responsible for serving and tracking downloads of the legacy [apollo cli](https://github.com/apollographql/apollo-tooling) tarball.
* __[Unix installer](./src/functions/nix-install/)__: This folder contains the function responsible for serving and (if applicable) modifying the unix install script.
* __[Telemetry](./src/functions/telemetry/)__: This folder contains the function responsible for consuming telemetry reports from Rover and reporting them.
* __[Windows installer](./src/functions/win-install/)__: This folder contains the function responsible for serving and (if applicable) modifying the windows install script.

### Windows & Unix Installers

Rover can be installed via two separate install scripts, one for windows users (`.ps1`) and another for unix users (`.sh`).

Rather than pointing users to a raw file path to find these scripts, which are versioned and released alongside the rover source, these functions provide endpoints to download the latest install _script_, and allow for overriding instructions in that script to install different versions of the Rover runtime.

These functions don't allow for use of older install scripts to allow the Rover team to continually improve the install scripts, even for users of previous versions of Rover. Of course, old scripts are always available on the [releases](https://github.com/apollographql/rover/releases) page if ever needed.

When running, these two functions will expose two endpoints under `/nix` and `/win`, which users can `curl` or `iwr` respectively to fetch a script. 

**Versions**

To choose a different version, the user passes a `version` query parameter (ex. `https://install.apollo.dev/rover/win?version=v0.0.2`). These functions will first fetch the install script, then prepend an environment variable override at the top of the script (ex. `VERSION=v0.0.1` for the `nix` installer). The scripts know to look for these variables, and when present, will override the default download version.

### Telemetry

The telemetry function is a single endpoint for reporting metrics from [Rover](https://github.com/apollographql/rover). Currently, this function reports all metrics to [Segment.io](https://segment.io) using the [segment util](./src/lib/segment.ts). 

When running, this endpoint accepts POST requests, and requires you to pass `User-Agent: rover*` and `Content-Type: application/json` headers. 

The payload shape looks like the following:

```json
{
    "machine_id": "UNIQUE",
    "cli_version": "v0.0.2",
    "session_id": "UNIQUE",
    "cwd_hash": "ghgfj4h",
    "platform": { "os": "windows", "continuous_integration": "ci-provider or null" },
    "command": { "name": "subgraph check", "args": {} }
}
```

For full reporting of telemetry to work, you must have a `SEGMENT_API_KEY` environment variable set.

### Legacy CLI

The legacy cli function is a thin wrapper around the release tarball generated when releasing the [apollo cli](https://github.com/apollographql/apollo-tooling). The main purposes of this function are to:

1. Provide a static url that we control, to serve the apollo cli's tarball. This way we can add custom caching (TBD).
2. Track downloads of the tarball, giving us insight into our apollo-ios userbase.

When running, this function accepts a redirect from any `/legacy-cli/*` route, but will fail unless there is a `platform` and `version` defined in the url path. For example, `http://localhost:8888/legacy-cli/darwin/2.32.1`.

The `platform` is largely for tracking purposes, as we currently only support the `darwin` download. No matter the `platform` provided, we will download the same `darwin` tarball.

## Local Development

Local development of the functions is done using the [`netlify-cli`](https://www.npmjs.com/package/netlify-cli). To run the project locally you will first need to install the projects depedencies:

```sh
npm i
```

After you have these installed, you can run the project using the following command:

```sh
npm start
```

This will run `netlify dev` which will serve functions under the following routes:

- [`http://localhost:8888/nix`](http://localhost:8888/nix) <span style="color:#28a745">[GET]</span>
- [`http://localhost:8888/win`](http://localhost:8888/win) <span style="color:#28a745">[GET]</span>
- [`http://localhost:8888/telemetry`](http://localhost:8888/telemetry) <span style="color:#28a745">[POST]</span>
- [`http://localhost:8888/legacy-cli`](http://localhost:8888/legacy-cli) <span style="color:#28a745">[GET]</span>

For full reporting of telemetry to work, you must have a `SEGMENT_API_KEY` set.

## Testing

Not implemented yet

## Releases

Releasing a new build of the functions is managed through GitHub and Netlify. When a PR is merged to main, Netlify will kick off a build and deploy of the functions.

## Runbook

The functions are instrumented with [Sentry](https://sentry.io) alerting. Those responsible for this code are: 

* [@jakedawkins](https://github.com/jakedawkins)
* [@EverlastingBugstopper](https://github.com/EverlastingBugstopper)
* [@lrlna](https://github.com/lrlna)

<!-- TODO -->
<!-- is monitored by [Datadog](https://www.datadoghq.com/), and is wired up to [PagerDuty](https://pagerduty.com). The current on call team is comprised of: -->

<!-- 
These functions are connected to our [status page](https://status.apollographql.com) with both uptime and latency reporting in place for our users. -->

### Potential Problems
> As problems arise, please add instructions here of what to do if there is a problem with the CDN

__404 when installing a package__:

If there is an elevated number of `404`s happening check the `Releases` tab of the `rover` to ensure that the release in question (typically latest) has all of its tarballs for each platform. There should be three tarballs present. If there aren't, you will need to cut a new release or manually build the tarballs.

<img src="https://raw.githubusercontent.com/apollographql/space-kit/main/src/illustrations/svgs/moon.svg" width="100%" height="144">
