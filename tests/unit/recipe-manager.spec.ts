import { AutoIncId, getNamedId, NamedId } from '../../src/recipe-helper'
import { RecipeManager, type RecipeBundle } from '../../src/recipe-manager'

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
        { productId: 501, name: 'Bread' },
        { productId: 502, name: 'Cheese' },
      ],
      orders: [
        { userId: 1, productId: 501, amount: 5 },
        { userId: 1, productId: 502, amount: 3 },
      ],
    }

    const manager = new RecipeManager({
      tableStartIds: {
        products: 501,
      },
    })
    const preparedRecipe = manager.prepareRecipe(recipeBundle)
    expect(preparedRecipe).toEqual(expectedResult)
  })

  it('generates named IDs correctly', () => {
    const recipeBundle = {
      user: [
        { id: new AutoIncId(), email: 'hi@there.com', firstName: 'Eric' },
        { id: new NamedId('specialUser'), email: 'alice@test.com', firstName: 'Alice' },
        { id: new AutoIncId(), email: 'bob@example.com', firstName: 'Bob' },
        { id: new NamedId('someOtherName'), email: 'another@one.com', firstName: 'Another' },
      ],
      orders: [
        { userId: getNamedId('user', 'specialUser'), productId: new NamedId('myProduct'), amount: 5 },
        { userId: getNamedId('user', 'someOtherName'), productId: new AutoIncId(), amount: 3 },
      ],
    }

    const expectedResult = {
      user: [
        { id: 1, email: 'hi@there.com', firstName: 'Eric' },
        { id: 2, email: 'alice@test.com', firstName: 'Alice' },
        { id: 3, email: 'bob@example.com', firstName: 'Bob' },
        { id: 4, email: 'another@one.com', firstName: 'Another' },
      ],
      orders: [
        { userId: 2, productId: 1, amount: 5 },
        { userId: 4, productId: 2, amount: 3 },
      ],
    }

    const manager = new RecipeManager()
    const preparedBundle = manager.prepareRecipe(recipeBundle)
    expect(preparedBundle).toEqual(expectedResult)
  })

  it('getNamedId uses placeholder values if it has not been defined yet', () => {
    const recipeBundle = {
      orders: [
        // Use the named ID before it's been defined in the user table
        { userId: getNamedId('user', 'specialUser'), productId: new NamedId('myProduct'), amount: 5 },
        { userId: getNamedId('user', 'specialUser'), productId: new AutoIncId(), amount: 3 },
      ],
      user: [
        { id: new NamedId('specialUser'), email: 'alice@test.com', firstName: 'Alice' },
      ],
    }

    const expectedResult = {
      orders: [
        { userId: 1, productId: 1, amount: 5 },
        { userId: 1, productId: 2, amount: 3 },
      ],
      user: [
        { id: 1, email: 'alice@test.com', firstName: 'Alice' },
      ],
    }

    const manager = new RecipeManager()
    const preparedBundle = manager.prepareRecipe(recipeBundle)
    expect(preparedBundle).toEqual(expectedResult)
  })

  it('throws if duplicate NamedId is created', () => {
    const recipeBundle = {
      orders: [
        { userId: new NamedId('duplicate'), amount: 5 },
        { userId: new NamedId('duplicate'), amount: 10 },
      ],
    }

    const manager = new RecipeManager()
    expect(() => { manager.prepareRecipe(recipeBundle) }).toThrow()
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
        { userId: getNamedId('user', 'someUser'), productId: new NamedId('myProduct'), amount: 5 },
        { userId: getNamedId('user', 'someOtherUser'), productId: new AutoIncId(), amount: 3 },
      ],
    }

    const expectedIdMap = {
      user: {
        someUser: { id: 2 },
        someOtherUser: { id: 4 },
      },
      orders: {
        myProduct: { id: 1 },
      },
    }

    const manager = new RecipeManager()

    // We're not checking the prepared result here, just that the IDs are handled correctly
    manager.prepareRecipe(recipeBundle)

    expect(manager.getGeneratedNamedIds()).toEqual(expectedIdMap)
  })
})
