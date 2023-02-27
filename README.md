# :croissant: Data Bakery

A tool to help build SQL test data for integration tests.

## Features

- Generate consistent or random test data
- Automatically keeps track of important row IDs (Named IDs)

---

## Getting started

```bash
# Install the package
npm i data-bakery

# Set up your config and recipe files

# Generate the SQL files
npx data-bakery generate
```

### Example

#### Example config: `data-bakery.config.js`

```js
module.exports = () => ({
  sqlDialect: 'mysql',
  recipesDir: 'recipes',
  outputDir: 'output',
})
```

#### Example recipe: `recipes/user-vip.js`

```js
const { NamedId } = require('data-bakery')

module.exports = async () => ({
  user: [
    {
      id: new NamedId('importantUser'),
      email: 'vip@test.com',
      is_important: 'Y',
    },
  ],
})
```

#### Example output

Run the `generate` command to build the SQL files and `meta.json`:

```bash
npx data-bakery generate
```

##### Files

```
.
├── data-bakery.config.js
├── output
│   ├── 1-user-vip.sql
│   └── meta.json
└── recipes
    └── user-vip.js
```

##### `output/meta.json`

```json
{
  "namedIds": {
    "user": {
      "importantUser": {
        "id": 1
      },
    }
  }
}
```

##### `output/1-user-vip.sql`

```sql
INSERT INTO `user` (id,email,is_important) VALUES (1, 'vip@test.com', 'Y');
```

You can now seed your test MySQL instance with the SQL files in the `output` directory.

Query for the rows using their named IDs in `output/meta.json`, like so:

```js
import * as testIds from '../output/meta.json'
```

```js
test('Check user is important', () => {
    const userId = testIds.user.importantUser.id

    // Load the user and perform checks
})
```

---

## Concepts

### Recipes

**A recipe is a collection of data for one or more tables.**

At their simplest, they're objects with tables name keys.

Inside each table name key is an array of objects, representing rows.

```js
{
    'my_table': [
        { name: 'Test', email: 'test@example.com' },
        { name: 'Ahoy', email: 'ahoy@sailor.com' }
    ]
}
```

This recipe would generate an SQL query like this:

```sql
INSERT INTO my_table (name, email)
VALUES
    ('Test', 'test@example.com'),
    ('Ahoy','ahoy@sailor.com')
```

---

## Features

### Named IDs

One of the most powerful features is the ability to create named IDs, which work like bookmarks.

You can generate a row and give it a unique name to reference it later, for example:

```js
{
    'customer': [
        { id: new NamedId('customerWithNoOrders'), name: 'John'},
    ]
}
```

After generating all of the test data, a file containing the named IDs will also be exported (`ids.json`).

You can then import this file in your tests, like this:

```js
import * as testIds from './test-data/ids.json'
```

```js
test('Check customer with no orders returns empty array', () => {
    const customerId = testIds.customer.customerWithNoOrders.id

    // Try and fetch the customer's orders
})
```

You don't need to keep track of specific IDsm or worry about the ordering of `INSERT` statements anymore.

---

## Build steps

To build as a local NPM package:

```bash
# Install dependencies
npm ci
# Compile TS and generate .d.ts types
rm -rf dist
npx tsc
# Copy the package.json into dist to avoid needing `dist` in imports
cp package.json ./dist/
cp .npmignore ./dist/
cp README.md ./dist/
cp LICENSE.md ./dist/

# Build a local package in the root directory
(cd dist && npm pack --pack-destination ../)
```

You can then install the package in another local project like this:

```bash
npm i /path/to/data-bakery-0.0.1.tgz
```


---

TODO: It looks like we need a `USE databaseName;` at the top of every SQL file for this to work?

A simple `cat *.sql > final.sql` or something would work but requires faff and juggling files around

Might need to add a `databaseName` optional export to each recipe, with an optional default set in the `bakery.config.js` too to fallback to?

From root dir:

```bash
docker run --rm -it -e MYSQL_ROOT_PASSWORD=password -v $(realpath tests/snapshot/tests/databakeryignore/actual-output):/docker-entrypoint-initdb.d mysql:5.7-debian
```
