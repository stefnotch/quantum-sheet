// Taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
export default {
  /**
   * Combines two sets
   */
  union: function <T>(setA: Set<T>, setB: Iterable<T>) {
    let _union = new Set(setA)
    for (let elem of setB) {
      _union.add(elem)
    }
    return _union
  },

  /**
   * Only the elements that are in both sets
   */
  intersection: function <T>(setA: Set<T>, setB: Iterable<T>) {
    let _intersection = new Set()
    for (let elem of setB) {
      if (setA.has(elem)) {
        _intersection.add(elem)
      }
    }
    return _intersection
  },

  /**
   * A - B
   */
  minus: function <T>(setA: Set<T>, setB: Iterable<T>) {
    const difference = new Set(setA)
    for (let elem of setB) {
      difference.delete(elem)
    }
    return difference
  },
}
