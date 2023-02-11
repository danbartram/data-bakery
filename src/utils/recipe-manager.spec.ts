import { AutoIncId, RecipeManager, NamedId, NamedIdForTable, type RecipeBundle } from './recipe-manager'

describe('prepareRecipe', () => {
  it('handles multiple recipe bundles', () => {
    const recipeBundles: RecipeBundle[] = [
      {
        user: [
          { id: 1, email: 'hi@there.com', firstName: 'Eric' },
        ],
        orders: [
          { id: 100, userId: 1, amount: 5000 },
          { id: 101, userId: 1, amount: 15000 },
        ],
      },
      {
        user: [
          { id: 2, email: 'bob@example.com', firstName: 'Bob' },
        ],
      },
    ]

    const firstResult = {
      user: [
        { id: 1, email: 'hi@there.com', firstName: 'Eric' },
      ],
      orders: [
        { id: 100, userId: 1, amount: 5000 },
        { id: 101, userId: 1, amount: 15000 },
      ],
    }

    const secondResult = {
      user: [
        { id: 2, email: 'bob@example.com', firstName: 'Bob' },
      ],
    }

    const manager = new RecipeManager()
    const preparedRecipes = recipeBundles.map(bundle => manager.prepareRecipe(bundle))

    expect(preparedRecipes[0]).toEqual(firstResult)
    expect(preparedRecipes[1]).toEqual(secondResult)
    expect(preparedRecipes.length).toEqual(2)
  })

  it('populates default column values', () => {
    const recipeBundles: RecipeBundle[] = [
      {
        user: [
          { email: 'eric@email.com' },
        ],
      },
      {
        user: [
          { email: 'bob@test.com', otherField: 'Hello' },
        ],
      },
    ]

    const firstResult = {
      user: [
        { id: 1, email: 'eric@email.com', otherField: 'Ahoy' },
      ],
    }

    const secondResult = {
      user: [
        { id: 2, email: 'bob@test.com', otherField: 'Hello' },
      ],
    }

    const tableDefaults = {
      user: () => ({
        id: new AutoIncId(),
        otherField: 'Ahoy',
      }),
    }

    const manager = new RecipeManager({ tableDefaults })
    const preparedRecipes = recipeBundles.map(bundle => manager.prepareRecipe(bundle))

    expect(preparedRecipes[0]).toEqual(firstResult)
    expect(preparedRecipes[1]).toEqual(secondResult)
    expect(preparedRecipes.length).toEqual(2)
  })

  it('generates AutoInc values correctly', () => {
    const userId = new AutoIncId() // 1
    const productId1 = new AutoIncId() // 1
    const productId2 = new AutoIncId() // 2

    const recipeBundle = {
      user: [
        { id: userId, email: 'hi@there.com', firstName: 'Eric' },
      ],
      products: [
        { productId: productId1, name: 'Bread' },
        { productId: productId2, name: 'Cheese' },
      ],
      orders: [
        { userId, productId: productId1, amount: 5 },
        { userId, productId: productId2, amount: 3 },
      ],
    }

    const expectedResult = {
      user: [
        { id: 1, email: 'hi@there.com', firstName: 'Eric' },
      ],
      products: [
        { productId: 1, name: 'Bread' },
        { productId: 2, name: 'Cheese' },
      ],
      orders: [
        { userId: 1, productId: 1, amount: 5 },
        { userId: 1, productId: 2, amount: 3 },
      ],
    }

    const manager = new RecipeManager()
    const preparedRecipe = manager.prepareRecipe(recipeBundle)
    expect(preparedRecipe).toEqual(expectedResult)
  })

  it('generates named IDs correctly', () => {
    const specialUserId = new NamedId('specialUser')
    const anotherSpecialUserId = new NamedId('someOtherName')

    const recipeBundle = {
      user: [
        { id: new AutoIncId(), email: 'hi@there.com', firstName: 'Eric' },
        { id: specialUserId, email: 'alice@test.com', firstName: 'Alice' },
        { id: new AutoIncId(), email: 'bob@example.com', firstName: 'Bob' },
        { id: anotherSpecialUserId, email: 'another@one.com', firstName: 'Another' },
      ],
      orders: [
        { userId: specialUserId, productId: new NamedId('myProduct'), amount: 5 },
        { userId: specialUserId, productId: 2, amount: 3 },
      ],
    }

    const expectedResult = {
      user: [
        { id: 1, email: 'hi@there.com', firstName: 'Eric' },
        { id: 100000, email: 'alice@test.com', firstName: 'Alice' },
        { id: 2, email: 'bob@example.com', firstName: 'Bob' },
        { id: 100001, email: 'another@one.com', firstName: 'Another' },
      ],
      orders: [
        // The name IDs should be incremented on a per-table basis,
        // both the first named user ID and first named product ID will match here
        { userId: 100000, productId: 100000, amount: 5 },
        { userId: 100000, productId: 2, amount: 3 },
      ],
    }

    const manager = new RecipeManager()
    const preparedBundle = manager.prepareRecipe(recipeBundle)
    expect(preparedBundle).toEqual(expectedResult)
  })

  it('generates the same named ID value for duplicate NamedId instances', () => {
    const specialUserId = new NamedId('specialUser')

    const recipeBundle = {
      user: [
        { id: new AutoIncId(), email: 'hi@there.com', firstName: 'Eric' },
        { id: specialUserId, email: 'alice@test.com', firstName: 'Alice' },
        { id: new AutoIncId(), email: 'bob@example.com', firstName: 'Bob' },
      ],
      orders: [
        { userId: new NamedId('specialUser'), productId: 1, amount: 5 },
        { userId: new NamedId('specialUser'), productId: 2, amount: 3 },
      ],
    }

    const expectedResult = {
      user: [
        { id: 1, email: 'hi@there.com', firstName: 'Eric' },
        { id: 100000, email: 'alice@test.com', firstName: 'Alice' },
        { id: 2, email: 'bob@example.com', firstName: 'Bob' },
      ],
      orders: [
        { userId: 100000, productId: 1, amount: 5 },
        { userId: 100000, productId: 2, amount: 3 },
      ],
    }

    const manager = new RecipeManager()
    const preparedRecipe = manager.prepareRecipe(recipeBundle)
    expect(preparedRecipe).toEqual(expectedResult)
  })

  it('exports generated named IDs correctly', () => {
    const recipeBundle = {
      user: [
        { id: new AutoIncId(), email: 'hi@there.com', firstName: 'Eric' },
        { id: new NamedId('someUser'), email: 'alice@test.com', firstName: 'Alice' },
        { id: new AutoIncId(), email: 'bob@example.com', firstName: 'Bob' },
        { id: new NamedId('someOtherUser'), email: 'another@one.com', firstName: 'Another' },
      ],
      orders: [
        { userId: new NamedIdForTable('user', 'someUser'), productId: new NamedId('myProduct'), amount: 5 },
        { userId: new NamedIdForTable('user', 'someUser'), productId: new AutoIncId(), amount: 3 },
      ],
    }

    const expectedIdMap = {
      user: {
        someUser: { id: 100000 },
        someOtherUser: { id: 100001 },
      },
      orders: {
        myProduct: { id: 100000 },
      },
    }

    const manager = new RecipeManager()

    // We're not checking the prepared result here, just that the IDs are handled correctly
    manager.prepareRecipe(recipeBundle)

    expect(manager.getGeneratedNamedIds()).toEqual(expectedIdMap)
  })
})
