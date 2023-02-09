/**
 * Split an array into chunks with up to chunkSize items.
 */
export function chunkArray (inputArray: any[], chunkSize: number): any[] {
  const chunkedArray: any[] = []

  for (let i = 0; i < inputArray.length; i += chunkSize) {
    const newChunk = inputArray.slice(i, i + chunkSize)
    chunkedArray.push(newChunk)
  }

  return chunkedArray
}
