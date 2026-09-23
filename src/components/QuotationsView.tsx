import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { 
  FileText, 
  Search, 
  Plus, 
  ArrowLeft, 
  Trash2, 
  Download, 
  Share2, 
  Check, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  X,
  PlusCircle,
  MinusCircle,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Product, Customer, SaleItem, Quotation, UserRole, Sale } from '../types';

interface QuotationsViewProps {
  quotations: Quotation[];
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  currentUser: any;
  branchId: string;
  currencySymbol: string;
  taxPercentage: number;
  onAddCustomer: (newCust: any) => Promise<any>;
  onCreateQuotation: (newQuot: Omit<Quotation, 'id' | 'quotationNumber' | 'timestamp'>) => Promise<Quotation>;
}

export default function QuotationsView({
  quotations,
  sales,
  products,
  customers,
  currentUser,
  branchId,
  currencySymbol,
  taxPercentage,
  onAddCustomer,
  onCreateQuotation,
}: QuotationsViewProps) {
  // Navigation state
  const [isCreating, setIsCreating] = useState(false);
  
  // Customer Profile Modal state
  const [selectedProfileCustomer, setSelectedProfileCustomer] = useState<Customer | null>(null);
  const [profileModalTab, setProfileModalTab] = useState<'quotes' | 'sales'>('quotes');
  
  // Create state variables
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  // Freeform client fallback (highly requested for non-loyalty general quotation requests)
  const [isFreeformClient, setIsFreeformClient] = useState(true);
  const [freeformName, setFreeformName] = useState('');
  const [freeformPhone, setFreeformPhone] = useState('');
  const [freeformEmail, setFreeformEmail] = useState('');
  
  // Items in the quote cart
  const [quoteCart, setQuoteCart] = useState<SaleItem[]>([]);
  const [validUntilDate, setValidUntilDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // default 14 days
    return d.toISOString().slice(0, 10);
  });
  const [quoteNotes, setQuoteNotes] = useState('Payment within validity period. Subject to stock availability.');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [quotationSearchQuery, setQuotationSearchQuery] = useState('');

  // Share Dialog / Modal state
  const [activeShareQuote, setActiveShareQuote] = useState<Quotation | null>(null);
  const [shareSuccessAlert, setShareSuccessAlert] = useState(false);

  // Active customer helper
  const activeCustomer = useMemo(() => {
    if (isFreeformClient) {
      return {
        name: freeformName || 'Walk-in Client',
        phone: freeformPhone || '',
        email: freeformEmail || '',
      };
    }
    const registered = customers.find(c => c.id === selectedCustomerId);
    return registered ? {
      name: registered.name,
      phone: registered.phone,
      email: registered.email,
    } : { name: 'Walk-in Client', phone: '', email: '' };
  }, [isFreeformClient, selectedCustomerId, freeformName, freeformPhone, freeformEmail, customers]);

  // Filtered quotations and sales for selected profile customer
  const customerQuotations = useMemo(() => {
    if (!selectedProfileCustomer) return [];
    return quotations.filter(q => q.customerId === selectedProfileCustomer.id || (q.customerName && q.customerName.toLowerCase() === selectedProfileCustomer.name.toLowerCase()));
  }, [quotations, selectedProfileCustomer]);

  const customerSales = useMemo(() => {
    if (!selectedProfileCustomer) return [];
    return sales.filter(s => s.customerId === selectedProfileCustomer.id || (s.customerName && s.customerName.toLowerCase() === selectedProfileCustomer.name.toLowerCase()));
  }, [sales, selectedProfileCustomer]);

  // Filtered product list for selection
  const filteredProducts = useMemo(() => {
    const q = productSearchQuery.toLowerCase().trim();
    if (!q) return products.filter(p => p.quantity > 0);
    return products.filter(p => 
      p.quantity > 0 && (
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    );
  }, [products, productSearchQuery]);

  // Filtered list of quotations for display
  const filteredQuotations = useMemo(() => {
    const q = quotationSearchQuery.toLowerCase().trim();
    if (!q) return quotations;
    return quotations.filter(quot => 
      quot.quotationNumber.toLowerCase().includes(q) ||
      (quot.customerName && quot.customerName.toLowerCase().includes(q)) ||
      (quot.cashierName && quot.cashierName.toLowerCase().includes(q))
    );
  }, [quotations, quotationSearchQuery]);

  // Cart math
  const cartSubtotal = useMemo(() => {
    return quoteCart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [quoteCart]);

  const cartTax = useMemo(() => {
    // 15% Standard VAT included
    return (cartSubtotal * taxPercentage) / (100 + taxPercentage);
  }, [cartSubtotal, taxPercentage]);

  const cartTotal = useMemo(() => {
    return cartSubtotal;
  }, [cartSubtotal]);

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setQuoteCart(prev => {
      const exists = prev.find(item => item.productId === product.id);
      if (exists) {
        const nextQty = exists.quantity + 1;
        return prev.map(item => 
          item.productId === product.id
            ? { ...item, quantity: nextQty, subtotal: (item.price - item.discount) * nextQty }
            : item
        );
      } else {
        const newItem: SaleItem = {
          id: 'item_' + Math.random().toString(36).substr(2, 9),
          productId: product.id,
          name: product.name,
          barcode: product.barcode,
          quantity: 1,
          price: product.sellingPrice,
          discount: 0,
          tax: 0,
          subtotal: product.sellingPrice
        };
        return [...prev, newItem];
      }
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setQuoteCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          return {
            ...item,
            quantity: nextQty,
            subtotal: (item.price - item.discount) * nextQty
          };
        }
        return item;
      }).filter(Boolean) as SaleItem[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setQuoteCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Generate and Download PDF offline/online
  const handleDownloadPDF = (quotation: Quotation) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = '#1e3a8a'; // slate blue
    const accentColor = '#3b82f6';
    const darkGray = '#334155';
    const lightGray = '#f8fafc';

    // PDF borders & branding bar
    doc.setFillColor(30, 58, 138); // primary hex
    doc.rect(0, 0, 210, 8, 'F');

    // Header Text
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138);
    doc.text('COBULT STOCKS RETAIL', 14, 25);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Branch: ${quotation.branchId === 'b1' ? 'Harare CBD Main' : 'Bulawayo City Center'}`, 14, 30);
    doc.text('Zimbabwe Multi-Terminal Wholesale & POS System', 14, 34);

    // Document Title Banner Right Side
    doc.setFillColor(241, 245, 249);
    doc.rect(130, 18, 66, 18, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('PRO-FORMA QUOTE', 133, 24);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Ref: ${quotation.quotationNumber}`, 133, 29);
    doc.text(`Date: ${new Date(quotation.timestamp).toLocaleDateString()}`, 133, 33);

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 40, 196, 40);

    // Quote details columns
    // Left: Prepared For
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.text('PREPARED FOR CLIENT:', 14, 48);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(quotation.customerName || 'Walk-in Client', 14, 54);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    if (quotation.customerPhone) doc.text(`Phone: ${quotation.customerPhone}`, 14, 59);
    if (quotation.customerEmail) doc.text(`Email: ${quotation.customerEmail}`, 14, 63);

    // Right: Issuer & Validity
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.text('QUOTATION VALIDITY:', 120, 48);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString()}`, 120, 54);
    doc.text(`Issued By: ${quotation.cashierName}`, 120, 59);
    doc.text(`Status: ${quotation.status}`, 120, 63);

    // Items table header
    const tableTop = 72;
    doc.setFillColor(30, 58, 138);
    doc.rect(14, tableTop, 182, 7.5, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('DESCRIPTION', 16, tableTop + 5);
    doc.text('BARCODE', 90, tableTop + 5);
    doc.text('QTY', 125, tableTop + 5);
    doc.text('UNIT PRICE', 142, tableTop + 5);
    doc.text('SUBTOTAL', 172, tableTop + 5);

    // Table rows
    let currentY = tableTop + 7.5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    quotation.items.forEach((item, index) => {
      // Alternate background colors for rows
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, currentY, 182, 8, 'F');
      }

      doc.setFont('Helvetica', 'bold');
      doc.text(item.name.substring(0, 38), 16, currentY + 5.5);
      doc.setFont('Helvetica', 'normal');
      doc.text(item.barcode, 90, currentY + 5.5);
      doc.text(item.quantity.toString(), 125, currentY + 5.5);
      doc.text(`${currencySymbol}${item.price.toFixed(2)}`, 142, currentY + 5.5);
      doc.text(`${currencySymbol}${item.subtotal.toFixed(2)}`, 172, currentY + 5.5);

      currentY += 8;
    });

    // Summary block
    doc.setDrawColor(226, 232, 240);
    doc.line(14, currentY + 2, 196, currentY + 2);

    currentY += 6;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Subtotal:', 130, currentY + 4);
    doc.text(`VAT (${taxPercentage}% Included):`, 130, currentY + 9);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('GRAND TOTAL:', 130, currentY + 16);

    // Summary values
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`${currencySymbol}${quotation.subtotal.toFixed(2)}`, 172, currentY + 4);
    doc.text(`${currencySymbol}${quotation.taxTotal.toFixed(2)}`, 172, currentY + 9);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text(`${currencySymbol}${quotation.total.toFixed(2)}`, 172, currentY + 16);

    // Terms / Notes
    currentY += 24;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, currentY, 182, 18, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('NOTES & GENERAL TERMS:', 17, currentY + 5);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(quotation.notes || 'No notes specified.', 17, currentY + 10);
    doc.text('This document is a formal pro-forma quotation generated on terminal. Offline state preserves compliance.', 17, currentY + 14);

    // Footer signature block
    currentY += 26;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Cobult POS Retail Ledger • CloudSync System Enabled', 14, currentY);
    doc.text('Generated instantly on client side. Perfect for offline deployment.', 120, currentY);

    // Download file
    doc.save(`${quotation.quotationNumber}_Quotation.pdf`);
  };

  // Compile detailed text message for WhatsApp API sharing
  const getWhatsAppMessage = (quotation: Quotation) => {
    const branchName = quotation.branchId === 'b1' ? 'Harare CBD Branch' : 'Bulawayo City Branch';
    let msg = `*COBULT STOCKS RETAIL - PRO-FORMA QUOTATION*\n`;
    msg += `-------------------------------------------\n`;
    msg += `*Quote Ref:* ${quotation.quotationNumber}\n`;
    msg += `*Date:* ${new Date(quotation.timestamp).toLocaleDateString()}\n`;
    msg += `*Validity:* Valid Until ${new Date(quotation.validUntil).toLocaleDateString()}\n`;
    msg += `*Branch:* ${branchName}\n`;
    msg += `*Issued By:* ${quotation.cashierName}\n\n`;
    msg += `*Client Details:*\n`;
    msg += `• Name: ${quotation.customerName || 'General Client'}\n`;
    if (quotation.customerPhone) msg += `• Phone: ${quotation.customerPhone}\n`;
    msg += `-------------------------------------------\n`;
    msg += `*Itemized Bill:*\n`;

    quotation.items.forEach(item => {
      msg += `• ${item.name} (x${item.quantity}) — *${currencySymbol}${item.price.toFixed(2)}* each | Total: *${currencySymbol}${item.subtotal.toFixed(2)}*\n`;
    });

    msg += `-------------------------------------------\n`;
    msg += `*Subtotal:* ${currencySymbol}${quotation.subtotal.toFixed(2)}\n`;
    msg += `*VAT (${taxPercentage}% Included):* ${currencySymbol}${quotation.taxTotal.toFixed(2)}\n`;
    msg += `*GRAND TOTAL: ${currencySymbol}${quotation.total.toFixed(2)}*\n\n`;
    if (quotation.notes) msg += `*Notes:* _${quotation.notes}_\n\n`;
    msg += `Thank you for choosing Cobult Retail. Please find the PDF copy attached or request download at our counter!`;
    return msg;
  };

  // Trigger WhatsApp share window
  const handleShareWhatsApp = (quotation: Quotation) => {
    const rawMsg = getWhatsAppMessage(quotation);
    const encoded = encodeURIComponent(rawMsg);
    const phoneClean = (quotation.customerPhone || '').trim().replace(/[+\s-]/g, '');
    
    // Create WhatsApp Web or API share url
    let url = `https://api.whatsapp.com/send?text=${encoded}`;
    if (phoneClean) {
      url = `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encoded}`;
    }
    
    // Open standard target window
    window.open(url, '_blank');
  };

  const handleCopyClipboard = (quotation: Quotation) => {
    const text = getWhatsAppMessage(quotation);
    navigator.clipboard.writeText(text);
    setShareSuccessAlert(true);
    setTimeout(() => setShareSuccessAlert(false), 3000);
  };

  // Save quotation
  const handleSaveQuotation = async () => {
    if (quoteCart.length === 0) {
      alert('Cannot create an empty quotation. Please add some products.');
      return;
    }

    const calculatedSubtotal = cartSubtotal;
    const calculatedTax = cartTax;
    const calculatedTotal = cartTotal;

    const quotData = {
      cashierId: currentUser.id,
      cashierName: currentUser.username,
      customerId: isFreeformClient ? undefined : selectedCustomerId,
      customerName: activeCustomer.name,
      customerPhone: activeCustomer.phone,
      customerEmail: activeCustomer.email,
      items: quoteCart,
      subtotal: calculatedSubtotal,
      discountTotal: 0,
      taxTotal: calculatedTax,
      total: calculatedTotal,
      status: 'Pending' as const,
      validUntil: validUntilDate,
      branchId: branchId === 'all' ? 'b1' : branchId,
      notes: quoteNotes,
    };

    try {
      const createdQuot = await onCreateQuotation(quotData);
      
      // Auto-trigger share dialog/preview
      setActiveShareQuote(createdQuot);
      
      // Clear draft state
      setQuoteCart([]);
      setFreeformName('');
      setFreeformPhone('');
      setFreeformEmail('');
      setSelectedCustomerId('');
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 14);
      setValidUntilDate(defaultDate.toISOString().slice(0, 10));
      setIsCreating(false);
    } catch (err) {
      alert('Error saving quotation.');
    }
  };

  return (
    <div className="flex-1 bg-[#0F1115] text-slate-100 flex flex-col min-h-0 overflow-y-auto" id="quotation_view_container">
      {/* 1. TOP SUB-HEADER CONTROL */}
      <div className="bg-[#16191F] border-b border-[#2D3139] px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-sans font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Quotations & Pro-forma Bills
          </h2>
          <p className="text-xs text-[#94A3B8]">
            Generate, download, and send official client quotes. Fully compatible with offline operations.
          </p>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-lg"
            id="btn_create_quotation_tab"
          >
            <Plus className="w-4 h-4" />
            Create New Quotation
          </button>
        )}
      </div>

      {/* 2. BODY PANELS */}
      <div className="p-6 flex-1 flex flex-col min-h-0">
        {!isCreating ? (
          /* ==================================================================== */
          /*                       QUOTATIONS DASHBOARD / LIST                    */
          /* ==================================================================== */
          <div className="space-y-4">
            {/* Search/Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex items-center gap-3 bg-[#16191F] border border-[#2D3139] px-4 py-3 rounded-xl max-w-md flex-1">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search quotations by number, client..."
                  value={quotationSearchQuery}
                  onChange={(e) => setQuotationSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-xs w-full text-white placeholder-slate-500 font-sans outline-none"
                />
                {quotationSearchQuery && (
                  <button onClick={() => setQuotationSearchQuery('')} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Customer Profile Hub Dropdown */}
              <div className="flex items-center gap-2 bg-[#16191F] border border-[#2D3139] px-4 py-3 rounded-xl sm:max-w-xs w-full sm:w-auto">
                <User className="w-4 h-4 text-blue-400" />
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const cust = customers.find(c => c.id === val);
                      if (cust) setSelectedProfileCustomer(cust);
                      e.target.value = ''; // Reset select
                    }
                  }}
                  className="bg-[#16191F] border-none focus:ring-0 text-xs text-slate-200 outline-none pr-8 cursor-pointer font-sans w-full"
                >
                  <option value="" className="bg-[#16191F] text-slate-400">-- Quick Customer Profiles --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#16191F] text-slate-200">
                      {c.name} ({c.customerNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List Table */}
            <div className="bg-[#16191F] border border-[#2D3139] rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1C2028] border-b border-[#2D3139] text-[#94A3B8] font-mono uppercase tracking-wider">
                      <th className="p-4 font-semibold">Ref Number</th>
                      <th className="p-4 font-semibold">Client / Customer</th>
                      <th className="p-4 font-semibold">Date</th>
                      <th className="p-4 font-semibold">Valid Until</th>
                      <th className="p-4 font-semibold">Total Amount</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D3139]">
                    {filteredQuotations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="w-10 h-10 text-slate-600 animate-pulse" />
                            <p className="font-sans font-medium text-slate-300">No quotations found</p>
                            <p className="text-[11px] text-slate-500">Create a quotation offline or online to start billing general clients.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredQuotations.map((quot) => {
                        const todayStr = new Date().toISOString().slice(0, 10);
                        const isExpired = quot.validUntil < todayStr;
                        return (
                          <tr 
                            key={quot.id} 
                            className={`transition-colors border-l-2 ${
                              isExpired 
                                ? 'bg-rose-950/10 hover:bg-rose-950/20 border-l-rose-500/80 text-slate-300' 
                                : 'hover:bg-[#1A1D23] border-l-transparent'
                            }`}
                          >
                            <td className="p-4 font-semibold text-white">
                              <span className="flex items-center gap-1.5 font-mono">
                                {isExpired && (
                                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" title="Expired Quotation" />
                                )}
                                <span className={isExpired ? 'text-rose-400' : 'text-white'}>
                                  {quot.quotationNumber}
                                </span>
                                {quot.isOffline && (
                                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 py-0.5 rounded text-[8px] uppercase tracking-wide">
                                    Offline
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="p-4">
                              {(() => {
                                const matchedCustomer = customers.find(c => c.id === quot.customerId || (quot.customerName && c.name.toLowerCase() === quot.customerName.toLowerCase()));
                                if (matchedCustomer) {
                                  return (
                                    <button
                                      onClick={() => setSelectedProfileCustomer(matchedCustomer)}
                                      className="font-sans font-medium text-blue-400 hover:text-blue-300 hover:underline text-left flex items-center gap-1 focus:outline-none"
                                    >
                                      <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                      <span>{quot.customerName}</span>
                                    </button>
                                  );
                                }
                                return (
                                  <div className="font-sans font-medium text-slate-300">{quot.customerName || 'Walk-in Client'}</div>
                                );
                              })()}
                              {quot.customerPhone && (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{quot.customerPhone}</div>
                              )}
                            </td>
                            <td className="p-4 text-slate-300 font-mono">
                              {new Date(quot.timestamp).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <Calendar className={`w-3.5 h-3.5 ${isExpired ? 'text-rose-400' : 'text-slate-400'}`} />
                                <span className={`font-mono ${isExpired ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                                  {new Date(quot.validUntil).toLocaleDateString()}
                                </span>
                              </div>
                              {isExpired && (
                                <span className="text-[10px] text-rose-400 font-semibold font-sans flex items-center gap-1 mt-1">
                                  <AlertCircle className="w-3 h-3 text-rose-400 animate-pulse shrink-0" />
                                  Expired
                                </span>
                              )}
                            </td>
                            <td className="p-4 font-semibold text-blue-400 font-mono text-sm">
                              {currencySymbol}{quot.total.toFixed(2)}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium font-sans border ${
                                isExpired
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                {isExpired ? 'Expired' : 'Active'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleDownloadPDF(quot)}
                                  className="p-2 bg-[#1A1D23] border border-[#2D3139] hover:bg-[#2D3139] text-blue-400 hover:text-white rounded-lg transition-all"
                                  title="Download Offline PDF Invoice"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setActiveShareQuote(quot)}
                                  className="p-2 bg-[#1A1D23] border border-[#2D3139] hover:bg-[#2D3139] text-emerald-400 hover:text-white rounded-lg transition-all"
                                  title="Send as PDF summary on WhatsApp"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ==================================================================== */
          /*                        NEW QUOTATION CREATOR                         */
          /* ==================================================================== */
          <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0" id="quotation_creation_interface">
            {/* Left Hand: Product Catalog & Selected Lines */}
            <div className="flex-1 bg-[#16191F] border border-[#2D3139] rounded-2xl flex flex-col min-h-0 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#2D3139] pb-3">
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex items-center gap-1.5 text-[#94A3B8] hover:text-white text-xs transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Dashboard
                </button>
                <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-semibold">
                  New Quotation Mode
                </span>
              </div>

              {/* Product Search Catalog */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[#94A3B8] uppercase">Search Stock Catalog</label>
                <div className="flex items-center gap-3 bg-[#1A1D23] border border-[#2D3139] px-3.5 py-2.5 rounded-xl">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search products by barcode, SKU, or name..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-xs w-full text-white placeholder-slate-500 font-sans outline-none"
                  />
                </div>

                {/* Dropdown-style visual results picker */}
                {productSearchQuery && (
                  <div className="max-h-48 overflow-y-auto border border-[#2D3139] bg-[#1A1D23] rounded-xl divide-y divide-[#2D3139] z-10 relative">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs">No matching products found</div>
                    ) : (
                      filteredProducts.map(prod => (
                        <div
                          key={prod.id}
                          onClick={() => {
                            handleAddToCart(prod);
                            setProductSearchQuery('');
                          }}
                          className="p-3 hover:bg-[#252A34] transition-colors flex justify-between items-center cursor-pointer text-xs"
                        >
                          <div>
                            <span className="text-white font-medium block">{prod.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{prod.sku} • Barcode: {prod.barcode}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-blue-400 font-bold font-mono block">{currencySymbol}{prod.sellingPrice.toFixed(2)}</span>
                            <span className={`text-[9px] font-semibold ${prod.quantity <= prod.minQuantity ? 'text-amber-400' : 'text-slate-400'}`}>
                              Stock: {prod.quantity} units
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Added Items (Quote Cart) */}
              <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
                <label className="text-[10px] font-mono text-[#94A3B8] uppercase">Line Items Included</label>
                <div className="flex-1 border border-[#2D3139] bg-[#1A1D23] rounded-xl overflow-y-auto divide-y divide-[#2D3139] p-3">
                  {quoteCart.length === 0 ? (
                    <div className="h-full flex flex-col justify-center items-center text-slate-500 p-8 space-y-2 text-center">
                      <FileText className="w-8 h-8 text-slate-700" />
                      <p className="font-sans text-xs">Your quote worksheet is empty.</p>
                      <p className="text-[10px] text-slate-500">Search products above and click to append lines.</p>
                    </div>
                  ) : (
                    quoteCart.map(item => (
                      <div key={item.productId} className="py-2.5 flex justify-between items-center gap-3">
                        <div className="flex-1 leading-tight">
                          <span className="text-xs text-white font-medium block">{item.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">{item.barcode}</span>
                        </div>
                        
                        {/* Adjust quantities */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateQty(item.productId, -1)}
                            className="text-[#94A3B8] hover:text-white transition-colors"
                          >
                            <MinusCircle className="w-5 h-5" />
                          </button>
                          <span className="text-xs text-white font-mono w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQty(item.productId, 1)}
                            className="text-[#94A3B8] hover:text-white transition-colors"
                          >
                            <PlusCircle className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Adjust Unit Price display */}
                        <div className="text-right w-24">
                          <span className="text-xs text-slate-400 font-mono block">{currencySymbol}{item.price.toFixed(2)} ea</span>
                          <span className="text-xs text-blue-400 font-bold font-mono block">{currencySymbol}{item.subtotal.toFixed(2)}</span>
                        </div>

                        {/* Trash */}
                        <button
                          onClick={() => handleRemoveFromCart(item.productId)}
                          className="p-1.5 hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Hand: Client selection & Final confirmation */}
            <div className="w-full md:w-80 space-y-4 shrink-0">
              {/* Customer Selector / Freeform Details */}
              <div className="bg-[#16191F] border border-[#2D3139] rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-mono uppercase text-white border-b border-[#2D3139] pb-2 flex items-center justify-between">
                  <span>Client & Delivery</span>
                  <button
                    onClick={() => setIsFreeformClient(!isFreeformClient)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-sans"
                  >
                    {isFreeformClient ? 'Use Registered list' : 'Free-form detail'}
                  </button>
                </h3>

                {isFreeformClient ? (
                  /* Freeform Client Mode */
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#94A3B8] font-mono uppercase block">Client Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Tendai Musasa"
                        value={freeformName}
                        onChange={(e) => setFreeformName(e.target.value)}
                        className="w-full bg-[#1A1D23] border border-[#2D3139] focus:border-blue-500 px-3 py-2 rounded-xl text-white outline-none font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#94A3B8] font-mono uppercase block">Client WhatsApp Phone</label>
                      <input
                        type="text"
                        placeholder="e.g. +263772111222"
                        value={freeformPhone}
                        onChange={(e) => setFreeformPhone(e.target.value)}
                        className="w-full bg-[#1A1D23] border border-[#2D3139] focus:border-blue-500 px-3 py-2 rounded-xl text-white outline-none font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#94A3B8] font-mono uppercase block">Client Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. client@natfoods.co.zw"
                        value={freeformEmail}
                        onChange={(e) => setFreeformEmail(e.target.value)}
                        className="w-full bg-[#1A1D23] border border-[#2D3139] focus:border-blue-500 px-3 py-2 rounded-xl text-white outline-none font-sans"
                      />
                    </div>
                  </div>
                ) : (
                  /* Registered customer selection */
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#94A3B8] font-mono uppercase block">Search Registered Customer</label>
                      <div className="flex items-center gap-2 bg-[#1A1D23] border border-[#2D3139] px-2.5 py-2 rounded-xl">
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Type customer name/phone..."
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          className="bg-transparent border-none text-xs w-full text-white placeholder-slate-500 font-sans outline-none focus:ring-0"
                        />
                      </div>
                    </div>
                    
                    {/* Render dropdown options if active search */}
                    {customerSearchQuery && (
                      <div className="max-h-36 overflow-y-auto bg-[#1A1D23] border border-[#2D3139] rounded-xl divide-y divide-[#2D3139]">
                        {customers
                          .filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                          .map(c => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setCustomerSearchQuery('');
                              }}
                              className="p-2 hover:bg-[#252A34] transition-colors cursor-pointer"
                            >
                              <span className="font-medium text-white block">{c.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">{c.phone}</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {selectedCustomerId && (
                      <div className="p-3 bg-[#1A1D23] border border-blue-500/20 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white block">{activeCustomer.name}</span>
                            <span className="text-[10px] text-slate-400 block">{activeCustomer.phone || 'No Phone Number'}</span>
                          </div>
                          <button
                            onClick={() => setSelectedCustomerId('')}
                            className="text-slate-400 hover:text-white focus:outline-none"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const found = customers.find(c => c.id === selectedCustomerId);
                            if (found) setSelectedProfileCustomer(found);
                          }}
                          className="text-[10px] font-sans font-semibold text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 mt-1 focus:outline-none border-t border-[#2D3139] pt-2 w-full text-left"
                        >
                          <FileText className="w-3 h-3 text-blue-500" />
                          View Past Sales & Quotes
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Validity and notes */}
              <div className="bg-[#16191F] border border-[#2D3139] rounded-2xl p-5 space-y-3 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#94A3B8] font-mono uppercase block">Valid Until Date</label>
                  <input
                    type="date"
                    value={validUntilDate}
                    onChange={(e) => setValidUntilDate(e.target.value)}
                    className="w-full bg-[#1A1D23] border border-[#2D3139] focus:border-blue-500 px-3 py-2 rounded-xl text-white outline-none font-sans scheme-dark"
                  />
                  
                  {/* Preset helpers */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        setValidUntilDate(d.toISOString().slice(0, 10));
                      }}
                      className="flex-1 py-1 px-2 bg-[#1A1D23] hover:bg-[#252A34] border border-[#2D3139] text-[#94A3B8] hover:text-white rounded-lg text-[10px] font-sans transition-colors"
                    >
                      +7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 14);
                        setValidUntilDate(d.toISOString().slice(0, 10));
                      }}
                      className="flex-1 py-1 px-2 bg-[#1A1D23] hover:bg-[#252A34] border border-[#2D3139] text-[#94A3B8] hover:text-white rounded-lg text-[10px] font-sans transition-colors"
                    >
                      +14 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        setValidUntilDate(d.toISOString().slice(0, 10));
                      }}
                      className="flex-1 py-1 px-2 bg-[#1A1D23] hover:bg-[#252A34] border border-[#2D3139] text-[#94A3B8] hover:text-white rounded-lg text-[10px] font-sans transition-colors"
                    >
                      +30 Days
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#94A3B8] font-mono uppercase block">Quotation Footnote / Notes</label>
                  <textarea
                    placeholder="Enter special billing instructions, payment terms, or custom note..."
                    rows={3}
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    className="w-full bg-[#1A1D23] border border-[#2D3139] focus:border-blue-500 px-3 py-2 rounded-xl text-white outline-none font-sans text-[11px]"
                  />
                </div>
              </div>

              {/* Pricing totals worksheet */}
              <div className="bg-[#16191F] border border-[#2D3139] rounded-2xl p-5 space-y-3.5">
                <h3 className="text-xs font-mono uppercase text-[#94A3B8] border-b border-[#2D3139] pb-2">
                  Total Summary
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal:</span>
                    <span className="font-mono">{currencySymbol}{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>VAT Included ({taxPercentage}%):</span>
                    <span className="font-mono">{currencySymbol}{cartTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-sm border-t border-[#2D3139] pt-2.5">
                    <span>Grand Total:</span>
                    <span className="font-mono text-blue-400">{currencySymbol}{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleSaveQuotation}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold font-sans transition-all shadow-lg text-center"
                  id="btn_publish_quote"
                >
                  Save & Print Quotation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/*               SHARE / WHATASPP DIALOG MODAL SYSTEM                   */}
      {/* ==================================================================== */}
      {activeShareQuote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="max-w-md w-full bg-[#16191F] border border-[#2D3139] p-6 rounded-2xl space-y-4 shadow-2xl relative text-xs">
            <button
              onClick={() => setActiveShareQuote(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1 pb-2 border-b border-[#2D3139]">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-sans font-bold text-white uppercase">Quotation Created!</h3>
              <p className="text-slate-400">Ref: <span className="font-mono text-blue-400">{activeShareQuote.quotationNumber}</span></p>
            </div>

            <p className="text-slate-300 text-center leading-relaxed">
              Your quotation for <strong className="text-white">{activeShareQuote.customerName || 'Walk-In Client'}</strong> was compiled successfully.
              The quote has been persisted. Choose your action below:
            </p>

            {/* Notification alert */}
            {shareSuccessAlert && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center rounded-xl font-medium font-sans">
                Copied pro-forma quote text to clipboard!
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  handleDownloadPDF(activeShareQuote);
                }}
                className="w-full py-2.5 bg-[#1A1D23] border border-[#2D3139] hover:bg-[#2D3139] text-white hover:text-blue-400 rounded-xl transition-all font-semibold flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF Copy (Offline Ready)
              </button>

              <button
                onClick={() => {
                  handleShareWhatsApp(activeShareQuote);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-semibold flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Open WhatsApp & Send Bill
              </button>

              <button
                onClick={() => {
                  handleCopyClipboard(activeShareQuote);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all font-semibold flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Copy Text Format to Clipboard
              </button>
            </div>

            <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800 flex gap-2 text-[11px] text-slate-400 leading-normal">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Offline compliance tip:</strong> Since WhatsApp does not support local attachment injection from deep-links offline, download the PDF above first, then attach the file in the WhatsApp window.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/*               CUSTOMER PROFILE / HISTORY MODAL SYSTEM                */}
      {/* ==================================================================== */}
      {selectedProfileCustomer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-fade-in" id="customer_profile_modal">
          <div className="max-w-4xl w-full bg-[#16191F] border border-[#2D3139] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#2D3139] flex justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-sans font-bold text-white flex items-center gap-2">
                      {selectedProfileCustomer.name}
                      <span className="text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                        {selectedProfileCustomer.customerNumber}
                      </span>
                    </h3>
                    <p className="text-xs text-[#94A3B8]">
                      Registered Loyalty Member profile and comprehensive business summary.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedProfileCustomer(null)}
                className="p-1.5 bg-[#1A1D23] hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300">
              {/* Profile Details & Tier Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Contact details */}
                <div className="bg-[#1A1D23] border border-[#2D3139] rounded-xl p-4 space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-[#2D3139] pb-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    Contact details
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span className="font-mono text-slate-200">{selectedProfileCustomer.phone || 'No phone number'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span className="truncate text-slate-200">{selectedProfileCustomer.email || 'No email registered'}</span>
                    </div>
                    <div className="text-slate-400 leading-normal text-[11px] pt-1 border-t border-[#2D3139]/50">
                      <strong>Billing Address:</strong><br />
                      {selectedProfileCustomer.address || 'No physical address specified.'}
                    </div>
                  </div>
                </div>

                {/* Loyalty Point stats */}
                <div className="bg-[#1A1D23] border border-[#2D3139] rounded-xl p-4 space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-[#2D3139] pb-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Loyalty & Tiers
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-center h-[calc(100%-2rem)] items-center">
                    <div className="bg-[#16191F] border border-[#2D3139] rounded-lg p-2">
                      <span className="text-[10px] text-slate-400 block font-mono">LOYALTY POINTS</span>
                      <strong className="text-xl text-emerald-400 font-mono block mt-1">
                        {selectedProfileCustomer.loyaltyPoints}
                      </strong>
                    </div>
                    <div className="bg-[#16191F] border border-[#2D3139] rounded-lg p-2">
                      <span className="text-[10px] text-slate-400 block font-mono">DISCOUNT LEVEL</span>
                      <strong className="text-xl text-blue-400 font-mono block mt-1">
                        {selectedProfileCustomer.discountLevel}%
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-[#1A1D23] border border-[#2D3139] rounded-xl p-4 space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-[#2D3139] pb-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Total Summary Stat
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-[#16191F] p-2 rounded-lg border border-[#2D3139]">
                      <span className="text-slate-400">Total Spent:</span>
                      <strong className="text-white font-mono text-sm">{currencySymbol}{customerSales.reduce((sum, s) => sum + s.total, 0).toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between items-center bg-[#16191F] p-2 rounded-lg border border-[#2D3139]">
                      <span className="text-slate-400">Total Sales Count:</span>
                      <strong className="text-white font-mono">{customerSales.length} Purchases</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistical cards layout */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#16191F] border border-[#2D3139] rounded-xl p-3.5 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Quotations</span>
                  <strong className="text-lg font-mono text-white block mt-1">{customerQuotations.length}</strong>
                </div>
                <div className="bg-[#16191F] border border-[#2D3139] rounded-xl p-3.5 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Quotation Value</span>
                  <strong className="text-lg font-mono text-blue-400 block mt-1">
                    {currencySymbol}{customerQuotations.reduce((sum, q) => sum + q.total, 0).toFixed(2)}
                  </strong>
                </div>
                <div className="bg-[#16191F] border border-[#2D3139] rounded-xl p-3.5 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Pending Quotes</span>
                  <strong className="text-lg font-mono text-amber-400 block mt-1">
                    {customerQuotations.filter(q => q.status === 'Pending').length}
                  </strong>
                </div>
                <div className="bg-[#16191F] border border-[#2D3139] rounded-xl p-3.5 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Pending Quotes Value</span>
                  <strong className="text-lg font-mono text-emerald-400 block mt-1">
                    {currencySymbol}{customerQuotations.filter(q => q.status === 'Pending').reduce((sum, q) => sum + q.total, 0).toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Main Profile Tabs */}
              <div className="space-y-4">
                <div className="flex border-b border-[#2D3139] gap-4 text-xs font-mono">
                  <button
                    onClick={() => setProfileModalTab('quotes')}
                    className={`pb-2.5 font-bold uppercase border-b-2 transition-colors ${
                      profileModalTab === 'quotes'
                        ? 'border-blue-500 text-white animate-pulse-subtle'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    Quotation History ({customerQuotations.length})
                  </button>
                  <button
                    onClick={() => setProfileModalTab('sales')}
                    className={`pb-2.5 font-bold uppercase border-b-2 transition-colors ${
                      profileModalTab === 'sales'
                        ? 'border-blue-500 text-white animate-pulse-subtle'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    Completed Sales History ({customerSales.length})
                  </button>
                </div>

                {/* Tab content renderer */}
                <div className="space-y-4">
                  {profileModalTab === 'quotes' ? (
                    customerQuotations.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 bg-[#1A1D23] border border-[#2D3139] rounded-xl">
                        No quotation history linked to this customer.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customerQuotations.map(quot => {
                          const todayStr = new Date().toISOString().slice(0, 10);
                          const isExpired = quot.validUntil < todayStr;
                          return (
                            <div key={quot.id} className="bg-[#1A1D23] border border-[#2D3139] rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-500/40 transition-colors">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-white font-semibold">{quot.quotationNumber}</span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold font-mono ${
                                    isExpired 
                                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                      : quot.status === 'Accepted'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : quot.status === 'Declined'
                                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}>
                                    {isExpired ? 'Expired' : quot.status}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-3">
                                  <span>Created: <strong>{new Date(quot.timestamp).toLocaleDateString()}</strong></span>
                                  <span>•</span>
                                  <span>Valid Until: <strong className={isExpired ? 'text-rose-400' : 'text-slate-300'}>{new Date(quot.validUntil).toLocaleDateString()}</strong></span>
                                  <span>•</span>
                                  <span>Cashier: <strong>{quot.cashierName}</strong></span>
                                </div>
                                <div className="text-[11px] text-slate-300 italic pt-1 border-t border-[#2D3139]/30 mt-1">
                                  <strong>Items:</strong> {quot.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-[#2D3139]/50 pt-2.5 md:pt-0">
                                <span className="font-semibold text-blue-400 font-mono text-sm">{currencySymbol}{quot.total.toFixed(2)}</span>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleDownloadPDF(quot)}
                                    className="p-2 bg-[#16191F] hover:bg-blue-600 border border-[#2D3139] hover:border-blue-500 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[10px] font-sans focus:outline-none"
                                    title="Download PDF quotation"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    customerSales.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 bg-[#1A1D23] border border-[#2D3139] rounded-xl">
                        No purchase history linked to this customer.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customerSales.map(sale => {
                          return (
                            <div key={sale.id} className="bg-[#1A1D23] border border-[#2D3139] rounded-xl p-4 space-y-3 hover:border-emerald-500/30 transition-colors">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-white font-semibold">{sale.invoiceNumber}</span>
                                    <span className="bg-[#16191F] px-1.5 py-0.5 rounded text-[8px] uppercase font-mono border border-[#2D3139] text-[#94A3B8]">
                                      {sale.paymentMethod}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`}>
                                      {sale.status}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3">
                                    <span>Date: <strong>{new Date(sale.timestamp).toLocaleString()}</strong></span>
                                    <span>•</span>
                                    <span>Issued By: <strong>{sale.cashierName}</strong></span>
                                    {sale.branchId && (
                                      <>
                                        <span>•</span>
                                        <span>Branch: <strong>{sale.branchId === 'b1' ? 'Harare CBD' : 'Bulawayo City'}</strong></span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right w-full md:w-auto">
                                  <span className="font-bold text-emerald-400 font-mono text-base">{currencySymbol}{sale.total.toFixed(2)}</span>
                                </div>
                              </div>
                              {/* Item lines expanded */}
                              <div className="bg-[#16191F] border border-[#2D3139] rounded-lg p-3 text-[11px] space-y-1.5">
                                <div className="font-semibold text-slate-400 uppercase tracking-wider font-mono text-[9px] border-b border-[#2D3139] pb-1">
                                  Purchased Items
                                </div>
                                <div className="divide-y divide-[#2D3139]/40 max-h-40 overflow-y-auto">
                                  {sale.items.map(item => (
                                    <div key={item.id || item.productId} className="py-1.5 flex justify-between items-center text-slate-300">
                                      <div>
                                        <span className="font-medium text-slate-200">{item.name}</span>
                                        <span className="text-[10px] text-slate-500 font-mono ml-2">({item.barcode})</span>
                                      </div>
                                      <div className="font-mono text-xs">
                                        <span>{item.quantity} x {currencySymbol}{item.price.toFixed(2)} = </span>
                                        <strong className="text-slate-100">{currencySymbol}{item.subtotal.toFixed(2)}</strong>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#2D3139] bg-[#1A1D23] flex justify-end">
              <button
                onClick={() => setSelectedProfileCustomer(null)}
                className="px-5 py-2 bg-[#16191F] border border-[#2D3139] hover:bg-[#2D3139] hover:text-white rounded-xl text-xs font-semibold font-sans transition-colors focus:outline-none"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
