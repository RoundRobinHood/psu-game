
export function Shop({ costs = {sensor: 20, controller: 40}, coins = 0, action="none", setGameState, ...divProps }) {
  return (
    <div {...divProps}>
      <br/>
      <p><b>Shop ({coins.toFixed(2)} coins) </b></p>
      <button onClick={() => setGameState(prev => {
        return {...prev, coins: prev.coins - costs.sensor, action: "placeSensor"};
      })} disabled={coins < costs.sensor || action != "none"}> Buy sensor (cost: {costs.sensor}) </button>
      <button onClick={() => setGameState(prev => {
        return {...prev, coins: prev.coins - costs.controller, action: "placeController"};
      })} disabled={coins < costs.controller || action != "none"}> Buy controller (cost: {costs.controller}) </button>
    </div>
  );
}

/** Creates a `<div>` stretching across the game screen, so that absolute children can position themselves with left and top percentages. */
export function Container({ children, min, gameAnchor, ...divProps }) {
  return (
    <div 
      className="normContainer"
      {...divProps}
      style={{
        position: 'absolute',
        width: `${min}px`,
        height: `${min}px`,
        left: `${gameAnchor.x}px`,
        top: `${gameAnchor.y}px`,
        pointerEvents: 'none',
        ...(divProps.style ?? {})
      }}>
    {children}
  </div>);
}

export function ControllerOverlay({ gameCoords, gameState, setGameState, gameDimensions }) {
  
}
