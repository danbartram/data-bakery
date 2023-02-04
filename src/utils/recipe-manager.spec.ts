import { AutoIncId, RecipeManager, NamedId, NamedIdForTable } from './recipe-manager'

describe('prepareRecipes', () => {
  it('generates AutoInc values correctly', () => {
    const userId = new AutoIncId() // 1
    const productId1 = new AutoIncId() // 1
    const productId2 = new AutoIncId() // 2

    const recipeBlock = {
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

    const desiredResult = {
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
    const generatorThing = manager.prepareRecipes([recipeBlock])
    expect(generatorThing.next().value).toEqual(desiredResult)
  })

  it('generates named IDs correctly', () => {
    const specialUserId = new NamedId('specialUser')
    const anotherSpecialUserId = new NamedId('someOtherName')

    const recipeBlock = {
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

    const desiredResult = {
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
    const generatorThing = manager.prepareRecipes([recipeBlock])
    expect(generatorThing.next().value).toEqual(desiredResult)
  })

  it('generates the same named ID value for duplicate NamedId instances', () => {
    const specialUserId = new NamedId('specialUser')

    const recipeBlock = {
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

    const desiredResult = {
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
    const generatorThing = manager.prepareRecipes([recipeBlock])
    expect(generatorThing.next().value).toEqual(desiredResult)
  })

  it('exports generated named IDs correctly', () => {
    const recipeBlock = {
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
    const generatorThing = manager.prepareRecipes([recipeBlock])
    // We're not checking the prepared result here, just that the IDs are handled correctly
    generatorThing.next()

    expect(manager.getGeneratedNamedIds()).toEqual(expectedIdMap)
  })
})
