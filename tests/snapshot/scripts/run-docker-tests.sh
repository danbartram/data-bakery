#!/bin/bash
BASE_DIR=$(pwd)

docker run -v "${BASE_DIR}":/code --entrypoint /code/tests/snapshot/scripts/docker-entrypoint.sh node:18-buster-slim
