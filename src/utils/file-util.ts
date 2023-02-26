import { readFileSync, readdirSync, rmSync } from 'fs'
import glob from 'glob'
import { resolve } from 'path'
import { type Logger } from 'winston'

export function getExportFileNameFromRecipePath (recipePath: string): string {
  // TODO: Maybe this should keep the structure inside the recipes dir, e.g.
  // Recipe: `/recipes/a/b/hello.js`
  // Export name: `/a_b_hello.js` instead of just `hello.js` in case of collisions
  const pathPieces = recipePath.split('/')

  // e.g. 'hello.world.js'
  const recipeFileName = pathPieces[pathPieces.length - 1]

  // Replace the file extension with `.sql`
  return recipeFileName.replace(/\.[^.]*$/, '.sql')
}

export type Config = {
  debug?: boolean
  recipesDir?: string
  outputDir?: string
  emptyOutputDir?: boolean
  outputPrefixStart?: string
  sqlDialect?: string
  extraRecipeContext?: () => object
  tableDefaults?: Record<string, () => object>
  tableStartIds?: Record<string, number>
}

/**
 * Retrieve a list of absolute paths to recipe files.
 */
export function getRecipeFilePaths (recipesDir: string): string[] {
  return glob.sync(`${recipesDir}/**/*.js`).map(foundRecipePath => resolve(foundRecipePath))
}

/**
 * Retrieve a list of files in the output directory that should be removed in order
 * to prevent stale data between generations.
 */
export function getOutputFilesToRemove (outputDir: string): string[] {
  const filesInOutputDir = readdirSync(outputDir)
  const ignorePatterns: string[] = ['.databakeryignore']

  if (filesInOutputDir.includes('.databakeryignore')) {
    const ignoreFileContents = readFileSync(`${outputDir}/.databakeryignore`).toString()
    ignorePatterns.push(...extractIgnorePatterns(ignoreFileContents))
  }

  return glob.sync('*', { ignore: ignorePatterns, cwd: outputDir, mark: true })
}

/**
 * Retrieve a list of glob patterns from a `.databakeryignore` file
 * to determine which files in the output directory should be kept.
 */
export function extractIgnorePatterns (rawIgnoreInput: string): string[] {
  const ignorePatterns: string[] = []
  rawIgnoreInput.split('\n').forEach(line => {
    // Skip empty lines
    if (line.trim() === '') {
      return
    }

    // Skip comments
    if (line.startsWith('#')) {
      return
    }

    ignorePatterns.push(line)
  })
  return ignorePatterns
}
