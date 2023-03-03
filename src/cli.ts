#!/usr/bin/env node
import { program } from 'commander'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { resolve } from 'path'
import winston from 'winston'
import { ExportGenerator } from './export-generator'
import { RecipeManager } from './recipe-manager'
import { getRecipeFilePaths, getOutputFilesToRemove, type Config } from './utils/file-util'

const logTransports = {
  console: new winston.transports.Console(),
}

const logger = winston.createLogger({
  format: winston.format.cli(),
  transports: [
    logTransports.console,
  ],
})
program.configureOutput({
  writeErr: (str) => logger.error(str),
})

program
  .name('Data Bakery')
  .description('A helpful tool to generate SQL data for integration tests')

program.command('generate')
  .description('Generate an SQL file')
  .argument('[config-file]', 'Path to a data-bakery.config.js file', 'data-bakery.config.js')
  .option('--debug', 'Enable debug logging')
  .option('-s, --sql-dialect <dialect>', 'The type of SQL to generate (e.g. "mysql")')
  .option('-d, --output-dir <directory>', 'Directory for the exported SQL and metadata files')
  .option('-r, --recipes-dir <directory>', 'Path to the directory containing recipes')
  .action(async (configFile: any, options: Config) => {
    if (options.debug === true) {
      logTransports.console.level = 'debug'
    }

    // Allow options in the CLI to override the config file
    const mergedOptions = await getMergedOptions(options, configFile)

    if (mergedOptions.outputDir === undefined) {
      program.error('Please provide an output directory with --output-dir')
    }

    const resolvedOutputDir = resolve(mergedOptions.outputDir)

    if (!existsSync(resolvedOutputDir)) {
      logger.debug(`The output directory: '${resolvedOutputDir}' does not exist, creating`)

      try {
        mkdirSync(resolvedOutputDir, { recursive: true })
      } catch (e) {
        logger.error(e)
        program.error(`Failed to create new output directory: '${resolvedOutputDir}'`)
      }
    }

    if (mergedOptions.emptyOutputDir === true) {
      const filesToRemove: string[] = getOutputFilesToRemove(resolvedOutputDir)
      logger.verbose(`Found ${filesToRemove.length} files to remove from output directory`)
      filesToRemove.forEach(filePath => { rmSync(`${resolvedOutputDir}/${filePath}`, { recursive: true }) })
    }

    if (mergedOptions.recipesDir === undefined) {
      program.error('No recipes directory provided, cannot find any recipes')
    }

    if (mergedOptions.sqlDialect === undefined) {
      program.error('No SQL dialect provided, please specify which dialect to output')
    }

    const resolvedRecipesDir = resolve(mergedOptions.recipesDir)

    const recipeManager = new RecipeManager({
      tableDefaults: mergedOptions.tableDefaults,
      tableStartIds: mergedOptions.tableStartIds,
    })
    const recipeFilePaths = getRecipeFilePaths(resolvedRecipesDir)

    logger.info(`Found ${recipeFilePaths.length} recipe(s) in '${resolvedRecipesDir}'`)

    if (recipeFilePaths.length > 0) {
      logger.debug(`Recipe files: ${recipeFilePaths.join(', ')}`)
    }

    const exportPrefix = mergedOptions.outputPrefixStart !== undefined
      ? Number.parseInt(mergedOptions.outputPrefixStart)
      : undefined

    const extraRecipeContext = typeof mergedOptions.extraRecipeContext === 'function'
      ? mergedOptions.extraRecipeContext()
      : {}

    const exportGenerator = new ExportGenerator(recipeFilePaths, recipeManager, {
      outputDir: resolvedOutputDir,
      sqlDialect: mergedOptions.sqlDialect,
      extraRecipeContext,
      startPrefix: exportPrefix,
      logger,
    })

    await exportGenerator.exportAllRecipes()
    exportGenerator.exportMetadataFile()

    logger.info('Done')
  })

program.parse()

/**
 * Retrieve the merged result of the config file and CLI option overrides.
 *
 * This allows for using a config file with specific optional overrides at runtime.
 */
async function getMergedOptions (options: Config, configFile: string): Promise<Config> {
  let configFileOptions: Config | null = null

  if (typeof configFile === 'string') {
    try {
      configFileOptions = (await import(resolve(configFile))).default()
    } catch (e) {
      program.error(`Failed to load config file at path: '${configFile}'`)
    }

    if (configFileOptions === null) {
      program.error(`No config file found at path: '${configFile}'`)
    }

    logger.info(`Imported config from: '${configFile}'`)
  }

  return { ...configFileOptions, ...options }
}
