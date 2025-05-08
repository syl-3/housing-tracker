import React, { useState, useEffect } from "react";
import UnitTypeTrendChart from "../components/UnitTypeTrendChart";
import VolatilityBarChart from "../components/VolatilityBarChart";

export default function Insights() {
  const [avgVolatility, setAvgVolatility] = useState(null);
  const [fastestMarket, setFastestMarket] = useState("");
  const [medianLifespan, setMedianLifespan] = useState(null);
  const [maxPriceDrop, setMaxPriceDrop] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/avg-volatility")
      .then(res => res.json())
      .then(data => setAvgVolatility(data.avg_volatility?.toFixed(1)));

    fetch("http://localhost:5000/api/fastest-market")
      .then(res => res.json())
      .then(data => setFastestMarket(data.neighborhood));

    fetch("http://localhost:5000/api/median-lifespan")
      .then(res => res.json())
      .then(data => setMedianLifespan(data.median_days?.toFixed(1)));

    fetch("http://localhost:5000/api/max-price-drop")
      .then(res => res.json())
      .then(data => setMaxPriceDrop(data.max_drop));
  }, []);




  return (
    <div className="flex flex-col gap-4">
      {/* ✅ NUGGETS ROW */}
      <div className="flex flex-col md:flex-row gap-4">
  <div className="flex-1 bg-white shadow rounded p-4 text-center">
    <h3 className="text-xs font-medium text-zinc-600 mb-1 uppercase tracking-wide">Price Variability This Week</h3>
    <p className="text-2xl font-bold text-zinc-900">{avgVolatility !== null ? `$${avgVolatility}` : "--"}</p>
  </div>
  <div className="flex-1 bg-white shadow rounded p-4 text-center">
    <h3 className="text-xs font-medium text-zinc-600 mb-1 uppercase tracking-wide">Quickest Turnover This Week</h3>
    <p className="text-2xl font-bold text-zinc-900">{fastestMarket || "--"}</p>
  </div>
  <div className="flex-1 bg-white shadow rounded p-4 text-center">
    <h3 className="text-xs font-medium text-zinc-600 mb-1 uppercase tracking-wide">Median Listing Lifespan This Week</h3>
    <p className="text-2xl font-bold text-zinc-900">
      {medianLifespan !== null ? Math.round(medianLifespan) : "--"} days</p>
  </div>
  <div className="flex-1 bg-white shadow rounded p-4 text-center">
    <h3 className="text-xs font-medium text-zinc-600 mb-1 uppercase tracking-wide">Max Price Drop This Week</h3>
    <p className="text-2xl font-bold text-zinc-900">{maxPriceDrop !== null ? `$${Math.abs(maxPriceDrop)}` : "--"}</p>
  </div>
</div>


      {/* ✅ SUPPORT CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white shadow rounded p-4 flex flex-col h-[400px]">
          <h2 className="text-sm font-semibold text-zinc-700 mb-2">Unit Type Trendlines (Average Rent)</h2>
          <div className="w-full flex-1">
  <UnitTypeTrendChart />
</div>
        </div>
        <div className="bg-white shadow rounded p-4 flex flex-col h-[400px]">
          <h2 className="text-sm font-semibold text-zinc-700 mb-2">Volatility Tracker</h2>
          <div className="w-full flex-1">
            <VolatilityBarChart />
          </div>
        </div>

      </div>
    </div>
  );
}
