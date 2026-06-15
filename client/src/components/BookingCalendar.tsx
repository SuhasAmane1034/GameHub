import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, CheckCircle, AlertCircle, XCircle, Plus, ChevronLeft, ChevronRight, List, Grid } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Booking {
  _id?: string;
  customerName: string;
  customerPhone: string;
  deviceId: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "12:00 - 14:00"
  notes: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
}

interface Device {
  _id: string;
  deviceId: string;
  name: string;
  type: string;
  status: string;
}

export const BookingCalendar: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal toggler
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deviceId: '',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '12:00 - 14:00',
    notes: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { socket } = useThemeStore();

  useEffect(() => {
    fetchBookings();
    fetchDevices();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleSync = () => {
      fetchBookings();
      fetchDevices();
    };

    socket.on('bookings_updated', handleSync);
    socket.on('devices_updated', handleSync);
    socket.on('booking_updated', handleSync);

    return () => {
      socket.off('bookings_updated', handleSync);
      socket.off('devices_updated', handleSync);
      socket.off('booking_updated', handleSync);
    };
  }, [socket]);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setBookings(data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setDevices(data);
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reserve slot');
      }

      setBookings([...bookings, data]);
      setShowAddModal(false);
      setFormData({
        customerName: '',
        customerPhone: '',
        deviceId: '',
        date: new Date().toISOString().split('T')[0],
        timeSlot: '12:00 - 14:00',
        notes: ''
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Conflicting reservation slot');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: Booking['status']) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/bookings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        setBookings(bookings.map(b => b._id === id ? { ...b, status: data.status } : b));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate calendar days for current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // Weekday starting index
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { firstDay, totalDays };
  };

  const { firstDay, totalDays } = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return 'text-game-success bg-green-500/10 border-green-500/20';
      case 'pending': return 'text-game-warning bg-yellow-500/10 border-yellow-500/20';
      case 'cancelled': return 'text-game-danger bg-red-500/10 border-red-500/20';
      default: return 'text-game-muted bg-slate-800/10 border-slate-700/20';
    }
  };

  const monthName = currentDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  // Filter bookings for the selected day in calendar view
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(new Date().getDate());
  
  const getSelectedDateStr = () => {
    if (!selectedDayNum) return '';
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDayNum).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const selectedDateStr = getSelectedDateStr();
  const activeBookingsForDay = bookings.filter(b => b.date === selectedDateStr);

  return (
    <div className="space-y-6">
      {/* Tab controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">
            Booking Reservations
          </h2>
          <p className="text-xs text-game-muted mt-0.5">
            Manage advance console bookings and station slot allocations
          </p>
        </div>

        <div className="flex gap-2">
          {/* View Toggles */}
          <div className="bg-[#141B34] border border-slate-800 rounded-lg p-0.5 flex">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-slate-800 text-white shadow-sm' : 'text-game-muted hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-800 text-white shadow-sm' : 'text-game-muted hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-1.5 text-xs py-2"
          >
            <Plus className="w-4 h-4" />
            New Booking
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 bg-[#141B34] border border-slate-800 rounded-xl p-5">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-white uppercase tracking-wide text-sm">{monthName}</h3>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="p-1 rounded bg-[#0B1020] border border-slate-800 hover:border-slate-700 text-game-muted hover:text-white">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextMonth} className="p-1 rounded bg-[#0B1020] border border-slate-800 hover:border-slate-700 text-game-muted hover:text-white">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-game-muted uppercase tracking-wider mb-2">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Padding for weekday start offset */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square bg-slate-950/20 border border-slate-900/10 rounded-lg"></div>
              ))}
              
              {/* Actual Days */}
              {Array.from({ length: totalDays }).map((_, i) => {
                const day = i + 1;
                const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                const bookingsCount = bookings.filter(b => b.date === dStr && b.status !== 'cancelled').length;
                const isSelected = selectedDayNum === day;

                return (
                  <button
                    key={`day-${day}`}
                    onClick={() => setSelectedDayNum(day)}
                    className={`aspect-square rounded-lg border flex flex-col justify-between p-2 text-left transition-all ${
                      isSelected 
                        ? 'bg-game-primary/10 border-game-primary text-white shadow-neon-primary'
                        : 'bg-[#0B1020]/80 border-slate-800 hover:border-slate-700 text-game-muted hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">{day}</span>
                    {bookingsCount > 0 && (
                      <span className="w-2.5 h-2.5 rounded-full bg-game-secondary flex items-center justify-center text-[8px] text-white font-bold ml-auto shadow shadow-game-secondary/50">
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day details */}
          <div className="bg-[#141B34] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <h3 className="font-bold text-white uppercase text-xs tracking-wider">
                  Bookings: {selectedDateStr}
                </h3>
                <span className="text-[10px] bg-slate-950 border border-slate-800 text-game-primary px-2 py-0.5 rounded font-bold font-mono">
                  {activeBookingsForDay.length} Slots
                </span>
              </div>

              {activeBookingsForDay.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Calendar className="w-8 h-8 text-slate-700 mx-auto" />
                  <p className="text-xs text-game-muted">No reservations booked on this day.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {activeBookingsForDay.map(b => (
                    <div key={b._id} className="p-3 bg-[#0B1020]/70 border border-slate-800/80 rounded-lg space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-white">{b.customerName}</p>
                          <p className="text-[10px] text-game-muted mt-0.5">{b.customerPhone}</p>
                        </div>
                        <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded border ${getStatusColor(b.status)}`}>
                          {b.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-game-primary" />
                          {b.timeSlot}
                        </span>
                        <span className="font-bold text-game-secondary">
                          {b.deviceId}
                        </span>
                      </div>
                      
                      {b.notes && (
                        <p className="text-[10px] text-game-muted italic bg-slate-950/40 p-1.5 rounded">
                          "{b.notes}"
                        </p>
                      )}

                      {b.status === 'pending' && (
                        <div className="flex gap-1.5 justify-end border-t border-slate-900 pt-2">
                          <button
                            onClick={() => handleUpdateStatus(b._id!, 'cancelled')}
                            className="px-2 py-1 rounded bg-game-danger/10 border border-game-danger/20 hover:bg-game-danger/20 text-game-danger text-[9px] font-bold uppercase transition-all"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(b._id!, 'confirmed')}
                            className="px-2 py-1 rounded bg-game-success/15 border border-game-success/20 hover:bg-game-success/25 text-game-success text-[9px] font-bold uppercase transition-all"
                          >
                            Approve
                          </button>
                        </div>
                      )}
                      {b.status === 'confirmed' && (
                        <div className="flex gap-1.5 justify-end border-t border-slate-900 pt-2">
                          <button
                            onClick={() => handleUpdateStatus(b._id!, 'cancelled')}
                            className="px-2 py-1 rounded bg-game-danger/10 border border-game-danger/20 hover:bg-game-danger/20 text-game-danger text-[9px] font-bold uppercase transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(b._id!, 'completed')}
                            className="px-2 py-1 rounded bg-game-success/15 border border-game-success/20 hover:bg-game-success/25 text-game-success text-[9px] font-bold uppercase transition-all"
                          >
                            Complete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setFormData({ ...formData, date: selectedDateStr });
                setShowAddModal(true);
              }}
              className="w-full btn-secondary text-xs mt-4 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Reserve on {selectedDateStr}
            </button>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-[#141B34] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-game-muted border-collapse">
              <thead className="bg-[#0B1020] border-b border-slate-800 text-[10px] font-bold text-game-muted uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Contact Phone</th>
                  <th className="px-6 py-4">Reserved Station</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 font-mono">Timeslot</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-game-muted">
                      No reservation bookings listed.
                    </td>
                  </tr>
                ) : (
                  bookings
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(b => (
                      <tr key={b._id} className="hover:bg-slate-900/20 text-white font-medium">
                        <td className="px-6 py-4 flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-500" />
                          {b.customerName}
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1 text-game-muted text-xs">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            {b.customerPhone}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-game-primary">
                          {b.deviceId}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          {b.date}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-game-secondary">
                          {b.timeSlot}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${getStatusColor(b.status)}`}>
                            {b.status === 'confirmed' ? <CheckCircle className="w-3 h-3" /> : b.status === 'pending' ? <AlertCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {b.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {b.status === 'pending' && (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleUpdateStatus(b._id!, 'cancelled')}
                                className="text-[10px] font-bold text-game-danger hover:underline uppercase"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(b._id!, 'confirmed')}
                                className="text-[10px] font-bold text-game-success hover:underline uppercase"
                              >
                                Approve
                              </button>
                            </div>
                          )}
                          {b.status === 'confirmed' && (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleUpdateStatus(b._id!, 'cancelled')}
                                className="text-[10px] font-bold text-game-danger hover:underline uppercase"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(b._id!, 'completed')}
                                className="text-[10px] font-bold text-game-success hover:underline uppercase"
                              >
                                Complete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Booking Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#141B34] border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-game-primary" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Reserve Booking Slot
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-game-danger text-xs font-semibold rounded-lg">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-game-muted uppercase mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full game-input text-sm py-2"
                    placeholder="E.g. Siddharth"
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-game-muted uppercase mb-1">Customer Phone *</label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    className="w-full game-input text-sm py-2"
                    placeholder="10-digit mobile number"
                    value={formData.customerPhone}
                    onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-game-muted uppercase mb-1">Station *</label>
                    <select
                      required
                      className="w-full game-input text-sm bg-game-bg py-2"
                      value={formData.deviceId}
                      onChange={e => setFormData({ ...formData, deviceId: e.target.value })}
                    >
                      <option value="">Choose Device</option>
                      {devices.map(d => (
                        <option key={d._id} value={d.deviceId}>
                          {d.deviceId} ({d.name.substring(0, 15)}...)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-game-muted uppercase mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      className="w-full game-input text-sm bg-game-bg py-2"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-game-muted uppercase mb-1">Select Time Slot *</label>
                  <select
                    className="w-full game-input text-sm bg-game-bg py-2"
                    value={formData.timeSlot}
                    onChange={e => setFormData({ ...formData, timeSlot: e.target.value })}
                  >
                    <option value="10:00 - 12:00">10:00 AM - 12:00 PM</option>
                    <option value="12:00 - 14:00">12:00 PM - 02:00 PM</option>
                    <option value="14:00 - 16:00">02:00 PM - 04:00 PM</option>
                    <option value="16:00 - 18:00">04:00 PM - 06:00 PM</option>
                    <option value="18:00 - 20:00">06:00 PM - 08:00 PM</option>
                    <option value="20:00 - 22:00">08:00 PM - 10:00 PM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-game-muted uppercase mb-1">Booking Notes / Preferences</label>
                  <textarea
                    rows={2}
                    className="w-full game-input text-sm py-2 resize-none"
                    placeholder="Console preference, extra controllers, etc."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary py-2"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Reserving...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
