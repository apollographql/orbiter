<img src="https://raw.githubusercontent.com/apollographql/space-kit/main/src/illustrations/svgs/satellite2.svg" width="100%" height="144">

# Orbiter

This folder contains the code that powers the [Netlify Functions](https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&cad=rja&uact=8&ved=2ahUKEwjRmPfBh5rvAhUxxVkKHaeNBlYQFjAAegQIERAD&url=https%3A%2F%2Fwww.netlify.com%2Fproducts%2Ffunctions%2F&usg=AOvVaw0WgqqN2xZx2ARRVLWP61oD) which are responsible for installing and telemetry reporting for [Rover](https://github.com/apollographql/rover).

The function run from this project provides an unchanging url for users to install any version of Rover from.

There are three functions included to be aware of:

* __[Windows installer](./src/functions/win-install/)__: This folder contains the TypeScript source code responsible for serving and (if applicable) modifying the windows install script.
* __[Unix installer](./src/functions/nix-install/)__: This folder contains the TypeScript source code responsible for serving and (if applicable) modifying the unix install script.
* __[Telemetry](./src/functions/telemetry/)__: This folder contains the TypeScript source code responsible for consuming telemetry reports from Rover and reporting them.

### Windows & Unix Installers

Rover can be installed via two separate install scripts, one for windows users (`.ps1`) and another for unix users (`.sh`).

Rather than pointing users to a raw file path to find these scripts, which are versioned and released alongside the rover source, these functions provide endpoints to download the latest install _script_, and allow for overriding instructions in that script to install different versions of the Rover runtime.

These functions don't allow for use of older install scripts to allow the Rover team to continually improve the install scripts, even for users of previous versions of Rover. Of course, old scripts are always available on the [releases](https://github.com/apollographql/rover/releases) page if ever needed.

When running, these two functions will expose two endpoints under `/nix` and `/win`, which users can `curl` or `iwr` respectively to fetch a script. 

**Versions**

To choose a different version, the user passes a `version` query parameter (ex. `https://install.apollo.dev/rover/win?version=v0.0.2`). These functions will first fetch the install script, then prepend an environment variable override at the top of the script (ex. `VERSION=v0.0.1` for the `nix` installer). The scripts know to look for these variables, and when present, will override the default download version.

### Telemetry

<!--  -->

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

- [`http://localhost:8888/nix`](http://localhost:8888/nix)
- [`http://localhost:8888/win`](http://localhost:8888/win)
- [`http://localhost:8888/telemetry`](http://localhost:8888/telemetry)

For full reporting of telemetry to work, you must have a `SEGMENT_API_KEY` set.

## Testing

Not implemented yet

## Releases

Releasing a new build of the functions is managed through GitHub and Netlify. When a PR is merged to main, Netlify will kick off a build and deploy of the functions.

## Runbook

The worker is instrumented with [Sentry](https://sentry.io) alerting. Those responsible for this code are: 

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