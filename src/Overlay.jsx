
export function Shop({ costs = {sensor: 20}, points = 0, action="none", setGameState, ...divProps }) {
  return (
    <div {...divProps}>
      <p style={{ position: "absolute", left: "10%", top: "6px" }}><b>Shop ({points.toFixed(2)} points) </b></p>
      <button style={{ position: "absolute", left: "10%", top: "35px" }} onClick={() => setGameState(prev => {
        return {...prev, points: prev.points - costs.sensor, action: "placeSensor"};
      })} disabled={points < costs.sensor || action != "none"}> Buy sensor (cost: {costs.sensor}) </button>
    </div>
  );
}
