import './App.css';
import { useRef, useState, useEffect } from "react";
import Vec2 from './Vec2';
import { Grid, Entities, TempDiagnostic, TempDiagnosticCanvas } from './SVGComponents.jsx';
import { ClientToSVGCoords, FullFreeze, SVGToGameCoords } from './math.js';
import { FarmIncome, FarmSpawning, HeatPoints, Temps } from './simulation.js';
import { Shop } from './Overlay.jsx';

// Game grid: sensors, farms etc
const rows = 10;
const columns = 10;

// Simulation grid: relative to game grid
// Each game grid cell gets split into resolution*resolution simulation cells
const simulationResolution = 10;
const targetFPS = 60;

function App() {
  const [gameState, setGameState] = useState({
    entities: [],
    wind: new Vec2(10/targetFPS, 0).Rotate(Math.random() * 2 * Math.PI),
    simOffset: new Vec2(0, 0),
    heatPoints: [],
    arbit: [0, 0],
    nextHeatPoint: Math.floor(-Math.log(Math.random()) * 30 * targetFPS),
    temp: [],
    simulations: [],
    points: 10,
    action: "none",
    time: -1,
  });
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
  }, [gameState.heatPoints.length]);
  useEffect(() => {
    console.log("Starting simulation loop")

    // Simulate and update game state
    const interval = setInterval(() => setGameState(prev => {
      // Deep clone prev
      let next = {
        entities: [...prev.entities],
        wind: prev.wind,
        simOffset: prev.simOffset.Add(prev.wind),
        heatPoints: prev.heatPoints.map(x => {return {
          pos: x.pos,
          strength: x.strength,
          radius: x.radius,
        };}),
        arbit: prev.arbit,
        nextHeatPoint: prev.nextHeatPoint,
        temp: prev.temp.map(row => [...row]),
        simulations: [...prev.simulations],
        points: prev.points,
        action: prev.action,
        time: prev.time + 1,
      }

      // Initialize everything if not initialized
      if(prev.simulations.length == 0) {
        // next.simulations = [HeatFlow(), HeatDiffusion(0.001), FarmIncome(1 / targetFPS), FarmSpawning(targetFPS * 100, new Vec2(columns, rows)), HeatPoints()];
        next.simulations = [HeatPoints(), Temps([18, 24], new Vec2(1, 1).Mult(0.05)), FarmIncome(1 / targetFPS), FarmSpawning(targetFPS * 100, new Vec2(columns, rows))];
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
            if(gameState.action == "placeSensor") setGameState(prev => {
              let gameCoords = touchPos.Mult(columns/1000, rows/1000);
              gameCoords = new Vec2(Math.floor(gameCoords.x), Math.floor(gameCoords.y));
              if(prev.entities.some(x => x.pos.x == gameCoords.x && x.pos.y == gameCoords.y)) {
                console.log("Position already occupied.");
                return prev;
              }
              return {...prev, entities: [...prev.entities, {
                type: 'sensor',
                pos: gameCoords,
              }], action: "none"};
            })
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
        <TempDiagnosticCanvas temps={gameState.temp} rows={rows * simulationResolution} columns={columns*simulationResolution} colors={[{x:16,r:0,g:0,b:255},{x:21,r:0,g:255,b:0},{x:26,r:255,g:0,b:0}]} style={{position: 'absolute', width: `${min}px`, height: `${min}px`, left: `${gameAnchor.x}px`, top: `${gameAnchor.y}px`}} filter={(pos, _) => {
          const gameCoords = pos.Mult(1/simulationResolution).Floor();
          return !gameState.entities.some(x => x.pos.Equals(gameCoords));
        }}/>
        <Shop points={gameState.points} action={gameState.action} setGameState={setGameState} style={{ position: "absolute", right: 0, width: "200px" }} />
      </div>
    </>
  )
}

export default App;
