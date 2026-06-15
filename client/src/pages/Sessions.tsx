import React, { useEffect, useState } from 'react';
import { Play, Plus, Search, Timer, Square, CreditCard, Activity } from 'lucide-react';
import { useSessionTimerStore, Session } from '../store/useSessionTimerStore.js';
import { ActiveSessionCard } from '../components/ActiveSessionCard.js';
import { StartSessionModal } from '../components/StartSessionModal.js';
import { BillingReceiptModal } from '../components/BillingReceiptModal.js';

export const Sessions: React.FC = () => {
  const { fetchSessions, sessions } = useSessionTimerStore();
  
  // Modals state
  const [showStartModal, setShowStartModal] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  
  // Search and Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleEndSessionSuccess = (invoice: any) => {
    setInvoiceToPrint(invoice);
    setIsReceiptOpen(true);
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = 
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.customerPhone.includes(search) ||
      s.deviceId.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && s.status === 'active') ||
      (statusFilter === 'paused' && s.status === 'paused');

    return matchesSearch && matchesFilter && s.status !== 'completed';
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">
            Real-Time Sessions Tracker
          </h2>
          <p className="text-xs text-game-muted mt-0.5">
            Monitor active play countdown timers, extensions, and live accrued rates
          </p>
        </div>

        <button
          onClick={() => setShowStartModal(true)}
          className="btn-primary flex items-center gap-1.5 text-xs py-2"
        >
          <Plus className="w-4 h-4" />
          Start Session
        </button>
      </div>

      {/* Quick Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-[#141B34] border border-slate-800 rounded-xl p-4">
        {/* Search */}
        <div className="flex-1 bg-game-bg border border-slate-800 rounded-lg px-3.5 py-2 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by customer, phone, or station ID..."
            className="flex-1 bg-transparent border-0 text-white placeholder-slate-600 focus:outline-none text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 p-0.5 bg-game-bg border border-slate-800 rounded-lg">
          {(['all', 'active', 'paused'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                statusFilter === tab
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-game-muted hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of active session cards */}
      {filteredSessions.length === 0 ? (
        <div className="py-20 text-center text-game-muted border border-dashed border-slate-800 rounded-xl space-y-3">
          <Timer className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-xs">No active or paused gaming sessions running.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSessions.map(session => (
            <ActiveSessionCard
              key={session._id}
              session={session}
              onEndSession={handleEndSessionSuccess}
            />
          ))}
        </div>
      )}

      {/* Start Session dialog */}
      <StartSessionModal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        onSuccess={() => fetchSessions()}
      />

      {/* Quick Billing Receipt dialog */}
      <BillingReceiptModal
        isOpen={isReceiptOpen}
        invoice={invoiceToPrint}
        onClose={() => {
          setIsReceiptOpen(false);
          setInvoiceToPrint(null);
          fetchSessions(); // refresh list
        }}
      />
    </div>
  );
};
