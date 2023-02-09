import { type ColumnName, RawSQL, type RecipeBundle } from './recipe-manager'

export type SQLDialect = 'mysql'

/**
 * Generate SQL queries for the provided recipe bundle.
 */
export function sqlForRecipeBundle (recipeBundle: RecipeBundle, dialect: SQLDialect = 'mysql'): string {
  const sqlQueries: string[] = []

  Object.keys(recipeBundle).forEach(tableName => {
    // Group rows by their used column names, so we can batch insert them efficiently
    const groupedRows = groupRowsByColumns(recipeBundle[tableName])

    groupedRows.forEach((rows, columnMapKey) => {
      // Generate a value list, i.e. a CSV of column values between parentheses, for each row
      const valueLists: string[] = rows.map(row => {
        const newValueList: string[] = columnMapKey.split(',').map(columnName => {
          return escapeValue(row[columnName])
        })

        return `(${newValueList.join(', ')})`
      })

      sqlQueries.push(`INSERT INTO \`${tableName}\` (${columnMapKey}) VALUES ${valueLists.join(', ')};`)
    })
  })

  return sqlQueries.join('\n')
}

/**
 * Escape a raw variable value so it can be used inside of an SQL query
 */
function escapeValue (value: any): any {
  if (value === null) {
    return 'NULL'
  } else if (value instanceof RawSQL) {
    return value.rawValue
  } else if (typeof value === 'number') {
    // Numbers are not escaped
    return value
  } else {
    // Escape single quotes with double single quotes
    value = value.toString().replace(/'/g, "''")
    return `'${value as string}'`
  }
}

/**
 * Group rows by their column names to allow for efficient INSERT batching
 */
export function groupRowsByColumns (rows: Array<Record<string, any>>): Map<string, Record<string, any>> {
  const columnMap = new Map<string, Array<Record<string, any>>>()
  const firstRowColumnNames = Object.keys(rows[0])

  rows.forEach(row => {
    const rowColumnNames = sortRowColumnsToMatchFirstRow(firstRowColumnNames, row)
    const mapKey = rowColumnNames.join(',')

    if (columnMap.has(mapKey)) {
      columnMap.get(mapKey)?.push(row)
    } else {
      columnMap.set(mapKey, [row])
    }
  })

  return columnMap
}

/**
 * Given a row, sort its column names to match the firstRowColumnNames, if possible.
 */
function sortRowColumnsToMatchFirstRow (firstRowColumnNames, row): ColumnName[] {
  return Object.keys(row).sort((a, b) => {
    const indexInA = firstRowColumnNames.indexOf(a)
    const indexInB = firstRowColumnNames.indexOf(b)
    // If the key is missing from the first row column, add the new name to the end
    if (indexInA === -1 || indexInB === -1) {
      return 1
    }

    return indexInA - indexInB
  })
}
