import { AutoInc, RecipeManager } from './recipe-manager'

describe('prepareRecipes', () => {
  it('generates AutoInc values correctly', () => {
    const userId = new AutoInc() // 1
    const productId1 = new AutoInc() // 1
    const productId2 = new AutoInc() // 2

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
})
