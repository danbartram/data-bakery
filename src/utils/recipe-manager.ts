
export type RecipeBundle = Record<TableName, Array<Record<ColumnName, any>>>

export class AutoIncId {
  value: number | undefined
}

export class NamedId {
  value: number | undefined
  name: string

  constructor (name: string) {
    this.value = undefined
    this.name = name
  }
}

export class NamedIdForTable extends NamedId {
  tableName: TableName

  constructor (tableName: TableName, name: string) {
    super(name)
    this.tableName = tableName
  }
}

export type TableName = string
export type ColumnName = string
// Allow for description etc to be included in the future
export type NamedIdExport = {
  id: number
}
export type NamedIdMap = Record<TableName, Record<string, NamedIdExport>>

export class RecipeManager {
  #tableAutoIncIds: Record<TableName, number> = {}
  #tableNamedIds: Record<TableName, Set<string>> = {}

  #namedIdRangeStart = 100000

  #generateAutoIncForTable (tableName: string): number {
    let nextAutoIncId = 1

    if (this.#tableAutoIncIds[tableName] !== undefined) {
      nextAutoIncId = this.#tableAutoIncIds[tableName] + 1
    }

    this.#tableAutoIncIds[tableName] = nextAutoIncId
    return nextAutoIncId
  }

  #generateNamedIdForTable (tableName: string, idName: string): number {
    if (!(tableName in this.#tableNamedIds)) {
      this.#tableNamedIds[tableName] = new Set()
    }

    this.#tableNamedIds[tableName].add(idName)

    // This allows duplicate named IDs to be defined/reused
    const indexOfIdName = Array.from(this.#tableNamedIds[tableName]).findIndex(existingName => existingName === idName)

    return this.#namedIdRangeStart + indexOfIdName
  }

  getGeneratedNamedIds (): NamedIdMap {
    const result: NamedIdMap = {}

    for (const tableName of Object.keys(this.#tableNamedIds)) {
      result[tableName] = {}

      for (const namedId of this.#tableNamedIds[tableName]) {
        result[tableName][namedId] = {
          id: this.#generateNamedIdForTable(tableName, namedId),
        }
      }
    }

    return result
  }

  * prepareRecipes (recipeBundles: RecipeBundle[]): Generator<RecipeBundle> {
    for (const recipeBundle of recipeBundles) {
      const tableNames = Object.keys(recipeBundle)

      for (const tableName of tableNames) {
        const tableRows = recipeBundle[tableName]

        for (const tableRow of tableRows) {
          const columnNames = Object.keys(tableRow)

          for (const columnName of columnNames) {
            if (tableRow[columnName] instanceof AutoIncId) {
              const autoThing: AutoIncId = tableRow[columnName]
              // As they're objects, we can set all uses of this AutoInc instance to have the
              // same generated value
              if (autoThing.value === undefined) {
                autoThing.value = this.#generateAutoIncForTable(tableName)
              }

              // Swap out the AutoInc placeholder with its generated value
              tableRow[columnName] = autoThing.value
            }

            if (tableRow[columnName] instanceof NamedIdForTable) {
              const namedIdForTable: NamedIdForTable = tableRow[columnName]
              // As they're objects, we can set all uses of this AutoInc instance to have the
              // same generated value
              if (namedIdForTable.value === undefined) {
                namedIdForTable.value = this.#generateNamedIdForTable(namedIdForTable.tableName, namedIdForTable.name)
              }

              // Swap out the NamedId placeholder with its generated value
              recipeBundle[namedIdForTable.tableName][columnName] = namedIdForTable.value
            } else if (tableRow[columnName] instanceof NamedId) {
              const namedId: NamedId = tableRow[columnName]
              // As they're objects, we can set all uses of this AutoInc instance to have the
              // same generated value
              if (namedId.value === undefined) {
                namedId.value = this.#generateNamedIdForTable(tableName, namedId.name)
              }

              // Swap out the NamedId placeholder with its generated value
              tableRow[columnName] = namedId.value
            }
          }
        }
      }

      yield recipeBundle
    }

    return Object.keys(this.#tableAutoIncIds)
  }
}
