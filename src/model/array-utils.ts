export default {
  /**
   * Finds the position where a new element should be inserted
   * @param array Target array
   * @param compareFunction Comparison function, should compare arrayElement to the new value
   */
  getBinaryInsertIndex: function <T>(
    array: T[],
    compareFunction: (arrayElement: T) => number
  ): { index: number; itemExists: boolean } {
    // https://stackoverflow.com/a/29018745
    let low = 0;
    let high = array.length - 1;
    while (low <= high) {
      let middle = low + Math.floor((high - low) / 2);
      let comparison = compareFunction(array[middle]);
      if (comparison < 0) {
        low = middle + 1;
      } else if (comparison > 0) {
        high = middle - 1;
      } else {
        return { index: middle, itemExists: true };
      }
    }

    return { index: low, itemExists: false };
  },

  /**
   * Gets an element or undefined if the element does not exist
   */
  getElementOrUndefined: function <T>(array: T[], index: number) {
    return index >= 0 && index < array.length ? array[index] : undefined;
  },

  /**
   * Removes an element from an array
   */
  remove: function <T>(array: T[], element: T) {
    const index = array.indexOf(element);
    if (index >= 0) {
      array.splice(index, 1);
      return true;
    } else {
      return false;
    }
  },
};
