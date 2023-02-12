import glob from 'glob'
import { resolve } from 'path'

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
  config?: string
  metadataOutput?: string
  outputFile?: string
  outputDir?: string
  exportPrefixStart?: string
}

/**
 * Retrieve a list of absolute paths to recipe files.
 */
export function getRecipeFilePaths (recipesDir: string): string[] {
  return glob.sync(`${recipesDir}/**/*.js`).map(foundRecipePath => resolve(foundRecipePath))
}
