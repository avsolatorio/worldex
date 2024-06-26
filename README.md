# WorldEx

WorldEx is designed to make subnational data discoverable using H3 indexing. Geocoders are implemented that are responsible for handling geospatial data types and converting them into H3 indices.

The project consists of a web application that allows for users to explore the available data at a given H3 cell. Users can search for names of places, which are processed using OpenStreetMap's Nominatim service.

APIs are implemented to allow users to interact with the indexed data.

# Local Development

First off, install [`just`](https://github.com/casey/just#installation). It is similar to `make` in that it's just a convenient wrapper around some cli commands to setup the local environment.

## `cd secrets && poetry install`
to setup the simple password generator.

## `just prep-aws-env`
to setup aws environment variables (including credentials) for dataset seeding later. This will create a `./secrets/aws.env` file. However, without secret manager you'll have to fill the aws key id and secret manually.

Ask the repo maintainers if you're part of the same team.

<span style="color:red">If you're on a Mac,</span> you may have to run the following first to enable `envsubst`

```
brew install gettext
brew link --force gettext
```

## `just generate-es-password`
to generate a password to the `elastic` user of the `es` elasticsearch service

## `just refresh-db-password`
to generate a postgres password and the environment files to be used by the `api`, `db`, and `pgweb` services as per the docker compose spec.

If you've previously generated a postgres password with this command and just want to regenerate the environment files, run `create-envs`

## PostGIS on ARM-based devices
If you are on an ARM-based device (e.g. M1/M2 MacBooks), comment out the following line under the `db` service on `docker-compose.yaml`, comment out the following line
```
dockerfile: arm64.Dockerfile
```
The PostGIS build will be more performant on your local machine this way.

## `docker compose up`

to run the development environment on local. Simply interrupt to stop the cluster or `docker compose down` if you ran it in detached mode.

Note that this doesn't start a dev server for the vite app. You'll have to run `yarn` to install the dependencies and

### `yarn start`

to run the dev server. We exclude the vite app from the compose cluster since we cannot bind mount `node_modules` if the dependencies were installed on a different architecture (e.g. mac host, linux container).

You may need `--force` if you encounter issues with the lockfile.

Outside of development context that requires hot reloads, you can run the following.

### `docker compose --profile preview up -d`

will run `vite preview` on a built version of the app while

### `docker compose --profile web up -d`

will run an nginx reverse proxy serving the built version of the vite app

## API service
The api (and database) service are not quite ready yet at this point. See the API [readme](api/README.md) to finish setting them up.

## Pre-commit

is used to minimize nitpicking stemming from formatting and other minor issues during code review.

### `pip install pre-commit`

to install pre-commit. Alternatively, see https://pre-commit.com/ for installation instructions.

### `pre-commit install`

to then setup the pre-commit hooks.

## Worldex package

### Installing poetry

```
pip install poetry
poetry install
```

### Running tests

```
poetry run python -m pytest
```
