import { chunkArray } from './array-util'

describe('array-util', () => {
  describe('chunkArray', () => {
    it('handles partially full final chunks', () => {
      const result = chunkArray([
        { id: 1, name: 'Peter' },
        { id: 2, name: 'Paul' },
        { id: 3, name: 'Alice' },
        { id: 4, name: 'Bob' },
        { id: 5, name: 'Test' },
      ], 2)

      const expectedResult = [
        [
          { id: 1, name: 'Peter' },
          { id: 2, name: 'Paul' },
        ],
        [
          { id: 3, name: 'Alice' },
          { id: 4, name: 'Bob' },
        ],
        [
          { id: 5, name: 'Test' },
        ],
      ]

      expect(result.length).toEqual(3)
      expect(result).toEqual(expectedResult)
    })
  })
})
