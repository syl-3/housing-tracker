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
    fetch("/api/gold-metrics")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const filteredData = data.filter(item =>
    new Date(item.scrape_date) >= new Date("2025-05-02")
  );

  const chartData = {
    labels: filteredData.map(d => d.scrape_date),
    datasets: [
      {
        label: "Median Rent",
        data: filteredData.map(d => d.median_price),
        fill: false,
        borderColor: "#dc2626", // Tailwind red-600
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
        title: { display: true, text: "Date" },
      },
    },
  };

  return (
    
      <Line data={chartData} options={options} />
    
  );
}
