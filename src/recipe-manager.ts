import { AutoIncId, NamedId, NamedIdPlaceholder, type NamedIdName } from './recipe-helper'

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

/** Metadata for named IDs during the processing steps */
export type NamedIdStatus = {
  /** The automatically generated ID value */
  idValue: number
  /** Identify whether this named ID has only been used via `getNamedId` and not has been defined yet */
  isPlaceholder: boolean
}

/** The object nested under the ID's name in the export */
export type NamedIdExport = {
  id: number
}

/** The map that's generated to export all named IDs across all tables */
export type NamedIdExportMap = Record<TableName, Record<NamedIdName, NamedIdExport>>

/** An object containing table names as keys, with the values as functions which return column values in a nested object */
export type TableDefaultsConfig = Record<TableName, () => Record<ColumnName, any>>

/** An object containing table names as keys, with the values as the first AUTO INCREMENT ID value to use  */
export type TableStartIdsConfig = Record<TableName, number>

/** The config options available for the RecipeManager */
export type RecipeManagerConfig = {
  tableDefaults?: TableDefaultsConfig
  tableStartIds?: TableStartIdsConfig
}

/**
 * Manager wrapper around processing recipe bundles, generating IDs,
 * and exporting the generated data.
 */
export class RecipeManager {
  /** A map containing the latest AUTO INCREMENT value, keyed by table name */
  #tableAutoIncIds: Record<TableName, number> = {}
  /** A map containing all of the unique named IDs in each table, keyed by table name */
  #tableNamedIds: Record<TableName, Map<NamedIdName, NamedIdStatus>> = {}
  /** A map containing functions to generate default row values, keyed by table name */
  #tableDefaults: TableDefaultsConfig = {}
  #tableStartIds: TableStartIdsConfig = {}

  constructor (config: RecipeManagerConfig = {}) {
    if (config.tableDefaults !== undefined) {
      this.#tableDefaults = config.tableDefaults
    }

    if (config.tableStartIds !== undefined) {
      this.#tableStartIds = config.tableStartIds
    }
  }

  /**
   * Generate and retrieve the next AUTO INCREMENT ID value to use for a table.
   */
  #generateNextAutoIncForTable (tableName: TableName): number {
    let nextAutoIncId = this.#tableStartIds[tableName] ?? 1

    if (this.#tableAutoIncIds[tableName] !== undefined) {
      nextAutoIncId = this.#tableAutoIncIds[tableName] + 1
    }

    this.#tableAutoIncIds[tableName] = nextAutoIncId
    return nextAutoIncId
  }

  /**
   * Convenience function to access generated named IDs, such as from the context
   * of a recipe file being processed.
   */
  getNamedId (tableName: TableName, idName: NamedIdName): number {
    return this.#generateNamedIdForTable(tableName, idName, true)
  }

  /**
   * Generate and retrieve the generated ID value for a given named ID.
   */
  #generateNamedIdForTable (tableName: TableName, idName: NamedIdName, isPlaceholder: boolean = false): number {
    if (!(tableName in this.#tableNamedIds)) {
      this.#tableNamedIds[tableName] = new Map()
    }

    const namedIdStatus = this.#tableNamedIds[tableName].get(idName)

    // This is the first time this ID name has been used, generate a new value
    if (namedIdStatus === undefined) {
      const nextId = this.#generateNextAutoIncForTable(tableName)
      this.#tableNamedIds[tableName].set(idName, {
        isPlaceholder,
        idValue: nextId,
      })
      return nextId
    }

    if (!isPlaceholder && !namedIdStatus.isPlaceholder) {
      throw new Error(`Named ID: '${idName}' for table: '${tableName}' has been defined multiple times. Use getNamedId() to read values`)
    }

    return namedIdStatus.idValue
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

      for (const [idName, namedIdStatus] of this.#tableNamedIds[tableName]) {
        result[tableName][idName] = {
          id: namedIdStatus.idValue,
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

      if (!Array.isArray(tableRows)) {
        return
      }

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
   * Process an individual table row so that all auto and named IDs are generated.
   */
  #processTableRow (tableName: TableName, tableRow: Record<ColumnName, any>): Record<ColumnName, any> {
    const processedRow = this.addDefaultFieldsToRow(tableName, tableRow)
    const columnNames = Object.keys(processedRow)

    for (const columnName of columnNames) {
      if (processedRow[columnName] instanceof AutoIncId) {
        const autoIncId: AutoIncId = processedRow[columnName]

        if (autoIncId.value === undefined) {
          autoIncId.value = this.#generateNextAutoIncForTable(tableName)
        }

        processedRow[columnName] = autoIncId.value
      } else if (processedRow[columnName] instanceof NamedIdPlaceholder) {
        const namedIdPlaceholder: NamedIdPlaceholder = processedRow[columnName]
        processedRow[columnName] = this.#generateNamedIdForTable(namedIdPlaceholder.tableName, namedIdPlaceholder.idName, true)
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
