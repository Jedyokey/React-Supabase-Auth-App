import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

import DashboardHeader from "../components/DashboardHeader";
import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../ThemeContext";
import { supabase } from "../supabaseClient";

// Register chart components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

// Helper function to get last 6 months with year handling
const getLastSixMonths = () => {
  const months = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // Get last 6 months including current month
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentYear, currentDate.getMonth() - i, 1);
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const yearSuffix = year !== currentYear ? ` '${year.toString().slice(-2)}` : '';
    months.push(`${monthName}${yearSuffix}`);
  }
  
  return months;
};

export default function Analytics() {
  const [orders, setOrders] = useState([]);
  const { theme } = useTheme();

  // Fetch real orders and update on changes
  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: true });

      setOrders(data || []);
    };

    fetchOrders();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('analytics-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchOrders(); // Refresh when orders change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Get dynamic last 6 months
  const months = useMemo(() => getLastSixMonths(), []);

  const currentMonth = new Date().toLocaleString('default', { month: 'short' });
  const currentYear = new Date().getFullYear();

  // Simple random demo data - different each time
  const ordersChartData = {
    labels: months,
    datasets: [
      {
        label: "Orders",
        data: months.map(() => Math.floor(Math.random() * 30) + 5), // Random 5-35
        backgroundColor: "rgba(147, 51, 234, 0.6)", 
        borderColor: "rgba(147, 51, 234, 1)",
        borderWidth: 2,
        tension: 0.4, // Smooth line
        pointBackgroundColor: "rgba(147, 51, 234, 1)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const revenueChartData = {
    labels: months,
    datasets: [
      {
        label: "Revenue ($)",
        data: months.map(() => Math.floor(Math.random() * 2000) + 300), // Random 300-2300
        backgroundColor: "rgba(236, 72, 153, 0.7)", 
        borderColor: "rgba(236, 72, 153, 1)",
        borderWidth: 0,
        borderRadius: 6, // Rounded bars
      },
    ],
  };

  // Chart options with dark mode support
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 12
          },
          color: theme === 'dark' ? '#f8fafc' : '#1f2937'
        }
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
        titleColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        bodyColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        padding: 10,
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 12
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          },
          color: theme === 'dark' ? '#9ca3af' : '#6b7280'
        }
      },
      y: {
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11
          },
          padding: 8,
          color: theme === 'dark' ? '#9ca3af' : '#6b7280'
        },
        beginAtZero: true
      }
    },
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }
    }
  }), [theme]);

  // Real-time stats based on actual orders
  const totalRevenue = useMemo(() => 
    orders.reduce((sum, order) => sum + (order.price || 0), 0), 
    [orders]
  );
  
  const averageOrder = useMemo(() => 
    orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : 0, 
    [orders, totalRevenue]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200">
      <DashboardHeader title="Analytics" />
      
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Section Heading */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Performance Overview
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Here's an insight into your store's activity and revenue trends.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Showing data for last 6 months: {months.join(" → ")}
          </p>
        </div>

        {/* CHARTS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* ORDERS CHART */}
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">
              Monthly Orders
            </h2>
            <div className="h-48 sm:h-56">
              <Line
                data={ordersChartData}
                options={chartOptions}
              />
            </div>
          </div>

          {/* REVENUE CHART */}
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">
              Monthly Revenue
            </h2>
            <div className="h-48 sm:h-56">
              <Bar
                data={revenueChartData}
                options={chartOptions}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 sm:mt-8">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center transition-colors duration-200">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{orders.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Orders</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center transition-colors duration-200">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${totalRevenue.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Revenue</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center transition-colors duration-200">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${averageOrder}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg. Order</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center transition-colors duration-200">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {currentMonth} '{currentYear.toString().slice(-2)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Current Period</div>
          </div>
        </div>
      </main>
    </div>
  );
}