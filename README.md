# :croissant: Data Bakery

A tool to help build SQL test data for integration tests.

## Features

- Automatically keeps track of important row IDs (Named IDs)
- Exports named IDs for easy use in tests
- Removes the need for manually keeping track of auto increment IDs

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

## Recipes

**A recipe is a collection of data for one or more tables.**

For example, a `userWithOrders` recipe could contain data for the `users`, `orders`, and `products` tables.

Recipe files must be within in the `recipesDir` directory.

Recipes are maps, with table names as keys, and an array of rows as their value.

```ts
// This recipe exports two columns for the `user` table, and another two for the `orders` table
module.exports = {
  user: [
    { id: new AutoIncId(), email: 'user1@test.com' },
    { id: new NamedId('specialUser'), email: 'specialuser@test.com' },
  ],
  orders: [
    { id: new AutoIncId(), userId: getNamedId('user', 'specialUser'), amount: 5000 },
    { id: new AutoIncId(), userId: getNamedId('user', 'specialUser'), amount: 15000 },
  ],
}
```

You can also export a `function` or `async function` if you want to perform more complex logic:

```ts
module.exports = async () => ({
  user: [
    { id: new AutoIncId(), email: 'user1@test.com' },
    { id: new NamedId('specialUser'), email: 'specialuser@test.com' },
  ],
})
```

Function recipes are passed in a `recipeContext` object. You can add custom data to it with the `extraRecipeContext` config option.

This recipe, for example, would generate an SQL query like this:

```sql
INSERT INTO user (id, email)
VALUES
    (1, 'user1@test.com'),
    (2, 'specialuser@test.com');
```

### Recipe context

By default, all function recipes are provided a recipe context like this:

```ts
{
  sqlDialect: 'mysql',
  manager: RecipeManager,
}
```

You can add your own custom data by adding a `extraRecipeContext` option to your config file.

```ts
module.exports = () => ({
  recipesDir: 'recipes',
  sqlDialect: 'mysql',
  outputDir: 'actual-output',
  emptyOutputDir: true,
  outputPrefixStart: 10,
  // These values will be passed to all recipe functions as the first argument
  extraRecipeContext: () => {
    return {
      hello: 'world',
    }
  },
})

```

---

## Generated IDs

There are two types of IDs to use in your recipes:

- `AutoIncId`: A simple `AUTO INCREMENT` value, tracked for each table
- `NamedId`: A special ID that should be exported in the `meta.json` file

Both of these IDs work together, even in the same recipe. The key difference is a named ID gets exported so it can be easily used in tests.

The values are tracked across multiple recipes, so you can create any number of rows in any amount of recipe files.

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

To reference a named ID in another recipe, you can use: `getNamedId(tableName, idName)`:

```ts
module.exports = {
  user: [
    {
      id: new NamedId('specialUser'),
      email: 'specialuser@test.com'
    },
  ],
  orders: [
    {
      id: new AutoIncId(),
      // This will get the same ID value generated in the `user` table data
      userId: getNamedId('user', 'specialUser'),
      amount: 5000
    },
  ],
}
```

If you want to access the named ID outside of a simple column value use case, you should export your recipe as a function and use `manager.getNamedId()` instead.

```ts
module.exports = async ({ manager }) => ({
  user: [
    { id: new NamedId('firstUser'), email: 'hello@world.com' },
  ],
  user_extra: [
    {
      json: JSON.stringify({
        // This will evaluate to `1-static-prefix` for example
        generatedId: `${manager.getNamedId('user', 'firstUser')}-static-prefix`,
      }),
    },
  ],
})
```

After running the `generate` command, a `meta.json` file will be created.

You can import this JSON file in your tests to reference the generated ID by its name.

```js
import * as testIds from 'output/meta.json'

test('Check customer with no orders returns empty array', () => {
    const customerId = testIds.customer.customerWithNoOrders.id

    // Try and fetch the customer's orders
})
```

You don't need to keep track of specific IDs, or worry about the ordering of `INSERT` statements.

### Auto increment IDs

An `AutoIncId` is similar to a `NamedId`, except that they aren't exported into `meta.json`.

They merely serve as a way to avoid tracking IDs manually.

```ts
{
  'user': [
    // Alice will be ID: 1
    { id: new AutoIncId(), name: 'Alice'},
    // Bob will be ID: 2
    { id: new NamedId('specialUser'), name: 'Bob'},
  ]
}
```

---

## Config

### `data-bakery.config.js` options

- `recipesDir`: `string`: The directory that contains your recipe files
  - e.g. `recipes`
- `outputDir`: `string`: The directory to save the generated SQL and `meta.json` files
  - e.g. `sql` or `output`
- `emptyOutputDir`: `boolean`: Whether the `outputDir` should be emptied before generating new files
  - This prevents stale/unexpected output by starting from a clean slate each run
- `outputPrefixStart`: `string`: The start prefix to use for generated SQL file names
  - e.g. `10` to output `10-myrecipe.sql` as the first file
- `sqlDialect`: `string`: Which SQL dialect to generate
  - Currently only `mysql` is supported
- `extraRecipeContext`: `() => object`: A custom function to allow adding your own data into the recipe context passed to all exported recipe functions
- `tableDefaults`: `Record<tableName, () => object>`: A function to generate default data for all rows in specific tables
- `tableStartIds`: `Record<tableName, number>`: A map, keyed by table name, of values to start incrementing IDs from
  - e.g. `{ 'user': 100 }` would use `100` for the first `AutoIncId` value

#### Table defaults

In your `data-bakery.config.js`, you can define defaults like this:

```ts
  tableDefaults: {
    // All `user` rows will have these values added automatically, and can be overridden in individual recipes
    user: () => ({
      id: new AutoIncId()
      extra: 'column-value-here',
    }),
  },
```

### CLI options

- `--debug`: Enable debug logging
- `-s`, `--sql-dialect <dialect>`: Override the `dialect` in the config file
- `-d`, `--output-dir <directory>`: Override the `outputDir` in the config file
- `-r`, `--recipes-dir <directory>`: Override the `recipesDir` in the config file

### `.databakeryignore`

You can optionally include a `.databakeryignore` file inside your `outputDir` directory to retain some files, even if the `emptyOutputDir` option is enabled.

This works similarly to `.gitignore`, each line is a glob pattern of files to keep.

See `tests/snapshot/tests/databakeryignore/expected-output/.databakeryignore` for an example.

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
