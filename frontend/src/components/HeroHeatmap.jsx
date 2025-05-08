import React from "react";
import { scaleLinear } from "d3-scale";
import { interpolateRdYlGn } from "d3-scale-chromatic";

const ZIP_TO_NEIGHBORHOOD = {
  "50309": "Downtown",
  "50310": "Beaverdale",
  "50311": "Drake",
  "50312": "Sherman Hill",
  "50313": "Highland Park",
  "50314": "River Bend",
  "50315": "South Side",
  "50316": "Capitol East",
  "50317": "East Des Moines",
  "50320": "SE Des Moines",
  "50321": "Airport/SW",
  "50322": "Urbandale (DSM)",
  "50327": "Pleasant Hill",
  "50265": "Valley Junction",
  "50266": "Jordan Creek",
  "50023": "Northwest Ankeny",
  "50009": "Altoona",
  "50263": "Waukee",
  "50325": "Clive",
  "50131": "Johnston",
  "50211": "Norwalk",
  "50111": "Grimes",
};

// TEMPORARY placeholder data → replace with fetchedData from API
const placeholderDeltas = {
  "Downtown": 2.5,
  "South Side": -1.8,
  "Sherman Hill": 0,
  "Beaverdale": -0.5,
  "SE Des Moines": 3.1,
  "Ingersoll": -4.2,
  "Merle Hay": -0.9,
  "East Village": 0.8,
  "Drake": 2.9,
};

const colorScale = scaleLinear()
  .domain([-5, 0, 5]) // map -5% → 0% → +5%
  .range([0, 0.5, 1])
  .clamp(true);

export default function HeroHeatmap({ data = placeholderDeltas }) {
  const neighborhoods = Object.values(ZIP_TO_NEIGHBORHOOD);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 p-2">
      {neighborhoods.map((name, idx) => {
        const delta = data[name] ?? 0; // fallback to 0 if missing
        const color = interpolateRdYlGn(colorScale(delta));
        return (
          <div
            key={idx}
            className="rounded text-white text-center flex flex-col items-center justify-center shadow"
            style={{
              backgroundColor: color,
              aspectRatio: "1 / 1",
              minHeight: "80px",
            }}
          >
            <div className="text-xs">{name}</div>
            <div className="text-sm font-bold">{delta >= 0 ? `+${delta}%` : `${delta}%`}</div>
          </div>
        );
      })}
    </div>
  );
}
