#!/bin/bash
NODE_VERSION="$1"
BASE_DIR=$(pwd)

declare -a VERSION_IMAGE_MAP
VERSION_IMAGE_MAP["18"]="node:18-buster-slim"
VERSION_IMAGE_MAP["20"]="node:20-buster-slim"
VERSION_IMAGE_MAP["22"]="node:22-bookworm-slim"
VERSION_IMAGE_MAP["24"]="node:24-trixie-slim"

DOCKER_IMAGE_NAME="${VERSION_IMAGE_MAP[${NODE_VERSION}]}"

docker run -v "${BASE_DIR}":/code --entrypoint /code/tests/snapshot/scripts/docker-entrypoint.sh "${DOCKER_IMAGE_NAME}"
