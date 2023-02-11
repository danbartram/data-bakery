import { AutoIncId, NamedId, NamedIdForTable, type NamedIdName } from './recipe-helper'

export type TableName = string
export type ColumnName = string

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

/** An object containing table names as keys, with the values as functions which return column values in a nested object */
export type TableDefaults = Record<TableName, () => Record<ColumnName, any>>

/** The config options available for the RecipeManager */
export type RecipeManagerConfig = {
  tableDefaults?: TableDefaults
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
  /** A map containing functions to generate default row values, keyed by table name */
  #tableDefaults: TableDefaults = {}

  /** The first ID value to use with named IDs */
  #namedIdRangeStart = 100000

  constructor (config: RecipeManagerConfig = {}) {
    if (config.tableDefaults !== undefined) {
      this.#tableDefaults = config.tableDefaults
    }
  }

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
   * Prepare a recipe bundle into data ready for exporting.
   */
  prepareRecipe (recipeBundle: RecipeBundle): RecipeBundle {
    const tableNames: TableName[] = Object.keys(recipeBundle)
    const preparedBundle: RecipeBundle = {}

    tableNames.forEach(tableName => {
      const tableRows: Record<ColumnName, any> = recipeBundle[tableName]

      const preparedRows = tableRows.map(tableRow => {
        return this.#processTableRow(tableName, tableRow)
      })

      preparedBundle[tableName] = preparedRows
    })

    return preparedBundle
  }

  /**
   * Include any default table fields (optional) to the row
   */
  addDefaultFieldsToRow (tableName: TableName, row): object {
    const tableHasDefaults = typeof this.#tableDefaults[tableName] === 'function'

    if (!tableHasDefaults) {
      return row
    }

    return { ...this.#tableDefaults[tableName](), ...row }
  }

  /**
   * Process an indiviual table row so that all auto and named IDs are generated.
   */
  #processTableRow (tableName: TableName, tableRow: Record<ColumnName, any>): Record<ColumnName, any> {
    const processedRow = this.addDefaultFieldsToRow(tableName, tableRow)
    const columnNames = Object.keys(processedRow)

    for (const columnName of columnNames) {
      if (processedRow[columnName] instanceof AutoIncId) {
        const autoIncId: AutoIncId = processedRow[columnName]

        if (autoIncId.value === undefined) {
          autoIncId.value = this.#generateAutoIncForTable(tableName)
        }

        processedRow[columnName] = autoIncId.value
      } else if (processedRow[columnName] instanceof NamedIdForTable) {
        const namedIdForTable: NamedIdForTable = processedRow[columnName]

        if (namedIdForTable.value === undefined) {
          namedIdForTable.value = this.#generateNamedIdForTable(namedIdForTable.tableName, namedIdForTable.name)
        }

        processedRow[columnName] = namedIdForTable.value
      } else if (processedRow[columnName] instanceof NamedId) {
        const namedId: NamedId = processedRow[columnName]

        if (namedId.value === undefined) {
          namedId.value = this.#generateNamedIdForTable(tableName, namedId.name)
        }

        processedRow[columnName] = namedId.value
      }
    }

    return processedRow
  }
}
