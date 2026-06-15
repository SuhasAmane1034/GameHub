import React, { useEffect, useState } from 'react';
import { Monitor, Plus, Settings, Trash2, Wrench, ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore.js';
import { useSessionTimerStore } from '../store/useSessionTimerStore.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Device {
  _id: string;
  deviceId: string;
  name: string;
  type: 'PS5' | 'PC' | 'PC_Controller';
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  currentCustomer?: string;
  activeSessionId?: string;
}

export const Stations: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useSessionTimerStore();
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals / Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    deviceId: '',
    name: '',
    type: 'PS5' as Device['type'],
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setDevices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deviceId || !formData.name) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setDevices([...devices, data]);
      setShowAddModal(false);
      setFormData({ deviceId: '', name: '', type: 'PS5' });
      addToast(`Device ${data.deviceId} added successfully`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Error adding device', 'danger');
    }
  };

  const handleToggleMaintenance = async (id: string, currentStatus: string) => {
    const isMaintenance = currentStatus !== 'maintenance';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/devices/${id}/maintenance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isMaintenance })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setDevices(devices.map(d => d._id === id ? { ...d, status: data.status } : d));
      addToast(
        isMaintenance 
          ? `Device set to Maintenance`
          : `Device is now Available`, 
        isMaintenance ? 'warning' : 'success'
      );
    } catch (err: any) {
      addToast(err.message, 'danger');
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this station permanently?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/devices/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setDevices(devices.filter(d => d._id !== id));
      addToast('Station removed successfully', 'success');
    } catch (err: any) {
      addToast(err.message, 'danger');
    }
  };

  const getStatusColor = (status: Device['status']) => {
    switch (status) {
      case 'available': return { bg: 'bg-green-500/10 text-game-success border-green-500/30', circle: 'bg-game-success' };
      case 'occupied': return { bg: 'bg-red-500/10 text-game-danger border-red-500/30', circle: 'bg-game-danger' };
      case 'reserved': return { bg: 'bg-yellow-500/10 text-game-warning border-game-warning/30', circle: 'bg-game-warning' };
      case 'maintenance': return { bg: 'bg-slate-800 text-game-muted border-slate-700', circle: 'bg-slate-600' };
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">
            Gaming Stations Directory
          </h2>
          <p className="text-xs text-game-muted mt-0.5">
            Overview and status controls of all PC, controller, and console gaming stations
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-1.5 text-xs py-2"
          >
            <Plus className="w-4 h-4" />
            Add Station
          </button>
        )}
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-game-muted">
            Loading stations details...
          </div>
        ) : devices.length === 0 ? (
          <div className="col-span-full py-12 text-center text-game-muted border border-dashed border-slate-800 rounded-xl">
            No gaming consoles or PCs registered in the cafe catalog.
          </div>
        ) : (
          devices.map(d => {
            const statusStyle = getStatusColor(d.status);
            return (
              <div 
                key={d._id} 
                className={`glass-panel rounded-xl p-5 border border-slate-800/80 flex flex-col justify-between h-48 hover:shadow-md transition-all duration-300 ${
                  d.status === 'occupied' ? 'hover:border-game-danger/30' : 'hover:border-game-primary/30'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                        d.type === 'PS5' ? 'bg-blue-950/40 text-game-primary border-blue-800/50' : 'bg-purple-950/40 text-purple-400 border-purple-800/50'
                      }`}>
                        {d.type === 'PS5' ? 'PS5 Console' : 'Gaming PC'}
                      </span>
                      <h4 className="text-lg font-bold text-white mt-1.5">{d.deviceId}</h4>
                    </div>
                    
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${statusStyle.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.circle} ${d.status === 'occupied' || d.status === 'available' ? 'pulse-indicator' : ''}`}></span>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-game-muted mt-2 font-medium">{d.name}</p>
                </div>

                {/* Info & Action bar */}
                <div className="flex justify-between items-center border-t border-slate-800/60 pt-3.5">
                  <div className="text-left">
                    {d.status === 'occupied' ? (
                      <>
                        <p className="text-[9px] text-game-muted font-bold leading-none">CURRENT CUSTOMER</p>
                        <p className="text-xs font-bold text-game-danger mt-0.5">{d.currentCustomer}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[9px] text-game-muted font-bold leading-none">STATUS SLIP</p>
                        <p className="text-xs font-semibold text-game-success mt-0.5">Ready to start</p>
                      </>
                    )}
                  </div>

                  <div className="flex gap-1">
                    {/* Toggle maintenance */}
                    <button
                      onClick={() => handleToggleMaintenance(d._id, d.status)}
                      disabled={d.status === 'occupied'}
                      className={`p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors ${
                        d.status === 'maintenance' ? 'text-game-warning' : 'text-game-muted hover:text-white'
                      }`}
                      title={d.status === 'maintenance' ? 'Set to Active' : 'Set to Maintenance'}
                    >
                      <Wrench className="w-4 h-4" />
                    </button>

                    {/* Delete Device (Admin only) */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteDevice(d._id)}
                        disabled={d.status === 'occupied'}
                        className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-game-danger/30 text-game-muted hover:text-game-danger transition-colors"
                        title="Delete Station"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Device Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#141B34] border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-game-primary" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Register Gaming Station
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleAddDevice} className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-game-muted uppercase mb-1">Station ID (Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. PS5-04, PC-09"
                    className="w-full game-input text-sm py-2"
                    value={formData.deviceId}
                    onChange={e => setFormData({ ...formData, deviceId: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-game-muted uppercase mb-1">Hardware Display Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. ROG PC 04 Liquid Cooling"
                    className="w-full game-input text-sm py-2"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-game-muted uppercase mb-1">Station Category *</label>
                  <select
                    className="w-full game-input text-sm bg-game-bg py-2"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as Device['type'] })}
                  >
                    <option value="PS5">PlayStation 5 Console</option>
                    <option value="PC">Gaming PC (KBM)</option>
                    <option value="PC_Controller">Gaming PC (Controller)</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Quick missing SVG helper
const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);
