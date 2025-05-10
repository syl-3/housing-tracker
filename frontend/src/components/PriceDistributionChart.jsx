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

export default function PriceDistributionChart() {
  const [prices, setPrices] = useState([]);

  useEffect(() => {
    fetch("/api/todays-prices")
      .then((res) => res.json())
      .then(setPrices)
      .catch(console.error);
  }, []);

  // Group prices into histogram buckets
  const binSize = 100; // $100 increments
  const max = Math.max(...prices, 1000);
  const bins = Array.from({ length: Math.ceil(max / binSize) }, (_, i) => ({
    label: `$${i * binSize}–${(i + 1) * binSize}`,
    count: 0,
  }));

  prices.forEach((price) => {
    const idx = Math.floor(price / binSize);
    if (bins[idx]) bins[idx].count += 1;
  });

  const chartData = {
    labels: bins.map((b) => b.label),
    datasets: [
      {
        label: "Listings",
        data: bins.map((b) => b.count),
        backgroundColor: "#000000", // Tailwind red-500
        hoverBackgroundColor: '#dc2626'
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
        beginAtZero: true,
        title: { display: true, text: "Listings" },
      },
      x: {
        title: { display: true, text: "Price Range" },
      },
    },
  };

  return (
    
      <Bar data={chartData} options={options} />
    
  );
}
