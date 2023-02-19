import { type TableName } from './recipe-manager'

export type NamedIdName = string

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
 * You can read a generated named ID with getNamedId().
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

export class NamedIdPlaceholder {
  /** The name of the table where the NamedId instance exists */
  tableName: TableName
  idName: NamedIdName

  constructor (tableName: TableName, idName: NamedIdName) {
    this.tableName = tableName
    this.idName = idName
  }
}

export const getNamedId = (tableName: TableName, idName: NamedIdName): NamedIdPlaceholder => new NamedIdPlaceholder(tableName, idName)

export class RawSQL {
  rawValue: string

  constructor (rawValue: string) {
    this.rawValue = rawValue
  }
}
