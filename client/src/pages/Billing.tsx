import React, { useEffect, useState } from 'react';
import { Search, FileText, Printer, CheckCircle, Smartphone, User, Calendar, ExternalLink } from 'lucide-react';
import { BillingReceiptModal } from '../components/BillingReceiptModal.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  deviceId: string;
  playersCount: number;
  duration: number;
  pricingRate: number;
  subtotal: number;
  tax: number;
  totalAmount: number;
  date: string;
  paymentStatus: 'paid' | 'unpaid';
}

export const Billing: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Selected Invoice for Receipt Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/billing`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setInvoices(data);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const s = search.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(s) ||
      inv.customerName.toLowerCase().includes(s) ||
      inv.customerPhone.includes(s) ||
      inv.deviceId.toLowerCase().includes(s)
    );
  });

  const handleOpenReceipt = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsReceiptOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">
            Invoices & Billing Registry
          </h2>
          <p className="text-xs text-game-muted mt-0.5">
            Log directory of all transactions and customer receipts
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] bg-slate-900 border border-slate-800 text-game-primary px-2.5 py-1 rounded font-bold font-mono">
            {filteredInvoices.length} Bills Listed
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex bg-[#141B34] border border-slate-800 rounded-xl p-4 items-center gap-3">
        <Search className="w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search by invoice number, name, phone, or station ID..."
          className="flex-1 bg-transparent border-0 text-white placeholder-slate-500 focus:ring-0 focus:outline-none text-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Invoices List Table */}
      <div className="bg-[#141B34] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-game-muted border-collapse">
            <thead className="bg-[#0B1020] border-b border-slate-800 text-[10px] font-bold text-game-muted uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Invoice Number</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Station</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Bill Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-game-muted">
                    Loading invoices database...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-game-muted">
                    No transactions matching filter.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv._id} className="hover:bg-slate-900/20 text-white font-medium">
                    {/* Invoice ID */}
                    <td className="px-6 py-4 font-mono text-xs text-game-primary font-bold">
                      {inv.invoiceNumber}
                    </td>

                    {/* Customer */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <div>
                          <p className="text-sm font-semibold">{inv.customerName}</p>
                          <span className="text-[10px] text-game-muted font-mono">{inv.customerPhone}</span>
                        </div>
                      </div>
                    </td>

                    {/* Device ID */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-purple-400">
                        {inv.deviceId}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="px-6 py-4 text-xs font-semibold">
                      {inv.duration} Mins
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-xs text-game-muted">
                      {new Date(inv.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 text-right text-sm font-black text-game-success font-mono">
                      ₹{inv.totalAmount}
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-green-500/10 text-game-success border border-green-500/20">
                        <CheckCircle className="w-2.5 h-2.5" />
                        PAID
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenReceipt(inv)}
                        className="text-game-primary hover:text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1 hover:underline"
                      >
                        Receipt
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Billing Receipt Modal popup */}
      <BillingReceiptModal
        isOpen={isReceiptOpen}
        invoice={selectedInvoice}
        onClose={() => {
          setIsReceiptOpen(false);
          setSelectedInvoice(null);
        }}
      />
    </div>
  );
};
