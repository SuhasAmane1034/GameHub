import React, { useEffect, useState } from 'react';
import { Search, Users, Phone, Calendar, IndianRupee, Gamepad2, Award } from 'lucide-react';
import { useSessionTimerStore } from '../store/useSessionTimerStore.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Customer {
  name: string;
  phone: string;
  totalVisits: number;
  totalSpending: number;
  lastVisit: string;
  favoriteGames: string[];
}

export const Customers: React.FC = () => {
  const { addToast } = useSessionTimerStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/customers?search=${search}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCustomers(data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  return (
    <div className="space-y-6 font-sans">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">
            Customer Directory
          </h2>
          <p className="text-xs text-game-muted mt-0.5">
            Overview of cafe customer accounts, total spending, and gaming preferences
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] bg-slate-900 border border-slate-800 text-game-primary px-2.5 py-1 rounded font-bold font-mono">
            {customers.length} Accounts
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex bg-[#141B34] border border-slate-800 rounded-xl p-4 items-center gap-3">
        <Search className="w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search by customer name or phone number..."
          className="flex-1 bg-transparent border-0 text-white placeholder-slate-500 focus:ring-0 focus:outline-none text-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table grid */}
      <div className="bg-[#141B34] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-game-muted border-collapse">
            <thead className="bg-[#0B1020] border-b border-slate-800 text-[10px] font-bold text-game-muted uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Contact Phone</th>
                <th className="px-6 py-4">Total Visits</th>
                <th className="px-6 py-4">Total Spending</th>
                <th className="px-6 py-4">Favorite Games</th>
                <th className="px-6 py-4">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-game-muted">
                    Loading customer records...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-game-muted">
                    No customer accounts found.
                  </td>
                </tr>
              ) : (
                customers
                  .sort((a, b) => b.totalSpending - a.totalSpending) // Sort top spenders first
                  .map((c, idx) => (
                    <tr key={c.phone} className="hover:bg-slate-900/20 text-white font-medium">
                      
                      {/* Name with rank badge for top spenders */}
                      <td className="px-6 py-4 flex items-center gap-2.5">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 text-xs">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          {idx < 3 && (
                            <Award className={`w-4 h-4 absolute -top-1 -right-1.5 ${
                              idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-400' : 'text-amber-600'
                            }`} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{c.name}</p>
                          {idx === 0 && <span className="text-[8px] text-yellow-500 font-extrabold uppercase tracking-wide leading-none">MVP Player</span>}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-game-muted text-xs font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-600" />
                          {c.phone}
                        </span>
                      </td>

                      {/* Visits */}
                      <td className="px-6 py-4 text-xs font-bold text-slate-300">
                        {c.totalVisits} Times
                      </td>

                      {/* Spending */}
                      <td className="px-6 py-4 text-sm font-black text-game-success font-mono">
                        ₹{c.totalSpending.toLocaleString('en-IN')}
                      </td>

                      {/* Favorite games badges */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                          {c.favoriteGames.map(game => (
                            <span 
                              key={game} 
                              className="text-[9px] font-bold uppercase bg-slate-900 border border-slate-800 text-purple-400 px-2 py-0.5 rounded flex items-center gap-1"
                            >
                              <Gamepad2 className="w-2.5 h-2.5" />
                              {game}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Last active */}
                      <td className="px-6 py-4 text-xs text-game-muted font-semibold">
                        {new Date(c.lastVisit).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
