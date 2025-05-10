// components/UnitTypeTrendChart.jsx
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

export default function UnitTypeTrendChart() {
  const [dataPoints, setDataPoints] = useState([]);

  useEffect(() => {
    fetch("/api/gold-metrics-unit-types")
      .then((res) => res.json())
      .then((json) => setDataPoints(json))
      .catch((err) => {
        console.error("Error loading unit type trend data:", err);
      });
  }, []);

  const filteredData = dataPoints.filter(d => new Date(d.scrape_date) >= new Date("2025-05-02"));

const chartData = {
  labels: filteredData.map((d) => d.scrape_date),
  datasets: [
    {
      label: "Studios",
      data: filteredData.map((d) => d.avg_studio),
      borderColor: "#9ca3af",
      backgroundColor: "#9ca3af",
      tension: 0.3,
      fill: false,
    },
    {
      label: "1B",
      data: filteredData.map((d) => d.avg_1br),
      borderColor: "#dc2626",
      backgroundColor: "#dc2626",
      tension: 0.3,
      fill: false,
    },
    {
      label: "2B+",
      data: filteredData.map((d) => d.avg_2plus),
      borderColor: "#000000",
      backgroundColor: "#000000",
      tension: 0.3,
      fill: false,
    },
  ],
};


  const options = {
    responsive: true,
    plugins: {
      legend: { display: true, position: "bottom" },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: { display: true, text: "Rent ($)" },
      },
      x: {
        title: { display: true, text: "Date" },
      },
    },
  };

  return (
  <div className="flex items-center justify-center w-full h-full">
    <Line data={chartData} options={options} />
  </div>
);


}
