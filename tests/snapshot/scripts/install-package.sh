#!/bin/bash

cd /code

echo "Installing dependencies"
npm ci

echo "Compiling TypeScript"
npx tsc

echo "Preparing to build package"
cp package.json ./dist/
cp .npmignore ./dist/

echo "Building package"
(cd dist && npm pack --pack-destination ../)

BUILT_PACK_PATH=$(realpath data-bakery-*.tgz)
echo "FOUND PACKAGE: ${BUILT_PACK_PATH}"

cd tests/snapshot && npm i "${BUILT_PACK_PATH}"
