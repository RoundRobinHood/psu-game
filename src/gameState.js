import Vec2 from "./Vec2";

/**
 * @typedef {Object} Entity
 * @property {Vec2} pos
 * @property {string} type
 */

/**
 * @typedef {Object} HeatPoint
 * @property {Vec2} pos
 * @property {number} strength
 * @property {string} source
 * @property {Vec2} velocity
 */

/**
 * @callback Simulation
 * @param {GameState} prev
 * @returns {GameState}
 */

/**
 * @typedef {Object} GameState
 * @property {Entity[]} entities
 * @property {Vec2} wind
 * @property {Vec2} simOffset
 * @property {HeatPoint[]} heatPoints
 * @property {number} nextHeatPoint
 * @property {number[][]} temp
 * @property {Simulation[]} simulations
 * @property {number} coins
 * @property {number} score
 * @property {string} action
 * @property {number} time
 * @property {Object} overlayState
 */

/**
 * Initialize a game state
 * @param {number} targetFPS
 * @returns {GameState}
 */
export function InitGameState(targetFPS) {
  return {
    entities: [],
    wind: new Vec2(10/targetFPS, 0).Rotate(Math.random() * 2 * Math.PI),
    simOffset: new Vec2(0, 0),
    heatPoints: [],
    nextHeatPoint: Math.floor(-Math.log(Math.random()) * 30 * targetFPS),
    temp: [],
    simulations: [],
    coins: 50,
    score: 0,
    action: "none",
    time: -1,
    overlayState: {},
  };
}
