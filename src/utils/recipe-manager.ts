
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
          this.#processTableRow(tableName, tableRow)
        }
      }

      yield recipeBundle
    }

    return Object.keys(this.#tableAutoIncIds)
  }

  /**
   * Process an indiviual table row so that all auto and named IDs are generated.
   *
   * @param tableName
   * @param tableRow
   */
  #processTableRow (tableName: TableName, tableRow: Record<string, any>): void {
    const columnNames = Object.keys(tableRow)

    for (const columnName of columnNames) {
      if (tableRow[columnName] instanceof AutoIncId) {
        const autoIncId: AutoIncId = tableRow[columnName]

        if (autoIncId.value === undefined) {
          autoIncId.value = this.#generateAutoIncForTable(tableName)
        }

        tableRow[columnName] = autoIncId.value
      } else if (tableRow[columnName] instanceof NamedIdForTable) {
        const namedIdForTable: NamedIdForTable = tableRow[columnName]

        if (namedIdForTable.value === undefined) {
          namedIdForTable.value = this.#generateNamedIdForTable(namedIdForTable.tableName, namedIdForTable.name)
        }

        tableRow[columnName] = namedIdForTable.value
      } else if (tableRow[columnName] instanceof NamedId) {
        const namedId: NamedId = tableRow[columnName]

        if (namedId.value === undefined) {
          namedId.value = this.#generateNamedIdForTable(tableName, namedId.name)
        }

        tableRow[columnName] = namedId.value
      }
    }
  }
}
