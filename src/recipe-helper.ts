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

export class RawSQL {
  rawValue: string

  constructor (rawValue: string) {
    this.rawValue = rawValue
  }
}
