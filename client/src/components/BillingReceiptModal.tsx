import React, { useRef, useEffect } from 'react';
import { X, Printer, Download, Share2, FileText, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore.js';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  deviceId: string;
  playersCount: number;
  duration: number; // in minutes
  pricingRate: number;
  subtotal: number;
  tax: number; // GST
  totalAmount: number;
  date: string; // ISO string
  paymentStatus: 'paid' | 'unpaid';
}

interface BillingReceiptModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BillingReceiptModal: React.FC<BillingReceiptModalProps> = ({ invoice, isOpen, onClose }) => {
  const { cafeInfo, fetchSettings } = useSettingsStore();
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  if (!isOpen || !invoice) return null;

  const dateFormatted = new Date(invoice.date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Action: Print Receipt
  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (!printContent) return;

    // Create a new window for clean print layout
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt_${invoice.invoiceNumber}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 20px;
              width: 80mm;
              margin: 0 auto;
              color: #000;
              background: #fff;
              font-size: 12px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .border-bottom { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .border-top { border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px; }
            .header { margin-bottom: 15px; }
            .header h2 { margin: 0; font-size: 16px; font-weight: bold; }
            .header p { margin: 2px 0; font-size: 10px; }
            .meta-info { font-size: 10px; margin-bottom: 10px; }
            .meta-info div { display: flex; justify-content: space-between; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .table th { border-bottom: 1px solid #000; text-align: left; font-size: 10px; padding: 4px 0; }
            .table td { padding: 4px 0; font-size: 11px; }
            .total-section { font-size: 11px; }
            .total-section div { display: flex; justify-content: space-between; padding: 2px 0; }
            .grand-total { font-size: 14px; font-weight: bold; }
            .footer-msg { font-size: 10px; margin-top: 25px; }
            @media print {
              body { padding: 0; width: 80mm; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="text-center header">
            <h2>${cafeInfo?.name || 'GameHub Cafe'}</h2>
            <p>${cafeInfo?.address || 'Kolkata, WB'}</p>
            ${cafeInfo?.gstNumber ? `<p>GSTIN: ${cafeInfo.gstNumber}</p>` : ''}
          </div>
          
          <div class="border-bottom"></div>
          
          <div class="meta-info">
            <div><span>Inv No:</span> <span>${invoice.invoiceNumber}</span></div>
            <div><span>Date:</span> <span>${dateFormatted}</span></div>
            <div><span>Cust:</span> <span>${invoice.customerName}</span></div>
            <div><span>Phone:</span> <span>${invoice.customerPhone}</span></div>
          </div>
          
          <div class="border-bottom"></div>
          
          <table class="table">
            <thead>
              <tr>
                <th>Item/Device</th>
                <th class="text-right">Qty/Min</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${invoice.deviceId} (${invoice.playersCount}P)</td>
                <td class="text-right">${invoice.duration}m</td>
                <td class="text-right">₹${invoice.pricingRate}/h</td>
                <td class="text-right">₹${invoice.subtotal}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="border-top total-section">
            <div><span>Subtotal:</span> <span>₹${invoice.subtotal}</span></div>
            ${invoice.tax > 0 ? `<div><span>GST (${cafeInfo?.gstRate || 18}%):</span> <span>₹${invoice.tax}</span></div>` : ''}
            <div class="grand-total border-top">
              <span>NET PAYABLE:</span>
              <span>₹${invoice.totalAmount}</span>
            </div>
          </div>
          
          <div class="border-top text-center footer-msg">
            <p>Thank you for gaming with us!</p>
            <p>Powered by GameHub Manager OS</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Action: Share on WhatsApp
  const handleWhatsAppShare = () => {
    const cafeName = cafeInfo?.name || 'GameHub Cafe';
    const message = `*Receipt from ${cafeName}*
-----------------------------
*Invoice Number:* ${invoice.invoiceNumber}
*Date:* ${dateFormatted}
*Customer:* ${invoice.customerName}
*Station:* ${invoice.deviceId}
*Duration Played:* ${invoice.duration} Mins
*Subtotal:* ₹${invoice.subtotal}
${invoice.tax > 0 ? `*GST (${cafeInfo?.gstRate || 18}%):* ₹${invoice.tax}` : ''}
-----------------------------
*Total Bill Amount:* ₹${invoice.totalAmount}
*Payment Status:* PAID ✅
-----------------------------
Thank you for playing. Visit again!`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=91${invoice.customerPhone}&text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-800 bg-[#141B34] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-game-success" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">
              Invoice Generated
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Visualizer (Clean Card format inside Modal) */}
        <div className="p-6 overflow-y-auto max-h-[400px]">
          {/* Status Alert Banner */}
          <div className="mb-5 p-3.5 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-game-success shrink-0" />
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                Payment Collected
              </p>
              <p className="text-[11px] text-game-muted">
                Transaction finalized. Receipt ready to print.
              </p>
            </div>
          </div>

          {/* Clean Receipt Container */}
          <div 
            ref={printAreaRef}
            className="bg-[#0B1020] border border-slate-800 rounded-xl p-5 font-mono space-y-4"
          >
            {/* Header branding */}
            <div className="text-center border-b border-dashed border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                {cafeInfo?.name || 'GameHub Cafe'}
              </h3>
              <p className="text-[10px] text-game-muted mt-1 leading-relaxed">
                {cafeInfo?.address || 'Sector V, Salt Lake, Kolkata'}
              </p>
              {cafeInfo?.gstNumber && (
                <p className="text-[10px] text-game-primary mt-0.5">
                  GSTIN: {cafeInfo.gstNumber}
                </p>
              )}
            </div>

            {/* Meta Details */}
            <div className="space-y-1 text-xs border-b border-dashed border-slate-800 pb-3">
              <div className="flex justify-between">
                <span className="text-game-muted">Invoice No:</span>
                <span className="text-white font-bold">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-game-muted">Date:</span>
                <span className="text-slate-300">{dateFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-game-muted">Customer:</span>
                <span className="text-white">{invoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-game-muted">Mobile:</span>
                <span className="text-slate-300">{invoice.customerPhone}</span>
              </div>
            </div>

            {/* Calculations Breakdown Table */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between font-bold text-game-muted border-b border-slate-900 pb-1.5">
                <span>ITEM/STATION</span>
                <span>DURATION</span>
                <span className="text-right">AMOUNT</span>
              </div>
              <div className="flex justify-between text-white font-medium">
                <div>
                  <p>{invoice.deviceId}</p>
                  <p className="text-[10px] text-game-muted">({invoice.playersCount} Players @ ₹{invoice.pricingRate}/hr)</p>
                </div>
                <span>{invoice.duration} Min</span>
                <span className="font-mono">₹{invoice.subtotal}</span>
              </div>
            </div>

            {/* Taxes and Net Payable */}
            <div className="border-t border-dashed border-slate-800 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-game-muted">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-300">₹{invoice.subtotal}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between text-game-muted">
                  <span>GST ({cafeInfo?.gstRate || 18}%):</span>
                  <span className="font-mono text-slate-300">₹{invoice.tax}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-900">
                <span className="text-game-success font-sans uppercase font-bold tracking-wider">Net Paid:</span>
                <span className="text-game-success font-mono">₹{invoice.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-800 bg-[#0B1020]/50">
          <button
            onClick={handleWhatsAppShare}
            className="px-3.5 py-2 rounded-lg border border-green-500/20 text-green-400 hover:bg-green-500/10 active:scale-95 transition-all text-xs font-bold flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            WhatsApp
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5"
            >
              <Printer className="w-4 h-4" />
              Print Thermal
            </button>
            <button
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-3.5"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
