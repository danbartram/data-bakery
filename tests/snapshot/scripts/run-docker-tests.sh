#!/bin/bash
NODE_VERSION="$1"
BASE_DIR=$(pwd)

docker run -v "${BASE_DIR}":/code --entrypoint /code/tests/snapshot/scripts/docker-entrypoint.sh "node:${NODE_VERSION}-buster-slim"
