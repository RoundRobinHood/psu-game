import { Noise } from 'noisejs';
import Vec2 from './Vec2';

export function BiLerp(grid, i, j) {
  let i0 = Math.floor(i)
  let i1 = Math.min(i0+1, grid.length-1)
  let j0 = Math.floor(j)
  let j1 = Math.min(j0+1, grid[0].length-1)

  let di = i - i0
  let dj = j - j0

  let top = grid[i0][j0] * (1 - dj) + grid[i0][j1] * dj
  let bottom = grid[i1][j0] * (1 - di) + grid[i1][j1] * dj

  return top * (1 - di) + bottom * di
}

export function Cycle(val, min, max) {
  return (val + max - min) % (max - min) + min;
}

const noise = new Noise(Math.random());
export function GetCurl(x, y, eps = 0.0001) {
  const dx = (noise.perlin2(x + eps, y) - noise.perlin2(x - eps, y)) / (2 * eps);
  const dy = (noise.perlin2(x, y + eps) - noise.perlin2(x, y - eps)) / (2 * eps);
  return new Vec2(dx, dy);
}

export function ClientToSVGCoords(clientPos, windowViewport, svgViewbox) {
  return clientPos.Mult(svgViewbox.x/windowViewport.x, svgViewbox.y/windowViewport.y)
}

export function SVGToGameCoords(svgCoords,  svgViewbox) {
  const gameAnchor = svgViewbox.Mult(1/2).Sub(new Vec2(500, 500));
  return svgCoords.Sub(gameAnchor)
}

// Points: array of [min, val]
export function Lerp(num, points) {
  for(let i = 0;i < points.length; i++) {
    if(points[i][0] == num) {
      return points[i][1];
    }
    if(points[i][0] > num) {
      if(i == 0)
        return points[i][1];
      const progress = (num - points[i-1][0]) / (points[i][0] - points[i-1][0]);
      return points[i-1][1] + (points[i][1] - points[i-1][1]) * progress;
    }
  }
  return points[points.length-1][1]
}

export function FullFreeze(object) {
  Object.freeze(object);
  for(let key in object) {
    const val = object[key];
    if(val instanceof Array || val instanceof Object)
      FullFreeze(val);
  }
}

export function RayIntersectsBox(Origin, Direction, BoxMin, BoxMax) {
  if((Direction.x == 0 && (Origin.x > BoxMax.x || Origin.x < BoxMin.x)) || (Direction.y == 0 && (Origin.y > BoxMax.y || Origin.y < BoxMin.y)))
    return false;

  let t1 = BoxMin.Sub(Origin).Div(Direction);
  let t2 = BoxMax.Sub(Origin).Div(Direction);

  [t1, t2] = [new Vec2(Math.min(t1.x, t2.x), Math.min(t1.y, t2.y)), new Vec2(Math.max(t1.x, t2.x), Math.max(t1.y, t2.y))];

  return Math.min(t2.x, t2.y) >= Math.max(Math.min(t1.x, t1.y), 0);
}
