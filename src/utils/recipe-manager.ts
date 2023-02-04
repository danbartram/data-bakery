export type TableName = string
export type ColumnName = string
export type NamedIdName = string

/**
 * A bundle of related recipes of table data.
 * The structure is a wrapped object, like this example:
 *
 * {
 *  firstTableName: [
 *    { columnA: 'valueA', columnB: 'valueB' }
 *  ],
 *  secondTableName: [
 *    { name: 'Test' },
 *    { name: 'Example' }
 *  ],
 * }
 */
export type RecipeBundle = Record<TableName, Array<Record<ColumnName, any>>>

/** The object nested under the ID's name in the export */
export type NamedIdExport = {
  id: number
}

/** The map that's generated to export all named IDs across all tables */
export type NamedIdExportMap = Record<TableName, Record<NamedIdName, NamedIdExport>>

/**
 * A convenience class to use for AUTO INCREMENT IDs.
 * This allows other row definitions in the same bundle to reference the generated
 * ID, without needing to use a NamedId instance.
 */
export class AutoIncId {
  value: number | undefined
}

/**
 * A convenience class to reference a specific ID with a descriptive name.
 * This can be used to generate special cases, and allow you to easily reference them
 * again later with a NamedIdForTable instance.
 *
 * For example, a `productWithRefund` named ID.
 */
export class NamedId {
  /** The generated ID value, or undefined if it's not been processed yet */
  value: number | undefined
  /** A unique (per table) descriptive name explaining the purpose of the row */
  name: NamedIdName

  constructor (name: NamedIdName) {
    this.value = undefined
    this.name = name
  }
}

/**
 * A wrapper for `NamedId` to allow accessing the ID from within a different
 * table recipe to where it's defined.
 */
export class NamedIdForTable extends NamedId {
  /** The name of the table where the NamedId instance exists */
  tableName: TableName

  constructor (tableName: TableName, name: NamedIdName) {
    super(name)
    this.tableName = tableName
  }
}

/**
 * Manager wrapper around processing recipe bundles, generating IDs,
 * and exporting the generated data.
 */
export class RecipeManager {
  /** A map containing the latest AUTO INCREMENT value, keyed by table name */
  #tableAutoIncIds: Record<TableName, number> = {}
  /** A map containing all of the unique named IDs in each table, keyed by table name */
  #tableNamedIds: Record<TableName, Set<NamedIdName>> = {}

  /** The first ID value to use with named IDs */
  #namedIdRangeStart = 100000

  /**
   * Generate and retrieve the next AUTO INCREMENT ID value to use for a table.
   */
  #generateAutoIncForTable (tableName: TableName): number {
    let nextAutoIncId = 1

    if (this.#tableAutoIncIds[tableName] !== undefined) {
      nextAutoIncId = this.#tableAutoIncIds[tableName] + 1
    }

    this.#tableAutoIncIds[tableName] = nextAutoIncId
    return nextAutoIncId
  }

  /**
   * Generate and retrieve the generated ID value for a given named ID.
   */
  #generateNamedIdForTable (tableName: TableName, idName: NamedIdName): number {
    if (!(tableName in this.#tableNamedIds)) {
      this.#tableNamedIds[tableName] = new Set()
    }

    this.#tableNamedIds[tableName].add(idName)

    // This allows duplicate named IDs to be defined/reused
    const indexOfIdName = Array.from(this.#tableNamedIds[tableName]).findIndex(existingName => existingName === idName)

    return this.#namedIdRangeStart + indexOfIdName
  }

  /**
   * Retrieve a map of all named IDs, grouped by table, ready for exporting.
   *
   * This map can be exported to a JSON file, for example, and imported into
   * the test files to reference the ID values directly.
   */
  getGeneratedNamedIds (): NamedIdExportMap {
    const result: NamedIdExportMap = {}

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

  /**
   * Generator method to prepare an array of recipe bundles into data ready for exporting.
   */
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
   */
  #processTableRow (tableName: TableName, tableRow: Record<ColumnName, any>): void {
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
