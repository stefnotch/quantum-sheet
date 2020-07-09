export interface Vec2 {
  x: number;
  y: number;
}

export function useVector2() {
  function clone(a: Vec2) {
    return { x: a.x, y: a.y };
  }

  function compare(a: Vec2, b: Vec2) {
    if (a.y == b.y) return b.x - a.x;
    return b.y - a.y;
  }

  return {
    compare,
    clone,
  };
}
