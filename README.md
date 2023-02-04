# :croissant: Data Bakery

A tool to help build SQL test data for integration tests.

---

## Concepts

### Recipes

A recipe is a set of instructions to generate some data.

At their simplest, they're objects with tables names as keys.

Inside each table name key is array of objects, representing rows.

```js
{
    'someTable': [
        { name: 'Test', email: 'test@example.com' },
        { name: 'Ahoy', email: 'ahoy@sailor.com' }
    ]
}
```

This recipe would generate an SQL query like this:

```sql
INSERT INTO someTable (name, email)
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

    // Fetch the customer's users
})
```

You don't need to keep track of specific IDsm or worry about the ordering of `INSERT` statements anymore.
