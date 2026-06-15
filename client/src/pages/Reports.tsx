import React, { useEffect, useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { BarChart2, Download, Table, Calendar, Laptop, Award, ShieldAlert } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const Reports: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>({
    revenueTrend: [],
    deviceUsage: [],
    topCustomers: []
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/reports/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // CSV Exporter Helper
  const handleExportCSV = (type: 'revenue' | 'customers' | 'devices') => {
    let csvData = '';
    let filename = '';

    if (type === 'revenue') {
      filename = 'revenue_report.csv';
      csvData = 'Date,Revenue (INR),Sessions Run\n' + 
        analytics.revenueTrend.map((row: any) => `"${row.date}",${row.revenue},${row.sessions}`).join('\n');
    } else if (type === 'customers') {
      filename = 'top_customers_report.csv';
      csvData = 'Customer Name,Total Spent (INR)\n' + 
        analytics.topCustomers.map((row: any) => `"${row.name}",${row.spend}`).join('\n');
    } else if (type === 'devices') {
      filename = 'device_usage_report.csv';
      csvData = 'Device Category,Share (Count)\n' + 
        analytics.deviceUsage.map((row: any) => `"${row.name}",${row.value}`).join('\n');
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#5B8CFF', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">
            Reports & Deep Analytics
          </h2>
          <p className="text-xs text-game-muted mt-0.5">
            Audit logs, business trends, and station optimization charts
          </p>
        </div>
        
        <button
          onClick={() => window.print()}
          className="btn-secondary flex items-center gap-1.5 text-xs py-2"
        >
          <Download className="w-4 h-4" />
          Print Full Report
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-game-muted">
          Loading report data...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Detailed Top Customers Table */}
            <div className="bg-[#141B34] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-yellow-500" />
                  Top Spender Leaderboard
                </h3>
                <button 
                  onClick={() => handleExportCSV('customers')}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-game-muted hover:text-white"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {analytics.topCustomers.map((c: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2.5 bg-[#0B1020]/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {index + 1}
                      </span>
                      <span className="text-xs font-semibold text-white">{c.name}</span>
                    </div>
                    <span className="text-xs font-black text-game-success font-mono">₹{c.spend}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Station Share Pie Chart */}
            <div className="bg-[#141B34] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-purple-400" />
                  Device Usage Distribution
                </h3>
                <button 
                  onClick={() => handleExportCSV('devices')}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-game-muted hover:text-white"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-[150px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.deviceUsage}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analytics.deviceUsage.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends details */}
              <div className="flex justify-around text-xs">
                {analytics.deviceUsage.map((item: any, i: number) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }}></span>
                    <span className="text-game-muted font-bold">{item.name} ({item.value}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Export Grid */}
            <div className="bg-[#141B34] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-game-primary" />
                  Auditing & Exporters
                </h3>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleExportCSV('revenue')}
                  className="w-full btn-secondary text-xs py-2.5 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Daily Revenue CSV
                </button>
                <button
                  onClick={() => handleExportCSV('customers')}
                  className="w-full btn-secondary text-xs py-2.5 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Customer Standings CSV
                </button>
                <button
                  onClick={() => handleExportCSV('devices')}
                  className="w-full btn-secondary text-xs py-2.5 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Device Share CSV
                </button>
              </div>
            </div>

          </div>

          {/* Revenue Bar Chart details */}
          <div className="bg-[#141B34] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-game-primary" />
              Daily Earnings Breakdown
            </h3>
            
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#141B34', borderColor: '#1E293B', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Bar name="Earnings (₹)" dataKey="revenue" fill="#5B8CFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
