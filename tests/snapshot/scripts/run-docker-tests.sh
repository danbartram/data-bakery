#!/bin/bash
BASE_DIR=$(cd ../../ && pwd)

docker run -v "${BASE_DIR}":/code -u node --entrypoint /code/tests/snapshot/scripts/docker-entrypoint.sh -it node:18-buster-slim
