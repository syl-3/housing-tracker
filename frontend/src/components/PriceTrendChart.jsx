import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

export default function PriceTrendChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/gold-metrics")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const chartData = {
    labels: data.map(d => d.scrape_date),
    datasets: [
      {
        label: "Median Rent",
        data: data.map(d => d.median_price),
        fill: false,
        borderColor: "rgb(239, 68, 68)", // Tailwind red-600
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        title: { display: true, text: "Price ($)" },
        beginAtZero: false,
      },
      x: {
        title: { display: true, text: "Scrape Date" },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-3xl mt-10">
      <h3 className="text-lg font-semibold mb-4">Median Rent Trend</h3>
      <Line data={chartData} options={options} />
    </div>
  );
}
