
import { writeFileSync } from 'fs'
import { type Logger } from 'winston'
import { type RecipeManager } from './recipe-manager'
import { getExportFileNameFromRecipePath } from './utils/file-utils'
import { sqlForRecipeBundle } from './utils/sql-generator'

export type ExporterConfig = {
  outputDir: string
  sqlDialect: string
  extraRecipeContext?: object
  startPrefix?: number
  logger?: Logger
}

/**
 * Manager wrapper around processing recipe bundles, generating IDs,
 * and exporting the generated data.
 */
export class ExportGenerator {
  #recipeFilePaths: string[]
  #recipeManager: RecipeManager
  #outputDir: string
  #sqlDialect: string
  #extraRecipeContext?: object
  #startPrefix?: number
  #logger?: Logger
  #exportedFilesCount: number = 0

  constructor (recipeFilePaths: string[], recipeManager: RecipeManager, config: ExporterConfig) {
    this.#recipeFilePaths = recipeFilePaths
    this.#recipeManager = recipeManager
    this.#outputDir = config.outputDir
    this.#sqlDialect = config.sqlDialect
    this.#extraRecipeContext = config.extraRecipeContext
    this.#startPrefix = config.startPrefix
    this.#logger = config.logger
  }

  async exportAllRecipes (): Promise<void> {
    for (const recipePath of this.#recipeFilePaths) {
      await this.#exportRecipe(recipePath)
    }
  }

  async #exportRecipe (inputRecipePath: string): Promise<void> {
    this.#logger?.debug(`Loading recipe bundle from file: '${inputRecipePath}'`)
    const recipeExport = (await import(inputRecipePath))?.default
    let recipeBundle

    if (typeof recipeExport === 'object') {
      recipeBundle = recipeExport
    } else if (typeof recipeExport === 'function') {
      const recipeContext = {
        ...this.#extraRecipeContext,
        sqlDialect: this.#sqlDialect,
      }
      recipeBundle = await recipeExport(recipeContext)
    } else {
      throw new Error(`Recipe '${inputRecipePath}' exported an unsupported type, please check it is exporting a function or an object`)
    }

    const preparedRecipe = this.#recipeManager.prepareRecipe(recipeBundle)
    const sqlData = sqlForRecipeBundle(preparedRecipe)

    let outputFileName = getExportFileNameFromRecipePath(inputRecipePath)

    // TODO: Check that file name doesn't already exist

    if (typeof this.#startPrefix === 'number') {
      const generatedPrefix = this.#getExportPrefix()
      outputFileName = `${generatedPrefix}${outputFileName}`
    }

    try {
      const outputFilePath = `${this.#outputDir}/${outputFileName}`
      this.#logger?.debug(`Writing to '${outputFilePath}'`)
      writeFileSync(outputFilePath, sqlData)
      this.#exportedFilesCount++
    } catch (e) {
      this.#logger?.error(e)
      throw new Error(`Failed to export: '${outputFileName}'`)
    }
  }

  // This makes the prefix always a consistent length. If you set the prefix to 100 but have 1,000 recipes
  // this causes the prefixes to start at `0100` so they'll all fit with the same prefix length.
  #getExportPrefix (): string {
    const significantFigures = this.#exportedFilesCount.toString().length
    const nextPrefixNumber = ((this.#startPrefix ?? 0) + this.#exportedFilesCount)
    return `${nextPrefixNumber.toString().padStart(significantFigures, '0')}-`
  }

  exportMetadataFile (): void {
    const outputFilePath = `${this.#outputDir}/meta.json`

    const metadata = {
      namedIds: this.#recipeManager.getGeneratedNamedIds(),
    }
    writeFileSync(outputFilePath, JSON.stringify(metadata, null, 2) + '\n')
  }
}
