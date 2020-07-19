/**
 * Finds the position where a new element should be inserted
 * @param array Target array
 * @param compareFunction Comparison function
 */
export function getBinaryInsertIndex<T>(
  array: T[],
  compareFunction: (arrayElement: T) => number
) {
  // https://stackoverflow.com/a/29018745
  let low = 0;
  let high = array.length - 1;
  while (low <= high) {
    let middle = low + Math.floor((high - low) / 2);
    let comparison = compareFunction(array[middle]);
    if (comparison > 0) {
      low = middle + 1;
    } else if (comparison < 0) {
      high = middle - 1;
    } else {
      return middle;
    }
  }

  return -low - 1;
}
