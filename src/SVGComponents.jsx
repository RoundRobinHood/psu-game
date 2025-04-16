import { useEffect, useRef, useState } from "react";
import Vec2 from "./Vec2";
import { Lerp } from "./math.js";
import { Noise } from "noisejs";

export function Grid({rows, columns, width, height, ...pathProps}) {
  let d = '';
  for(let i = 0; i <= rows; i++) {
    const offset = i * height / rows;
    d += `M 0 ${offset} L ${width} ${offset}`;
  }
  d += ' ';
  for(let i = 0; i <= columns; i++) {
    const offset = i * width / columns;
    d += `M ${offset} 0 L ${offset} ${height}`
  }

  return (<path {...pathProps} d={d}/>);
}

export function TempDiagnostic({temps, width, height, rows, columns, colors=[{x: 16, r: 0, g: 0, b: 255}, {x: 21, r: 0, g: 255, b: 0}, {x: 26, r: 255, g: 0, b: 0}] , filter=null}) {
  return temps.map((row, i) => row.map((val, j) => {
    if(filter != null && !filter(new Vec2(j, i), val))
      return null;

    const color = {
      r: Lerp(val, colors.map(x => [x.x, x.r])),
      g: Lerp(val, colors.map(x => [x.x, x.g])),
      b: Lerp(val, colors.map(x => [x.x, x.b])),
    }

    const cell = new Vec2(width, height).Mult(1/columns, 1/rows);
    const pos  = cell.Mult(j,i);

    return <rect key={i*rows+j} transform={`translate(${pos.x}, ${pos.y})`} width={cell.x} height={cell.y}
      fill={`rgb(${color.r},${color.g},${color.b})`}/>
  }))
}

export function TempDiagnosticCanvas({ temps, rows, columns, colors, filter, style }) {
  const canvasRef = useRef(null);
  const lerpPoints = {
    r: colors.map(x => [x.x, x.r]),
    g: colors.map(x => [x.x, x.g]),
    b: colors.map(x => [x.x, x.b]),
  };

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    // Don't need to clear rect, because entire image's data is pushed every frame (including empty pixels)
    // ctx.clearRect(0, 0, columns, rows);

    const imageData = ctx.createImageData(columns, rows);
    const data = imageData.data;

    temps.forEach((row, i) => {
      row.forEach((val, j) => {
        if (filter && !filter(new Vec2(j, i), val)) return;

        const color = {
          r: Lerp(val, lerpPoints.r),
          g: Lerp(val, lerpPoints.g),
          b: Lerp(val, lerpPoints.b),
        };

        const idx = (i * columns + j) * 4;
        data[idx]   = color.r;
        data[idx+1] = color.g;
        data[idx+2] = color.b;
        data[idx+3] = 255;
      });
    });

    ctx.putImageData(imageData, 0, 0);
  }, [temps, rows, columns, colors, filter]);

  return <canvas ref={canvasRef} width={columns} height={rows} style={style} />;
}

export function Entities({entities, width, height, rows, columns}) {
  let defs = (
    <defs key={-1}>
      <symbol id='farm' viewBox='0 0 10 10'>
        <rect x={0.5} y={0.5} width={9} height={9} stroke='darkgreen' strokeWidth='1' fill='green'/>
      </symbol>
      <symbol id='sensor' viewBox='0 0 10 10'>
        <circle r={1} cx='5' cy='5' fill='gray' stroke='black' strokeWidth={0.5}/> 
      </symbol>
      <symbol id='controller' viewBox='0 0 10 10'>
        <circle r={1.4} cx='5' cy='5' fill='black' stroke='grey' strokeWidth={0.5}/>
      </symbol>
    </defs>
  );
  return [defs, ...(entities.map((entity, i) => {
    const cellDimensions = new Vec2(width/columns, height/rows)
    const translate = entity.pos.Mult(cellDimensions.x, cellDimensions.y)
    return (
      <use href={'#'+entity.type} key={i} transform={`translate(${translate.x},${translate.y})`} width={cellDimensions.x} height={cellDimensions.y}/>
    );
  }))];
}

export function WaterAnimation({simOffset, columns, rows, colors, sampleScale, style}) {
  const [noise, _] = useState(new Noise(Math.random()));
  const canvasRef = useRef(null);
  const lerpPoints = {
    r: colors.map(x => [x.x, x.r]),
    g: colors.map(x => [x.x, x.g]),
    b: colors.map(x => [x.x, x.b]),
  };

  useEffect(() => {
    
    const heights = [];
    for(let i = 0;i < rows; i++) {
      heights[i] = [];
      for(let j = 0;j < columns; j++) {
        const point = new Vec2(j, i);
        const coordinate = point.Sub(simOffset).Mult(sampleScale);
        heights[i][j] = (noise.perlin2(coordinate.x, coordinate.y) + 1) / 2;
      }
    }

    const ctx = canvasRef.current.getContext("2d");
    // Don't need to clear rect, because entire image's data is pushed every frame (including empty pixels)
    // ctx.clearRect(0, 0, columns, rows);

    const imageData = ctx.createImageData(columns, rows);
    const data = imageData.data;

    heights.forEach((row, i) => {
      row.forEach((val, j) => {

        val = 1 - val**2;
        const color = {
          r: Lerp(val, lerpPoints.r),
          g: Lerp(val, lerpPoints.g),
          b: Lerp(val, lerpPoints.b),
        };

        const idx = (i * columns + j) * 4;
        data[idx]   = color.r;
        data[idx+1] = color.g;
        data[idx+2] = color.b;
        data[idx+3] = 255;
      });
    });

    ctx.putImageData(imageData, 0, 0);
  }, [simOffset, columns, rows, colors, sampleScale, style]);

  return <canvas ref={canvasRef} width={columns} height={rows} style={style} />;
}
