module.exports = {
  preset: 'ts-jest',
  roots: [
    'tests/unit',
  ],
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
  },
}
