import { Noise } from "noisejs";
import { Cycle, RayIntersectsBox } from "./math";
import Vec2 from "./Vec2";

export function GaussianDiffusion(strength, range=1) {
  return (prev) => {
    const next = {...prev, temp: []};
    const rows = prev.temp.length, columns = prev.temp[0].length;
    for(let i = 0; i < rows; i++) {
      next.temp[i] = [];
      for(let j = 0; j < columns; j++) {
        let sum = 0, divisor = 0;
        for(let di = -range; di <= range; di++) {
          for(let dj = -range; dj <= range; dj++) {
            let ni = Cycle(i+di, 0, rows - 1), nj = Cycle(j+dj, 0, columns - 1)
            if(di==0 && dj==0) sum += prev.temp[ni][nj], divisor++;
            else sum += prev.temp[ni][nj] * strength, divisor += strength;
          }
        }
        next.temp[i][j] = sum / divisor;
      }
    }

    return next;
  }
}

export function FarmIncome(rate) {
  return (prev) => {
    const farms = prev.entities.filter(e => e.type == 'farm')
    return {...prev, points: prev.points + farms.length * rate};
  }
}

// A farm spawns every `period` frames
export function FarmSpawning(period, gameDimensions) {
  return (prev) => {
    if(prev.time % period == 0) {
      console.log("Spawning a farm");
      const possibleCoords = [];
      for(let x = 0; x < gameDimensions.x; x++) {
        for(let y = 0; y < gameDimensions.y; y++) {
          const point = new Vec2(x, y);
          if(point.x == 0 || point.x == gameDimensions.x - 1)
            continue;
          if(point.y == 0 || point.y == gameDimensions.y - 1)
            continue;
          if(!prev.entities.some(e => e.pos.Equals(point))) {
            possibleCoords.push(point);
          }
        }
      }
      const middle = gameDimensions.Mult(1/2);
      possibleCoords.sort((a, b) => a.Sub(middle).SqrLength() - b.Sub(middle).SqrLength()); 
      let total = 0, weights = [];
      possibleCoords.forEach((_, i) => {
        let p = Math.exp(-i);
        total += p, weights.push(p);
      });
      let acc = 0, rand = Math.random()*total;
      let selected = 0;
      for(; selected < possibleCoords.length && acc <= rand; selected++)
        acc += weights[selected];
      const point = possibleCoords[selected]
      return {
        ...prev,
        entities: [...prev.entities, {
          type: 'farm',
          pos: point,
        }],
      }
    }
    return prev;
  }
}

export function HeatPoints(frequency = 1/360, simDimensions = new Vec2(100, 100), maxStrength = 10, minEffect = 0.001, decayRate = 0.2) {
  return (prev) => {
    let newHeatPoints = prev.heatPoints.filter(x => {
      const effectiveRadius = -Math.log(minEffect / x.strength) / decayRate;
      const boxMin = new Vec2(0, 0), boxMax = simDimensions;
      const perd = new Vec2(-prev.wind.y, prev.wind.x).Mult(effectiveRadius);
      return RayIntersectsBox(x.pos.Sub(prev.wind.Mult(effectiveRadius)), prev.wind, boxMin, boxMax) ||
             RayIntersectsBox(x.pos.Add(perd), prev.wind, boxMin, boxMax) ||
             RayIntersectsBox(x.pos.Sub(perd), prev.wind, boxMin, boxMax);
    }).map(x => {
      return {
        pos: x.pos.Add(prev.wind),
        strength: x.strength,
        radius: x.radius,
      };
    });
    let nextHeatPoint = prev.nextHeatPoint;
    if(prev.time >= prev.nextHeatPoint) {
      nextHeatPoint = prev.time + Math.floor(-Math.log(Math.random()) / frequency);
      let spawnPosition = simDimensions.Random().Sub(prev.wind.Div(frequency))
      while((spawnPosition.x > 0 && spawnPosition.x < simDimensions.x) && (spawnPosition.y > 0 && spawnPosition.y < simDimensions.y))
        spawnPosition.Sub(prev.wind);
      const heatPoint = {
        pos: spawnPosition,
        strength: Math.random()*maxStrength,
      };
      newHeatPoints.push(heatPoint);
      console.log("Heatpoint spawned: ", heatPoint);
      console.log("Current heatpoints: ", newHeatPoints);
    }
    return {...prev, heatPoints: newHeatPoints, nextHeatPoint};
  }
}

export function Temps(baseBounds = [18,24], sampleScale = new Vec2(1,1), simDimensions = new Vec2(100, 100), decayRate = 0.2) {
  const noise = new Noise(Math.random());
  return (prev) => {
    const newTemps = [];
    for(let i = 0;i < simDimensions.y; i++) {
      newTemps[i] = [];
      for(let j = 0;j < simDimensions.x; j++) {
        const point = new Vec2(j, i);
        const coordinate = point.Sub(prev.simOffset).Mult(sampleScale);
        const perlin = (noise.perlin2(coordinate.x, coordinate.y) + 1) / 2;
        newTemps[i][j] = baseBounds[0] + perlin * (baseBounds[1] - baseBounds[0]);
        prev.heatPoints.forEach(x => {
          newTemps[i][j] += x.strength * Math.exp(-x.pos.Sub(point).Length() * decayRate);
        });
      }
    }
    return {...prev, temp: newTemps};
  }
}
