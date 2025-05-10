import { useEffect, useState } from "react";
import PriceTrendChart from "../components/PriceTrendChart";
import NeighborhoodBarChart from "../components/NeighborhoodBarChart";
import MoversTodayTable from "../components/MoversToday";
import UnitMixPieChart from "../components/UnitMixPieChart";
import PriceDistributionChart from "../components/PriceDistributionChart";
export default function Dashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetch("/api/summary-stats")
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch((err) => console.error("API error:", err));
  }, []);

return (
  
  <div className="space-y-6 ">
    

    {/* Summary + Movers Grid */}
    {summary ? (
      <div className="flex flex-col lg:flex-row gap-4">

        {/* Snapshot Card */}
        <div className="w-full lg:w-1/4 bg-white rounded-lg shadow p-4 text-sm space-y-1">
          <h3 className="text-lg font-semibold mb-3">Today’s Snapshot</h3>
          <p><strong>Date:</strong> {summary.scrape_date}</p>
          <p>
            <strong>Median Rent:</strong> ${summary.median_price}
            {summary.price_change !== null && (
              <span className={summary.price_change > 0 ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                ({summary.price_change > 0 ? "+" : ""}{summary.price_change})
              </span>
            )}
          </p>
          <p><strong>Active Listings:</strong> {summary.listing_count}</p>
          <p><strong>New Today:</strong> {summary.new_listing_count}</p>
          <p><strong>Unit Mix:</strong> {summary.studio_count} Studios, {summary.one_bed_count} 1B, {summary.two_plus_bed_count} 2B+</p>
        </div>

        {/* Pie Chart Card */}
  <div className="w-full lg:w-1/4 bg-white rounded-lg shadow p-4 text-sm">
    <h3 className="text-lg font-semibold mb-3">Unit Mix Breakdown</h3>
    <UnitMixPieChart
      studios={summary.studio_count}
      oneBR={summary.one_bed_count}
      twoPlus={summary.two_plus_bed_count}
    />
  </div>

        {/* Movers Card */}
        <div className=" w-full lg:w-1/2 bg-white rounded-lg shadow p-4 text-sm max-h-[220px] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-3">Top Price Drops</h3>
          <MoversTodayTable date={summary.scrape_date} />
        </div>
      </div>
    ) : (
      <p>Loading summary stats...</p>
    )}

    <div className="flex flex-col lg:flex-row gap-6">
  <div className="w-full lg:w-1/3 bg-white rounded-lg shadow p-4">
    <h3 className="text-lg font-semibold mb-3">Price Distribution</h3>
    <PriceDistributionChart />
  </div>
  <div className="w-full lg:w-1/3 bg-white rounded-lg shadow p-4">
    <h3 className="text-lg font-semibold mb-3">Median Rent Trend</h3>
    <PriceTrendChart />
  </div>
  <div className="w-full lg:w-1/3 bg-white rounded-lg shadow p-4">
  <h3 className="text-lg font-semibold mb-3">Listings By Neighborhood</h3>
  <NeighborhoodBarChart />
</div>
</div>




  </div>
);


}
