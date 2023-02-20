# Snapshot tests

This test suite confirms that the expected outputs are generated for example recipes.

They provide a way to confirm that no unexpected output changes occur with new features/bug fixes.

---

## Running the tests

From the root directory of the project, run this command:

```bash
# This runs the tests using the Node v18 Docker image
./tests/snapshot/scripts/run-docker-tests.sh 18
```

---

## What these tests do

Essentially, these tests build a local NPM package and then install it in some example projects. The `generate` command is run and a diff is made of the actual and expected output directories.

If there any differences (e.g. an extra file, or a changed line), the snapshot test is a failure.

1. Build local package
2. Install local package
3. Iterate each test directory
    1. Generate the output using a config file
    2. Diff the `actual-output` and `expected-output` directories
