import { useEffect, useState } from "react";
import PriceTrendChart from "../components/PriceTrendChart";
import MoversTodayTable from "../components/MoversToday";
export default function Dashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/summary-stats")
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch((err) => console.error("API error:", err));
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-semibold mb-6">Dashboard</h2>

{summary ? (
  <div className="flex flex-col md:flex-row gap-6 mb-10">
    {/* Snapshot box */}
    <div className="bg-white rounded-lg shadow p-6 space-y-3 text-lg w-full md:w-1/2">
      <h3 className="text-xl font-semibold mb-2">📅 Today’s Snapshot</h3>
      <p><strong>Date:</strong> {summary.scrape_date}</p>
      <p>
        <strong>Median Rent:</strong> ${summary.median_price}
        {summary.price_change !== null && (
          <span className={summary.price_change > 0 ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
            ({summary.price_change > 0 ? "+" : ""}{summary.price_change})
          </span>
        )}
      </p>
      <p><strong>Listings Today:</strong> {summary.listing_count}</p>
      <p><strong>Unit Mix:</strong> 
        {" "}{summary.studio_count} studios,{" "}
        {summary.one_bed_count} 1BR,{" "}
        {summary.two_plus_bed_count} 2+BR
      </p>
    </div>

    {/* Movers Today */}
    <div className="bg-white rounded-lg shadow p-6 w-full md:w-1/2">
      <h3 className="text-xl font-semibold mb-2">📊 Movers Today</h3>
      <MoversTodayTable date={summary.scrape_date} />
    </div>
  </div>
) : (
  <p>Loading summary stats...</p>
)}

{/* Chart stays full-width */}
<div className="mb-10">
  <PriceTrendChart />
</div>




    </div>
  );
}
