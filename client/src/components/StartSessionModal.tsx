import React, { useState, useEffect } from 'react';
import { X, Play, Users, Clock, Hash, Smartphone, Monitor } from 'lucide-react';
import { useSessionTimerStore } from '../store/useSessionTimerStore.js';
import { useSettingsStore } from '../store/useSettingsStore.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Device {
  _id: string;
  deviceId: string;
  name: string;
  type: 'PS5' | 'PC' | 'PC_Controller';
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { startSession, addToast } = useSessionTimerStore();
  const { pricing, cafeInfo, fetchSettings } = useSettingsStore();
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deviceId: '', // DB _id of selected device
    playersCount: 1,
    gameName: 'FC 24',
    duration: 60, // default 1 hour
    pcOption: 'keyboard_mouse', // keyboard_mouse or controller
  });

  const [ratePerHour, setRatePerHour] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch settings & devices when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      fetchDevices();
      setFormData({
        customerName: '',
        customerPhone: '',
        deviceId: '',
        playersCount: 1,
        gameName: 'FC 24',
        duration: 60,
        pcOption: 'keyboard_mouse',
      });
    }
  }, [isOpen]);

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        // Show only available devices
        setDevices(data.filter((d: Device) => d.status === 'available'));
      }
    } catch (err) {
      console.error('Error fetching devices inside modal:', err);
    }
  };

  const selectedDevice = devices.find(d => d._id === formData.deviceId);

  // Dynamic Rate Calculation
  useEffect(() => {
    if (!selectedDevice || !pricing) {
      setRatePerHour(100);
      return;
    }

    if (selectedDevice.type === 'PS5') {
      const pCount = formData.playersCount.toString() as '1' | '2' | '3' | '4';
      const rate = pricing.ps5[pCount] || 100;
      setRatePerHour(rate);
    } else if (selectedDevice.type === 'PC' || selectedDevice.type === 'PC_Controller') {
      const option = formData.pcOption as 'keyboard_mouse' | 'controller';
      const rate = pricing.pc[option] || 80;
      setRatePerHour(rate);
    }
  }, [formData.deviceId, formData.playersCount, formData.pcOption, selectedDevice, pricing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerPhone || !formData.deviceId) {
      addToast('Please fill out all required fields', 'warning');
      return;
    }

    setIsSubmitting(true);
    const success = await startSession({
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      deviceId: formData.deviceId,
      playersCount: selectedDevice?.type === 'PS5' ? formData.playersCount : 1,
      gameName: formData.gameName,
      duration: formData.duration,
      pricingRate: ratePerHour,
    });

    setIsSubmitting(false);
    if (success) {
      onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  const estimatedCost = formData.duration === -1 
    ? 'Pay-As-You-Go' 
    : `₹${Math.round((formData.duration / 60) * ratePerHour)}`;

  const taxLabel = cafeInfo?.enableGst ? `+ ${cafeInfo.gstRate}% GST` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-800 bg-[#141B34] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-game-primary" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">
              Start Gaming Session
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold text-game-muted uppercase mb-1.5">
                Customer Name *
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Enter name"
                  className="w-full game-input pl-9"
                  value={formData.customerName}
                  onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-game-muted uppercase mb-1.5">
                Mobile Number *
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  placeholder="10-digit number"
                  className="w-full game-input pl-9"
                  value={formData.customerPhone}
                  onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Station / Device Selector */}
            <div>
              <label className="block text-xs font-bold text-game-muted uppercase mb-1.5">
                Select Gaming Station *
              </label>
              <select
                required
                className="w-full game-input bg-[#0B1020]"
                value={formData.deviceId}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({ ...formData, deviceId: val, playersCount: 1 });
                }}
              >
                <option value="">-- Choose Available --</option>
                {devices.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.deviceId} ({d.type === 'PS5' ? 'PS5' : 'PC'}) - {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Game Name */}
            <div>
              <label className="block text-xs font-bold text-game-muted uppercase mb-1.5">
                Game Select
              </label>
              <select
                className="w-full game-input bg-[#0B1020]"
                value={formData.gameName}
                onChange={e => setFormData({ ...formData, gameName: e.target.value })}
              >
                <option value="FC 24">FC 24 (FIFA)</option>
                <option value="GTA V Online">GTA V</option>
                <option value="Valorant">Valorant</option>
                <option value="Tekken 8">Tekken 8</option>
                <option value="Spider-Man 2">Spider-Man 2</option>
                <option value="Call of Duty: MW3">Call of Duty</option>
                <option value="Minecraft">Minecraft</option>
                <option value="Fortnite">Fortnite</option>
                <option value="CS:GO / CS2">CS:GO / CS2</option>
              </select>
            </div>
          </div>

          {/* Conditional Fields based on Device Selection */}
          {selectedDevice && (
            <div className="p-3 bg-[#0B1020] border border-slate-800 rounded-lg space-y-3">
              {selectedDevice.type === 'PS5' ? (
                <div>
                  <label className="block text-[11px] font-bold text-game-muted uppercase mb-1">
                    Number of Players (Consoles pricing applies)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({ ...formData, playersCount: p })}
                        className={`flex-1 py-1.5 rounded-lg border text-sm font-semibold flex items-center justify-center gap-1 ${
                          formData.playersCount === p
                            ? 'bg-game-primary/20 border-game-primary text-game-primary shadow-sm'
                            : 'border-slate-800 hover:border-slate-700 text-game-muted'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        {p} {p === 1 ? 'Player' : 'Players'}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-game-muted uppercase mb-1">
                    PC Setup Choice
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, pcOption: 'keyboard_mouse' })}
                      className={`flex-1 py-1.5 rounded-lg border text-sm font-semibold flex items-center justify-center gap-1.5 ${
                        formData.pcOption === 'keyboard_mouse'
                          ? 'bg-game-primary/20 border-game-primary text-game-primary shadow-sm'
                          : 'border-slate-800 hover:border-slate-700 text-game-muted'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      KBM (₹80/hr)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, pcOption: 'controller' })}
                      className={`flex-1 py-1.5 rounded-lg border text-sm font-semibold flex items-center justify-center gap-1.5 ${
                        formData.pcOption === 'controller'
                          ? 'bg-game-primary/20 border-game-primary text-game-primary shadow-sm'
                          : 'border-slate-800 hover:border-slate-700 text-game-muted'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      Controller (₹100/hr)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Session Duration Selector */}
          <div>
            <label className="block text-xs font-bold text-game-muted uppercase mb-1.5">
              Duration Limit
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {[30, 60, 90, 120, 180, -1].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFormData({ ...formData, duration: d })}
                  className={`py-1.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center ${
                    formData.duration === d
                      ? 'bg-game-primary/20 border-game-primary text-game-primary shadow-sm'
                      : 'border-slate-800 hover:border-slate-700 text-game-muted'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 mb-0.5" />
                  {d === -1 ? 'Unlimited' : `${d} Min`}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Cost Card Preview */}
          <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800/80 rounded-xl">
            <div>
              <p className="text-[10px] font-bold text-game-muted uppercase tracking-wider">
                Dynamic Station Rate
              </p>
              <p className="text-lg font-bold text-white font-mono mt-0.5">
                ₹{ratePerHour}/hr <span className="text-[10px] text-game-muted normal-case font-sans font-medium">{taxLabel}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-game-muted uppercase tracking-wider">
                Total Estimated cost
              </p>
              <p className="text-xl font-black text-game-success font-mono mt-0.5">
                {estimatedCost}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-1.5"
              disabled={isSubmitting || !formData.deviceId}
            >
              {isSubmitting ? 'Starting...' : 'Launch Session'}
              <Play className="w-4 h-4 fill-white" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
