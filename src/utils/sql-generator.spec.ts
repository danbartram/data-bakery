import { RawSQL } from './recipe-manager'
import { groupRowsByColumns, sqlForRecipeBundle } from './sql-generator'

describe('sql-generator', () => {
  describe('sqlForRecipeBundle', () => {
    it('outputs batched sql', () => {
      const sql = sqlForRecipeBundle({
        user: [
          { id: 1, name: 'Peter' },
          { id: 2, name: 'Paul' },
        ],
      })

      expect(sql).toBe("INSERT INTO `user` (id,name) VALUES (1, 'Peter'), (2, 'Paul');")
    })
    it('outputs batched sql up to batchSize', () => {
      const sql = sqlForRecipeBundle({
        user: [
          { id: 1, name: 'Peter' },
          { id: 2, name: 'Paul' },
          { id: 3, name: 'Testing' },
        ],
      }, { batchSize: 2 })

      expect(sql).toBe("INSERT INTO `user` (id,name) VALUES (1, 'Peter'), (2, 'Paul');\nINSERT INTO `user` (id,name) VALUES (3, 'Testing');")
    })
    it('avoids batching different column groups', () => {
      const sql = sqlForRecipeBundle({
        user: [
          { id: 1, name: 'Peter' },
          { id: 2, name: 'Paul', extraColumn: 'something' },
        ],
      })

      expect(sql).toBe("INSERT INTO `user` (id,name) VALUES (1, 'Peter');\nINSERT INTO `user` (id,name,extraColumn) VALUES (2, 'Paul', 'something');")
    })
    it('outputs escaped sql', () => {
      const sql = sqlForRecipeBundle({
        user: [
          { id: 1, name: "Bobby's tables''\\", extra: "It's all \"groovy\"" },
        ],
      })

      expect(sql).toBe("INSERT INTO `user` (id,name,extra) VALUES (1, 'Bobby''s tables''''\\', 'It''s all \"groovy\"');")
    })
    it('handles NULL data values', () => {
      const sql = sqlForRecipeBundle({
        user: [
          { id: 1, name: null },
        ],
      })

      expect(sql).toBe('INSERT INTO `user` (id,name) VALUES (1, NULL);')
    })
    it('handles RawSQL values', () => {
      const sql = sqlForRecipeBundle({
        user: [
          { id: 1, name: null, created: new RawSQL('CURDATE()') },
        ],
      })

      expect(sql).toBe('INSERT INTO `user` (id,name,created) VALUES (1, NULL, CURDATE());')
    })
  })

  describe('groupRowsByColumns', () => {
    it('groups into distinct column buckets', () => {
      const result = groupRowsByColumns([
        { id: 1, name: 'test' },
        { id: 2, otherField: 'hello' },
        { id: 3, name: 'world' },
        { noOverlap: 'yes' },
      ])

      const expectedResult = new Map()
      expectedResult.set('id,name', [
        { id: 1, name: 'test' },
        { id: 3, name: 'world' },
      ])
      expectedResult.set('id,otherField', [
        { id: 2, otherField: 'hello' },
      ])
      expectedResult.set('noOverlap', [
        { noOverlap: 'yes' },
      ])

      expect(result).toEqual(expectedResult)
    })

    it('sorts column names before grouping', () => {
      const result = groupRowsByColumns([
        { id: 1, name: 'test' },
        { id: 2, otherField: 'hello' },
        { name: 'world', id: 3 },
      ])

      const expectedResult = new Map()
      expectedResult.set('id,name', [
        { id: 1, name: 'test' },
        { id: 3, name: 'world' },
      ])
      expectedResult.set('id,otherField', [
        { id: 2, otherField: 'hello' },
      ])

      expect(result).toEqual(expectedResult)
    })
  })
})
