#!/bin/bash

cd /code/tests/snapshot

scripts/install-package.sh

ANY_TESTS_FAILED=false

for testDir in tests/*/ ; do
    echo "Starting test for: ${testDir}"
    cd "/code/tests/snapshot/${testDir}"

    npx data-bakery generate --config data-bakery.config.js --debug
    GENERATE_EXIT_CODE=$?

    if [ $GENERATE_EXIT_CODE -ne 0 ]; then
        echo "Failed to generate data in ${testDir}"
        ANY_TESTS_FAILED=true
        # Skip the diff as the generation failed
        continue
    fi

    diff -u expected-output/ actual-output/
    DIFF_EXIT_CODE=$?

    if [ $DIFF_EXIT_CODE -ne 0 ]; then
        echo "Failed snapshot test for ${testDir}"
        ANY_TESTS_FAILED=true
    fi
done

if [ "${ANY_TESTS_FAILED}" = true ]; then
    echo "At least 1 test failed"
    exit 1
fi
