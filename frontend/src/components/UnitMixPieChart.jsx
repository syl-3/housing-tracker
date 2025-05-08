// components/UnitMixPieChart.jsx
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);

export default function UnitMixPieChart({ studios, oneBR, twoPlus }) {
  const data = {
    labels: ["Studios", "1B", "2B+"],
    datasets: [
      {
        label: "Unit Mix",
        data: [studios, oneBR, twoPlus],
        backgroundColor: ["#9ca3af", "#dc2626", "#000000"], // gray-300, red-500, black
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#111827", // gray-900
          font: {
            size: 12,
            family: "Inter, sans-serif",
          },
          boxWidth: 14,
          padding: 8,
          usePointStyle: true
        },
      },
    },
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-[240px] h-[140px]">
        <Pie data={data} options={options} />
      </div>
    </div>
  );
}
