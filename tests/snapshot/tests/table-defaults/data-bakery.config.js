module.exports = () => ({
  recipesDir: 'recipes',
  sqlDialect: 'mysql',
  outputDir: 'actual-output',
  emptyOutputDir: true,
  outputPrefixStart: '10',
  tableDefaults: {
    user: () => ({
      extra1: 'column-value-here',
      extra2: 9999,
    }),
  },
  tableStartIds: {
    user: 450,
  },
})
