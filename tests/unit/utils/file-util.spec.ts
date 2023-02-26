import { extractIgnorePatterns } from '../../../src/utils/file-util'

describe('file-util', () => {
  describe('extractIgnorePatterns', () => {
    it('ignores empty lines', () => {
      const result = extractIgnorePatterns(`
file1
file2

file3
`)

      const expectedResult = [
        'file1',
        'file2',
        'file3',
      ]

      expect(result.length).toEqual(3)
      expect(result).toEqual(expectedResult)
    })

    it('ignores comment lines', () => {
      const result = extractIgnorePatterns(`
# hello
path/**/*.txt
some-file

# another comment
another-file
`)

      const expectedResult = [
        'path/**/*.txt',
        'some-file',
        'another-file',
      ]

      expect(result.length).toEqual(3)
      expect(result).toEqual(expectedResult)
    })
  })
})
