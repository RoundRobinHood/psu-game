class Mat2 {
  // Takes in 2 basis vectors, i hat and j hat
  constructor(i1, j1, i2=null, j2=null) {
    if(i1 instanceof Vec2) {
      this.i = i1;
      this.top = new Vec2(i1.x, j1.x);
      this.j = j1;
      this.bottom = new Vec2(i1.y, j1.y);
    } else {
      this.i = new Vec2(j1, i1);
      this.top = new Vec2(j1, j2);
      this.j = new Vec2(j2, i2);
      this.bottom = new Vec2(i1, i2);
    }
    Object.freeze(this);
  }

  Transform(vec) {
    return new Vec2(this.top.Dot(vec), this.bottom.Dot(vec));
  }
}

class Vec2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    Object.freeze(this); // 💎 Make this object immutable
  }

  SqrLength() {
    return this.x*this.x + this.y*this.y;
  }

  Length() {
    return Math.sqrt(this.SqrLength());
  }

  Mult(x, y=null) {
    if(x instanceof Vec2) {
      return new Vec2(this.x * x.x, this.y * x.y);
    }
    if(y == null) {
      return new Vec2(this.x*x, this.y*x)
    } else {
      return new Vec2(this.x*x, this.y*y);
    }
  }

  Dot(other) {
    return this.x*other.x + this.y*other.y;
  }

  Div(x, y=null) {
    if(x instanceof Vec2) {
      return new Vec2(this.x / x.x, this.y / x.y);
    }
    if(y == null) {
      return new Vec2(this.x/x, this.y/x);
    } else {
      return new Vec2(this.x/x, this.y/y);
    }
  }

  Normalize() {
    const len = this.Length();
    return len === 0 ? new Vec2(0, 0) : this.Mult(1 / len);
  }

  Add(other) {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  Sub(other) {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  toString() {
    return `Vec2(${this.x}, ${this.y})`;
  }

  Floor() {
    return new Vec2(Math.floor(this.x), Math.floor(this.y))
  }

  Equals(other, epsilon = 1e-9) {
    return Math.abs(this.x - other.x) < epsilon && Math.abs(this.y - other.y) < epsilon;
  }

  Random() {
    return this.Mult(Math.random(), Math.random());
  }

  // Rotate `angle` radians counterclockwise
  Rotate(angle) {
    /*
     * Left mult with Matrix:
     * [cos(t) -sin(t)] [x] 
     * [sin(t)  cos(t)] [y]
     * */
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const rotMat = new Mat2(new Vec2(cos, sin), new Vec2(-sin, cos));
    return rotMat.Transform(this);
  }
}

export default Vec2
