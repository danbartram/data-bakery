
export type RecipeBundle = Record<string, Array<Record<string, any>>>

export class AutoInc {
  generatedValue: number | null
}

export class RecipeManager {
  tableAutoIncIds: Record<string, number> = {}

  generateAutoIncForTable (tableName: string): number {
    let nextAutoIncId = 1

    if (this.tableAutoIncIds[tableName] !== undefined) {
      nextAutoIncId = this.tableAutoIncIds[tableName] + 1
    }

    this.tableAutoIncIds[tableName] = nextAutoIncId
    return nextAutoIncId
  }

  * prepareRecipes (recipeBundles: RecipeBundle[]): Generator<RecipeBundle> {
    for (const recipeBundle of recipeBundles) {
      const tableNames = Object.keys(recipeBundle)

      for (const tableName of tableNames) {
        const tableRows = recipeBundle[tableName]

        for (const tableRow of tableRows) {
          const columnNames = Object.keys(tableRow)

          for (const columnName of columnNames) {
            if (tableRow[columnName] instanceof AutoInc) {
              // As they're objects, we can set all uses of this AutoInc instance to have the
              // same generated value
              if (tableRow[columnName].generatedValue == null) {
                tableRow[columnName].generatedValue = this.generateAutoIncForTable(tableName)
              }

              // Swap out the AutoInc placeholder with its generated value
              tableRow[columnName] = tableRow[columnName].generatedValue
            }
          }
        }
      }

      yield recipeBundle
    }

    return Object.keys(this.tableAutoIncIds)
  }
}
