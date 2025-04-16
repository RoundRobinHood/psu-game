import './App.css';
import { useRef, useState, useEffect } from "react";
import Vec2 from './Vec2';
import { Grid, Entities, TempDiagnostic, TempDiagnosticCanvas } from './SVGComponents.jsx';
import { ClientToSVGCoords, FullFreeze, SVGToGameCoords } from './math.js';
import { FarmIncome, FarmSpawning, GameOverCheck, HeatPoints, Temps } from './simulation.js';
import { Container, Shop } from './Overlay.jsx';
import { InitGameState } from './gameState.js';

// Game grid: sensors, farms etc
const rows = 10;
const columns = 10;

// Simulation grid: relative to game grid
// Each game grid cell gets split into resolution*resolution simulation cells
const simulationResolution = 10;
const targetFPS = 60;

function App() {
  const [gameState, setGameState] = useState(InitGameState(targetFPS));
  const [touchPos, setTouchPos] = useState(null);
  const [windowViewport, setWindowViewport] = useState(new Vec2(window.innerWidth, window.innerHeight));
  useEffect(() => {
    const handleResize = () => setWindowViewport(new Vec2(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  let svgViewport = new Vec2(1000, 1000);
  if(windowViewport.x > windowViewport.y) {
    svgViewport = svgViewport.Mult(windowViewport.x / windowViewport.y, 1)
  } else {
    svgViewport = svgViewport.Mult(1, windowViewport.y / windowViewport.x)
  }
  let svgGameAnchor = svgViewport.Mult(1/2).Sub(new Vec2(500, 500));

  const min = Math.min(windowViewport.x, windowViewport.y);
  const gameAnchor = windowViewport.Sub(new Vec2(min, min)).Mult(1/2);
  

  useEffect(() => {
    console.log(gameState.heatPoints);
  }, [gameState.heatPoints?.length]);
  useEffect(() => {
    console.log("Starting simulation loop")

    // Simulate and update game state
    const interval = setInterval(() => setGameState(prev => {
      // Deep clone prev

      /**
       * @typedef {import('./gameState.js').GameState} GameState
       */
      /** @type {GameState} */
      let next = {
        entities: [...prev.entities],
        wind: prev.wind,
        simOffset: prev.simOffset.Add(prev.wind),
        heatPoints: prev.heatPoints.map(x => {return {
          pos: x.pos,
          strength: x.strength,
          source: x.source,
          vel: x.vel,
        };}),
        nextHeatPoint: prev.nextHeatPoint,
        temp: prev.temp.map(row => [...row]),
        simulations: [...prev.simulations],
        coins: prev.coins,
        score: prev.score,
        action: prev.action,
        time: prev.time + 1,
      }

      // Initialize everything if not initialized
      if(prev.simulations.length == 0) {
        // next.simulations = [HeatFlow(), HeatDiffusion(0.001), FarmIncome(1 / targetFPS), FarmSpawning(targetFPS * 100, new Vec2(columns, rows)), HeatPoints()];
        next.simulations = [
          HeatPoints(),
          Temps([18, 24],
          new Vec2(1, 1).Mult(0.05)),
          FarmIncome(1 / targetFPS, 10 / targetFPS),
          FarmSpawning(targetFPS * 100, new Vec2(columns, rows)),
          GameOverCheck(targetFPS, simulationResolution)
        ];
      }

      const simulations = [...next.simulations];
      for(let sim of simulations) {
        // Fly trap for mutation bugs:
        FullFreeze(next);
        next = sim(next);
      }

      return next;
    }), 1000 / targetFPS)

    return () => {
      console.log("Performing cleanup")
      clearInterval(interval)
    }
  }, [])

  const svgRef = useRef(null);

  return (
    <>
      <div style={{ position: "absolute", width: "100%", height: "100%" }}>
        <svg
          style={{ position: "absolute", width: "100%", height: "100%", touchAction: "none" }}
          viewBox={`0 0 ${svgViewport.x} ${svgViewport.y}`}
          ref={svgRef}
          onTouchStart={e => {
            const touch = e.touches[0]

            // Calculate game coordinates
            const clientPos = new Vec2(touch.clientX, touch.clientY)
            const svgCoords = ClientToSVGCoords(clientPos, windowViewport, svgViewport)
            const gameCoords = SVGToGameCoords(svgCoords, svgViewport)

            setTouchPos(gameCoords);
          }}
          onTouchMove={e => {
            const touch = e.touches[0]

            // Calculate game coordinates
            const clientPos = new Vec2(touch.clientX, touch.clientY)
            const svgCoords = ClientToSVGCoords(clientPos, windowViewport, svgViewport)
            const gameCoords = SVGToGameCoords(svgCoords, svgViewport)

            setTouchPos(gameCoords);
          }}
          onTouchEnd={_ => {
            console.log(touchPos)
            const gameCoords = touchPos.Mult(columns, rows).Div(1000).Floor();
            if(gameState.action == "placeSensor") setGameState(prev => {
              if(prev.entities.some(x => x.pos.Equals(gameCoords) && x.type != 'controller')) {
                console.log("Position already occupied.");
                return prev;
              }
              return {...prev, entities: [...prev.entities, {
                type: 'sensor',
                pos: gameCoords,
              }], action: "none"};
            })
            if(gameState.action == "placeController") setGameState(prev => {
              if(prev.entities.some(x => x.pos.Equals(gameCoords) && x.type != 'sensor')) {
                console.log("Position already occupied.");
                return prev;
              }
              return {...prev, entities: [...prev.entities, {
                type: 'controller',
                pos: gameCoords,
              }], action: "none"};
            })
            if(gameState.action == "none") {
              if(gameState.entities.some(x => x.pos.Equals(gameCoords) && x.type == 'controller'))
                setGameState(prev => {
                  return {...prev, action: `inspectController ${gameCoords.x} ${gameCoords.y}`};
                });
            }
            setTouchPos(null);
          }}
          >
          <rect width={svgViewport.x} height={svgViewport.y} fill="lightblue"/>
          <g transform={`translate(${svgGameAnchor.x}, ${svgGameAnchor.y})`}>
            <rect width={1000} height={1000} fill='#9cc7d5' filter='url(#wavy)'/>
            <Grid stroke='black' fill='none' rows={10} columns={10} width={1000} height={1000}/>
            {/*<TempDiagnostic temps={gameState.temp} width={1000} height={1000} rows={rows * simulationResolution} columns={columns * simulationResolution}/>*/}
            <TempDiagnostic temps={gameState.temp} width={1000} height={1000} rows={rows * simulationResolution} columns={columns * simulationResolution} filter={(pos, _) => {
              const gameCoords = pos.Mult(1/simulationResolution).Floor()
              return gameState.entities.some(x => x.type == 'sensor' && x.pos.Equals(gameCoords));
            }}/>
            <Entities entities={gameState.entities} width={1000} height={1000} rows={rows} columns={columns}/>           
          </g>
        </svg>
        <TempDiagnosticCanvas temps={gameState.temp} rows={rows * simulationResolution} columns={columns*simulationResolution} colors={[{x:16,r:0,g:0,b:255},{x:21,r:0,g:255,b:0},{x:26,r:255,g:0,b:0}]} style={{position: 'absolute', width: `${min}px`, height: `${min}px`, left: `${gameAnchor.x}px`, top: `${gameAnchor.y}px`, pointerEvents: 'none' }} filter={(pos, _) => {
          const gameCoords = pos.Mult(1/simulationResolution).Floor();
          return !gameState.entities.some(x => x.pos.Equals(gameCoords));
        }}/>
        <Shop coins={gameState.coins} action={gameState.action} setGameState={setGameState} style={{ position: "absolute", right: 0, width: "200px" }} />
        <Container min={min} gameAnchor={gameAnchor}>
          {(() => {
            const split = gameState.action.split(' ');
            if(split[0] != 'inspectController') return;

            const coords = new Vec2(+split[1], +split[2]);
            const controller = gameState.entities.find(x => x.pos.Equals(coords) && x.type == 'controller');
            if(!controller) {
              console.error('ACTION WARNING: INSPECTING NON-EXISTING CONTROLLER AT: ', coords);
              setGameState((prev) => {return {...prev, action: 'none'}});
              return;
            }
            const heatPoint = gameState.heatPoints.find(x => x.pos.Div(simulationResolution).Floor().Equals(coords) && x.source == 'controller');
            const UIAnchor = coords.Add(new Vec2(0.5, 0.5)).Div(columns, rows).Mult(100);
            if(!heatPoint) {
              return (
                <button style={{left: `${UIAnchor.x}%`, top: `${UIAnchor.y}%`}} onClick={() => {
                  setGameState(prev => {
                    if(prev.heatPoints.some(x => x.pos.Div(simulationResolution).Floor().Equals(coords) && x.source == 'controller'))
                      return {...prev, action: "none"};

                    return {...prev, heatPoints: [...prev.heatPoints, {
                      vel: new Vec2(0, 0),
                      source: 'controller',
                      pos: coords.Add(new Vec2(0.5, 0.5)).Mult(simulationResolution),
                      strength: -10,
                    }], action: "none"};
                  });
                }}> Activate Temp control </button>
              );
            } else {
              return (
                <button style={{left: `${UIAnchor.x}%`, top: `${UIAnchor.y}%`}} onClick={() => {
                  setGameState(prev => {
                    return {
                      ...prev,
                      heatPoints: prev.heatPoints.filter(x => !x.pos.Div(simulationResolution).Floor().Equals(coords) || x.source != 'controller'),
                      action: "none",
                    };
                  });
                }}> Deactivate Temp control </button>
              );
            }
          })()}
        </Container>
      </div>
    </>
  )
}

export default App;
