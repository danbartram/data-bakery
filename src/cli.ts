#!/usr/bin/env node
import { program } from 'commander'
import winston from 'winston'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'fs'
import { resolve } from 'path'
import { type Config, getRecipeFilePaths } from './utils/file-utils'
import { ExportGenerator } from './export-generator'
import { RecipeManager } from './recipe-manager'

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
  .description('A tool to generate SQL data for tests')

program.command('generate')
  .description('Generate an SQL file')
  .option('--config <filePath>', 'Path to the config file')
  .option('--debug', 'Enable debug logging')
  .option('--metadata-output <filePath>', 'Path for the exported metadata file', 'exports.json')
  .option('-p, --output-file-prefix <start>', 'The initial value to use for prefixes in exported SQL file names')
  .option('-s, --sql-dialect <start>', 'The type of SQL to generate (e.g. "mysql")')
  .option('-d, --output-dir <filePath>', 'Directory for the exported SQL and metadata files')
  .option('-r, --recipes-dir <directory>', 'Path to the directory containing recipes')
  .action(async (options: Config) => {
    if (options.debug === true) {
      logTransports.console.level = 'debug'
    }

    // Allow options in the CLI to override the config file
    const mergedOptions = await getMergedOptions(options)

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

    const filesInOutputDir = readdirSync(resolvedOutputDir)

    if (filesInOutputDir.length > 0) {
      if (mergedOptions.emptyOutputDir === true) {
        logger.debug(`Removing ${filesInOutputDir.length} files from output directory`)
        filesInOutputDir.forEach(fileName => { rmSync(`${resolvedOutputDir}/${fileName}`, { recursive: true }) })
      } else {
        logger.warn('Output directory is not empty, it may contain stale output files')
      }
    }

    if (mergedOptions.recipesDir === undefined) {
      program.error('No recipes directory provided, cannot find any recipes')
    }

    if (mergedOptions.sqlDialect === undefined) {
      program.error('No SQL dialect provided, please specify which dialect to output')
    }

    const resolvedRecipesDir = resolve(mergedOptions.recipesDir)

    const recipeManager = new RecipeManager()
    const recipeFilePaths = getRecipeFilePaths(resolvedRecipesDir)

    logger.info(`Found ${recipeFilePaths.length} recipe(s) in '${resolvedRecipesDir}'`)

    if (recipeFilePaths.length > 0) {
      logger.debug(`Recipe files: ${recipeFilePaths.join(', ')}`)
    }

    const exportPrefix = mergedOptions.exportPrefixStart !== undefined
      ? Number.parseInt(mergedOptions.exportPrefixStart)
      : undefined

    const recipeContext = typeof mergedOptions.recipeContext === 'function'
      ? mergedOptions.recipeContext()
      : {}

    const exportGenerator = new ExportGenerator(recipeFilePaths, recipeManager, {
      outputDir: resolvedOutputDir,
      sqlDialect: mergedOptions.sqlDialect,
      recipeContext,
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
async function getMergedOptions (options: Config): Promise<Config> {
  let configFileOptions: Config | null = null

  if (typeof options.config === 'string') {
    try {
      configFileOptions = (await import(resolve(options.config))).default()
    } catch (e) {
      program.error(`Failed to load config file at path: '${options.config}'`)
    }

    if (configFileOptions === null) {
      program.error(`No config file found at path: '${options.config}'`)
    }

    logger.info(`Imported config from: '${options.config}'`)
  }

  return { ...configFileOptions, ...options }
}
