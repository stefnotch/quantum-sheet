/**
 * A simple readonly Vector2
 */
export class Vector2 {
  readonly x: number;
  readonly y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static get zero(): Vector2 {
    return new Vector2(0, 0);
  }

  get length() {
    return Math.hypot(this.x, this.y);
  }

  static clone(other: Vector2): Vector2 {
    return new Vector2(other.x, other.y);
  }

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  /**
   * For sorting in an array
   */
  compareTo(other: Vector2) {
    if (this.y == other.y) return this.x - other.x;
    return this.y - other.y;
  }
}
