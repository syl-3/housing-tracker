// components/VolatilityBarChart.jsx
import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function VolatilityBarChart() {
  const [dataPoints, setDataPoints] = useState([]);

  useEffect(() => {
    fetch("/api/volatility-by-neighborhood")
      .then((res) => res.json())
      .then((json) => setDataPoints(json))
      .catch((err) => console.error("Error loading volatility data:", err));
  }, []);

  const chartData = {
    labels: dataPoints.map((d) => d.neighborhood),
    datasets: [
  {
    label: "Price Volatility ($)",
    data: dataPoints.map((d) => d.std_dev),
    backgroundColor: dataPoints.map((_, i) =>
  i % 3 === 0 ? "#dc2626" : i % 3 === 1 ? "#000000" : "#9ca3af"
),
    borderRadius: 4,
  },
],

  };

  const options = {
    indexAxis: "y",
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: "Price Std Dev ($)" },
      },
      y: {
        title: { display: false },
      },
    },
  };

  return (
  <div className="flex items-center justify-center w-full h-full"> 
  <Bar data={chartData} options={options} />
  </div>)
}
