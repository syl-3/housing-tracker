import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

export default function NeighborhoodBarChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/neighborhood-counts")
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const chartData = {
    labels: data.map((d) => d.neighborhood),
    datasets: [
      {
        label: "Listings",
        data: data.map((d) => d.count),
        backgroundColor: "#000000", // Tailwind zinc-900
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
        title: { display: true, text: "Neighborhood" },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}
 