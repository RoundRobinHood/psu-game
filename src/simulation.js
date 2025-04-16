import { Noise } from "noisejs";
import { ApplyHeatpoints, Cycle, GetEffectiveRadius, RayIntersectsBox } from "./math";
import Vec2 from "./Vec2";
import { InitGameState } from "./gameState";

/**
 *  @typedef {import('./gameState')} GameStateModule
 *  @typedef {GameStateModule.GameState} GameState
 *  @typedef {GameStateModule.Simulation} Simulation
 */

/** @returns {Simulation} */
export function GaussianDiffusion(strength, range=1) {
  /** @param {GameState} prev */
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

/** @returns {Simulation} */
export function FarmIncome(coinRate, scoreRate) {
  /** @param {GameState} prev */
  return (prev) => {
    const farms = prev.entities.filter(e => e.type == 'farm')
    return {
      ...prev,
      coins: prev.coins + farms.length * coinRate,
      score: prev.score + farms.length * scoreRate,
    };
  }
}

// A farm spawns every `period` frames
/** @returns {Simulation} */
export function FarmSpawning(period, gameDimensions) {
  /** @param {GameState} prev */
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
        entities: [...prev.entities.filter(x => x.type != 'sensor'), {
          type: 'farm',
          pos: point,
        }],
      }
    }
    return prev;
  }
}

/** @returns {Simulation} */
export function HeatPoints(frequency = 1/360, simDimensions = new Vec2(100, 100), maxStrength = 10, minEffect = 0.001, decayRate = 0.2) {
  /** @param {GameState} prev */
  return (prev) => {
    let newHeatPoints = prev.heatPoints.filter(x => {
      if(x.source == 'controller') return true;

      const effectiveRadius = -Math.log(minEffect / x.strength) / decayRate;
      const boxMin = new Vec2(0, 0), boxMax = simDimensions;
      const perd = new Vec2(-x.vel.y, x.vel.x).Mult(effectiveRadius);
      return RayIntersectsBox(x.pos.Sub(x.vel.Mult(effectiveRadius)), x.vel, boxMin, boxMax) ||
             RayIntersectsBox(x.pos.Add(perd), x.vel, boxMin, boxMax) ||
             RayIntersectsBox(x.pos.Sub(perd), x.vel, boxMin, boxMax);
    }).map(x => {
      return {
        pos: x.pos.Add(x.vel),
        strength: x.strength,
        source: x.source,
        vel: x.vel,
      };
    });

    let nextHeatPoint = prev.nextHeatPoint;
    if(prev.time >= prev.nextHeatPoint) {
      nextHeatPoint = prev.time + Math.floor(-Math.log(Math.random()) / frequency);
      let spawnPosition = simDimensions.Random().Sub(prev.wind.Div(frequency))
      while((spawnPosition.x > 0 && spawnPosition.x < simDimensions.x) && (spawnPosition.y > 0 && spawnPosition.y < simDimensions.y))
        spawnPosition = spawnPosition.Sub(prev.wind);
      const heatPoint = {
        vel: prev.wind,
        source: 'random',
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

/** @returns {Simulation} */
export function Temps(baseBounds = [18,24], sampleScale = new Vec2(1,1), simDimensions = new Vec2(100, 100), minEffect=0.001, decayRate = 0.2) {
  const noise = new Noise(Math.random());
  /** @param {GameState} prev */
  return (prev) => {
    const newTemps = [];
    for(let i = 0;i < simDimensions.y; i++) {
      newTemps[i] = [];
      for(let j = 0;j < simDimensions.x; j++) {
        const point = new Vec2(j, i);
        const coordinate = point.Sub(prev.simOffset).Mult(sampleScale);
        const perlin = (noise.perlin2(coordinate.x, coordinate.y) + 1) / 2;
        newTemps[i][j] = baseBounds[0] + perlin * (baseBounds[1] - baseBounds[0]);
        newTemps[i][j] = ApplyHeatpoints(
          prev.heatPoints.filter(x => 
            GetEffectiveRadius(x, minEffect, decayRate)**2 >= x.pos.Sub(point).SqrLength()
          ), point, newTemps[i][j], decayRate);
      }
    }
    return {...prev, temp: newTemps};
  }
}

/** @returns {Simulation} */
export function GameOverCheck(targetFPS, simResolution = 10) {
  /** @param {GameState} prev */
  return (prev) => {
    for(let i = 0;i < prev.temp.length; i++) {
      for(let j = 0;j < prev.temp[i].length; j++) {
        const val = prev.temp[i][j];
        if(val >= 18 && val <= 24) {
          continue;
        }
        const gameCoords = new Vec2(j, i).Div(simResolution).Floor();
        if(prev.entities.some(x => x.pos.Equals(gameCoords) && x.type == 'farm'))
        {
          alert(`Game over. Temperature is ${val} degrees on the farm at ${j}, ${i}`);
          return InitGameState(targetFPS);
        }
      }
    }
    return prev;
  };
}
