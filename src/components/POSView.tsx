/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  User, 
  Plus, 
  Minus, 
  Trash2, 
  Tag, 
  Percent, 
  Receipt, 
  Pause, 
  Play, 
  RefreshCw, 
  CheckCircle, 
  Sparkles, 
  Layers,
  Keyboard,
  Camera,
  Printer,
  MessageSquare,
  Send,
  X
} from 'lucide-react';
import { Product, Customer, Sale, SaleItem, PaymentMethod } from '../types.ts';

interface POSViewProps {
  products: Product[];
  customers: Customer[];
  sales?: Sale[];
  onCompleteSale: (sale: Omit<Sale, 'id' | 'invoiceNumber' | 'timestamp'>) => void;
  currencySymbol: string;
  taxPercentage: number;
  cashierName: string;
  cashierId: string;
  branchId: string;
}

export default function POSView({
  products,
  customers,
  sales = [],
  onCompleteSale,
  currencySymbol,
  taxPercentage,
  cashierName,
  cashierId,
  branchId
}: POSViewProps) {
  // POS States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number>(0);
  
  // Customer Past Transactions History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Searchable Customer States
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [splitPayments, setSplitPayments] = useState({
    cash: 0,
    card: 0,
    ecoCash: 0,
    oneMoney: 0,
    bankTransfer: 0
  });

  // Hold / Resume States
  const [suspendedSales, setSuspendedSales] = useState<{ id: string; cart: SaleItem[]; customerId: string; timestamp: string }[]>([]);

  // Receipt view state
  const [showReceipt, setShowReceipt] = useState<Sale | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState('');

  // Prefill customer WhatsApp number when opening receipt
  useEffect(() => {
    if (showReceipt) {
      const cust = customers.find(c => c.id === showReceipt.customerId || c.name === showReceipt.customerName);
      if (cust && cust.phone) {
        setWhatsappPhone(cust.phone);
      } else {
        setWhatsappPhone('');
      }
    }
  }, [showReceipt, customers]);

  // Handle WhatsApp Receipt Dispatch
  const handleSendWhatsAppReceipt = () => {
    if (!showReceipt) return;

    const itemsText = showReceipt.items
      .map(item => `• *${item.name}* x${item.quantity} @ ${currencySymbol}${item.price.toFixed(2)} = ${currencySymbol}${item.subtotal.toFixed(2)}`)
      .join('\n');

    const receiptMessage = 
`🧾 *COBULT STOCKS RETAIL - OFFICIAL RECEIPT*
----------------------------------------
*Invoice #:* ${showReceipt.invoiceNumber}
*Date:* ${new Date(showReceipt.timestamp).toLocaleString()}
*Cashier:* ${showReceipt.cashierName}
${showReceipt.customerName ? `*Customer:* ${showReceipt.customerName}\n` : ''}
*PURCHASED ITEMS:*
${itemsText}

----------------------------------------
Subtotal: ${currencySymbol}${showReceipt.subtotal.toFixed(2)}
${showReceipt.discountTotal > 0 ? `Discount: -${currencySymbol}${showReceipt.discountTotal.toFixed(2)}\n` : ''}VAT (${taxPercentage}%): ${currencySymbol}${showReceipt.taxTotal.toFixed(2)}
*TOTAL PAID: ${currencySymbol}${showReceipt.total.toFixed(2)}*
Payment Method: ${showReceipt.paymentMethod}

Thank you for shopping with Cobult Stocks Retail!
For support: +263 771111222 / +263 242700000`;

    const cleanedPhone = whatsappPhone.replace(/[^0-9]/g, '');
    const whatsappUrl = cleanedPhone 
      ? `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(receiptMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(receiptMessage)}`;

    window.open(whatsappUrl, '_blank');
  };

  // Simulated Barcode camera scan state
  const [showCameraScan, setShowCameraScan] = useState(false);
  const [barcodeScanInput, setBarcodeScanInput] = useState('');

  // Categories helper
  const categories = useMemo(() => {
    const list = new Set(products.map(p => p.category));
    return ['All', ...Array.from(list)];
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.barcode.includes(searchQuery) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Get past 5 completed sales for the selected customer
  const customerPastSales = useMemo(() => {
    if (!selectedCustomerId) return [];
    return sales
      .filter(s => s.customerId === selectedCustomerId && s.status === 'Completed')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [sales, selectedCustomerId]);

  // Filtered customers for searchable dropdown
  const filteredCustomers = useMemo(() => {
    const query = customerSearchQuery.toLowerCase().trim();
    if (!query) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.customerNumber && c.customerNumber.toLowerCase().includes(query))
    );
  }, [customers, customerSearchQuery]);

  // Automatically apply VIP discount level when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      setOverallDiscountPercent(selectedCustomer.discountLevel || 0);
    } else {
      setOverallDiscountPercent(0);
    }
  }, [selectedCustomer]);

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (cartSubtotal * overallDiscountPercent) / 100;
  }, [cartSubtotal, overallDiscountPercent]);

  const cartTax = useMemo(() => {
    // Calculate 15% tax on discounted amount
    return ((cartSubtotal - discountAmount) * taxPercentage) / (100 + taxPercentage);
  }, [cartSubtotal, discountAmount, taxPercentage]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount);
  }, [cartSubtotal, discountAmount]);

  // Add Item to POS Cart
  const handleAddToCart = (product: Product) => {
    if (product.quantity <= 0) {
      alert(`${product.name} is currently Out of Stock.`);
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.productId === product.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        if (newQty > product.quantity) {
          alert(`Cannot sell more than available stock (${product.quantity} units).`);
          return prevCart;
        }
        return prevCart.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: newQty, subtotal: (item.price - item.discount) * newQty }
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
        return [...prevCart, newItem];
      }
    });
  };

  // Adjust quantity
  const handleUpdateQty = (productId: string, delta: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.productId === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > prod.quantity) {
            alert(`Requested quantity exceeds available stock (${prod.quantity} units).`);
            return item;
          }
          return {
            ...item,
            quantity: newQty,
            subtotal: (item.price - item.discount) * newQty
          };
        }
        return item;
      }).filter(Boolean) as SaleItem[];
    });
  };

  // Remove Item
  const handleRemoveFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  // Handle barcode scanning input simulation
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBarcode = barcodeScanInput.trim();
    if (!cleanBarcode) return;

    const prod = products.find(p => p.barcode === cleanBarcode);
    if (prod) {
      handleAddToCart(prod);
      setBarcodeScanInput('');
      setShowCameraScan(false);
    } else {
      alert(`No product found matching barcode: ${cleanBarcode}`);
    }
  };

  // Hold Current Sale
  const handleHoldSale = () => {
    if (cart.length === 0) return;
    const newSuspended = {
      id: 'sus_' + Math.random().toString(36).substr(2, 9),
      cart,
      customerId: selectedCustomerId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setSuspendedSales(prev => [...prev, newSuspended]);
    setCart([]);
    setSelectedCustomerId('');
    setOverallDiscountPercent(0);
    alert('Sale placed on hold successfully.');
  };

  // Resume Suspended Sale
  const handleResumeSale = (id: string) => {
    const suspended = suspendedSales.find(s => s.id === id);
    if (suspended) {
      setCart(suspended.cart);
      setSelectedCustomerId(suspended.customerId);
      setSuspendedSales(prev => prev.filter(s => s.id !== id));
    }
  };

  // Process Sale Checkout
  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCashReceived(cartTotal.toFixed(2));
    setSplitPayments({
      cash: 0,
      card: 0,
      ecoCash: 0,
      oneMoney: 0,
      bankTransfer: 0
    });
    setShowPaymentModal(true);
  };

  // Complete Payment
  const handleCompletePayment = () => {
    const change = paymentMethod === 'Cash' 
      ? Math.max(0, parseFloat(cashReceived || '0') - cartTotal)
      : 0;

    // Create completed sale object
    const finalizedSale: Omit<Sale, 'id' | 'invoiceNumber' | 'timestamp'> = {
      cashierId,
      cashierName,
      customerId: selectedCustomerId || undefined,
      customerName: selectedCustomer?.name,
      items: cart,
      subtotal: cartSubtotal,
      discountTotal: discountAmount,
      taxTotal: cartTax,
      total: cartTotal,
      paymentMethod,
      payments: paymentMethod === 'Mixed' ? splitPayments : {
        cash: paymentMethod === 'Cash' ? parseFloat(cashReceived || '0') : 0,
        card: paymentMethod === 'Card' ? cartTotal : 0,
        ecoCash: paymentMethod === 'EcoCash' ? cartTotal : 0,
        oneMoney: paymentMethod === 'OneMoney' ? cartTotal : 0,
        bankTransfer: paymentMethod === 'Bank Transfer' ? cartTotal : 0
      },
      changeDue: change,
      status: 'Completed',
      branchId
    };

    // Callback to parent component
    onCompleteSale(finalizedSale);

    // Show thermal receipt
    const displayReceipt: Sale = {
      ...finalizedSale,
      id: 's_' + Math.random().toString(36).substr(2, 9),
      invoiceNumber: `INV-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString()
    };
    
    setShowReceipt(displayReceipt);
    
    // Clear State
    setCart([]);
    setSelectedCustomerId('');
    setOverallDiscountPercent(0);
    setShowPaymentModal(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] lg:h-[calc(100vh-180px)] select-none font-sans">
      
      {/* LEFT COLUMN: PRODUCT GRID AND SEARCH (7 COLS) */}
      <div className="lg:col-span-7 flex flex-col min-h-[500px] lg:h-full bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-xs overflow-hidden">
        
        {/* Search Bar and Barcode Button */}
        <div className="flex gap-3 mb-4 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search product name, SKU, or scan barcode..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white text-sm rounded-xl border-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-800 font-sans"
              id="pos-search-input"
            />
          </div>
          <button 
            onClick={() => setShowCameraScan(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
            id="camera-scan-btn"
          >
            <Camera className="w-4 h-4" />
            Scan EAN
          </button>
        </div>

        {/* Categories Scroller */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Items Bento-style Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-3.5" id="pos-product-grid">
          {filteredProducts.map(prod => (
            <div 
              key={prod.id}
              onClick={() => handleAddToCart(prod)}
              className={`group bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 relative overflow-hidden ${
                prod.quantity === 0 ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="space-y-2">
                {/* Image Placeholder */}
                <div className="aspect-square bg-white border border-slate-100 rounded-lg overflow-hidden flex items-center justify-center relative shadow-2xs">
                  {prod.imageUrl ? (
                    <img 
                      src={prod.imageUrl} 
                      alt={prod.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-slate-300 font-bold font-sans text-xs">COBULT</span>
                  )}
                  {prod.quantity <= prod.minQuantity && prod.quantity > 0 && (
                    <span className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider shadow-xs">
                      LOW STOCK
                    </span>
                  )}
                  {prod.quantity === 0 && (
                    <span className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-widest">
                      OUT OF STOCK
                    </span>
                  )}
                </div>
                <div>
                  <h5 className="font-sans font-medium text-xs text-slate-800 line-clamp-1">{prod.name}</h5>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{prod.barcode}</p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-3">
                <span className="text-xs font-mono font-semibold text-slate-900">
                  {currencySymbol}{prod.sellingPrice.toFixed(2)}
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-100 px-1.5 py-0.5 rounded">
                  {prod.quantity} left
                </span>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center h-64 text-center">
              <span className="text-3xl">📦</span>
              <p className="text-sm text-slate-500 font-sans mt-2">No matching products found.</p>
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: ACTIVE CART AND CHECKOUT (5 COLS) */}
      <div className="lg:col-span-5 flex flex-col min-h-[550px] lg:h-full bg-slate-900 border border-slate-950 rounded-2xl p-4 sm:p-5 text-white shadow-lg relative overflow-hidden">
        
        {/* Cart Header & Suspended Count */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-400" />
            <h3 className="text-sm font-sans font-medium uppercase tracking-wider text-slate-300">Sales Register</h3>
          </div>
          {suspendedSales.length > 0 && (
            <div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-lg text-[10px] font-mono font-semibold">
              <Pause className="w-3 h-3" />
              <span>{suspendedSales.length} On Hold</span>
            </div>
          )}
        </div>

        {/* Searchable Customer Dropdown */}
        <div className="mb-4 relative" id="pos-customer-selector">
          <div className="bg-slate-800 hover:bg-slate-750 border border-slate-700/50 rounded-xl p-2.5 transition-colors">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400 shrink-0" />
              {selectedCustomer ? (
                // Selected Customer State
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{selectedCustomer.name}</p>
                    <p className="text-[10px] text-[#94A3B8] font-mono flex items-center gap-2 truncate">
                      <span>{selectedCustomer.phone || 'No phone'}</span>
                      <span>•</span>
                      <span className="text-blue-400 font-bold">{selectedCustomer.loyaltyPoints} pts</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowHistoryModal(true)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded text-[9px] font-semibold transition-colors"
                      title="View past transactions"
                    >
                      <Receipt className="w-3 h-3" />
                      <span>History</span>
                    </button>
                    <span className="text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      VIP -{selectedCustomer.discountLevel}%
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId('');
                        setCustomerSearchQuery('');
                      }}
                      className="p-1 hover:bg-rose-500/15 text-[#94A3B8] hover:text-rose-400 rounded transition-colors"
                      title="Clear customer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                // Unselected / Search State
                <div className="flex-1 flex items-center gap-1.5 relative">
                  <input
                    type="text"
                    placeholder="Search/Link customer (Name, phone, no...)"
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="bg-transparent text-xs text-white border-none focus:outline-none focus:ring-0 w-full p-0 font-sans"
                  />
                  {customerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearchQuery('')}
                      className="text-[10px] text-slate-400 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <span className="text-[10px] font-mono font-semibold bg-slate-900 text-slate-400 border border-slate-700/60 px-1.5 py-0.5 rounded-md shrink-0">
                    Walking
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Dropdown Suggestions */}
          {showCustomerDropdown && !selectedCustomerId && (
            <>
              {/* Overlay background to dismiss */}
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setShowCustomerDropdown(false)}
              />
              <div className="absolute left-0 right-0 mt-1.5 bg-[#16191F] border border-slate-700 rounded-xl shadow-xl z-40 max-h-56 overflow-y-auto divide-y divide-slate-800">
                <div className="p-2 bg-[#1A1D23] text-[9px] uppercase tracking-wider text-slate-400 font-mono font-semibold flex justify-between items-center sticky top-0 z-10">
                  <span>Registered Customers ({filteredCustomers.length})</span>
                  <button 
                    type="button"
                    onClick={() => setShowCustomerDropdown(false)}
                    className="text-slate-400 hover:text-white text-[10px]"
                  >
                    Close
                  </button>
                </div>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setShowCustomerDropdown(false);
                        setCustomerSearchQuery('');
                        setShowHistoryModal(true);
                      }}
                      className="w-full text-left p-2.5 hover:bg-slate-800 flex justify-between items-center transition-colors text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-white truncate">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{c.phone || 'No phone'} • {c.email || 'No email'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-blue-400 font-bold font-mono">{c.loyaltyPoints} pts</p>
                        <p className="text-[9px] text-emerald-400 font-mono">VIP -{c.discountLevel}%</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No customers match "{customerSearchQuery}"
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 my-1" id="pos-cart-items">
          {cart.map(item => (
            <div 
              key={item.productId}
              className="bg-slate-800/60 border border-slate-800 rounded-xl p-3 flex justify-between items-center hover:bg-slate-800 transition-colors"
            >
              <div className="space-y-0.5 flex-1 pr-3">
                <h6 className="text-xs font-sans font-medium text-white line-clamp-1">{item.name}</h6>
                <p className="text-[10px] font-mono text-slate-400">
                  {currencySymbol}{item.price.toFixed(2)} / unit
                </p>
              </div>

              {/* Qty and controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                  <button 
                    onClick={() => handleUpdateQty(item.productId, -1)}
                    className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-mono font-bold text-white">
                    {item.quantity}
                  </span>
                  <button 
                    onClick={() => handleUpdateQty(item.productId, 1)}
                    className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="w-16 text-right">
                  <span className="text-xs font-mono font-semibold text-white">
                    {currencySymbol}{item.subtotal.toFixed(2)}
                  </span>
                </div>

                <button 
                  onClick={() => handleRemoveFromCart(item.productId)}
                  className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[160px] text-center">
              <Receipt className="w-10 h-10 text-slate-700 mb-2" />
              <p className="text-xs text-slate-500 font-sans">Active transaction cart is empty.</p>
              <p className="text-[10px] text-slate-600 mt-1">Select items from left panel to check out.</p>
            </div>
          )}
        </div>

        {/* Suspended Sales Drawer (if any) */}
        {suspendedSales.length > 0 && cart.length === 0 && (
          <div className="border-t border-slate-800 pt-3 mb-3 shrink-0">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-2">Suspended Queues</span>
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {suspendedSales.map(sus => (
                <div key={sus.id} className="flex justify-between items-center bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-300 font-mono">Suspended @ {sus.timestamp} ({sus.cart.length} items)</span>
                  <button 
                    onClick={() => handleResumeSale(sus.id)}
                    className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5" />
                    Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cart Calculations Footer */}
        <div className="border-t border-slate-800 pt-3 space-y-2 text-xs shrink-0">
          <div className="flex justify-between text-slate-400 font-sans">
            <span>Subtotal</span>
            <span className="font-mono">{currencySymbol}{cartSubtotal.toFixed(2)}</span>
          </div>

          {/* Discount Section */}
          <div className="flex justify-between items-center text-slate-400">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              <span>Discount</span>
              <select 
                value={overallDiscountPercent}
                onChange={e => setOverallDiscountPercent(parseInt(e.target.value))}
                className="bg-slate-800 text-[10px] text-white rounded border-none focus:ring-0 p-0.5 cursor-pointer font-mono"
              >
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={10}>10%</option>
                <option value={15}>15%</option>
                <option value={20}>20%</option>
              </select>
            </div>
            <span className="font-mono text-amber-400">-{currencySymbol}{discountAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-slate-400 font-sans">
            <span>Estimated VAT ({taxPercentage}%)</span>
            <span className="font-mono">{currencySymbol}{cartTax.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-end border-t border-slate-800 pt-2.5 mt-1">
            <span className="text-sm font-sans font-semibold">Grand Total</span>
            <span className="text-2xl font-mono font-bold text-white">
              {currencySymbol}{cartTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Primary POS Action buttons */}
        <div className="grid grid-cols-2 gap-3 mt-3 shrink-0">
          <button
            onClick={handleHoldSale}
            disabled={cart.length === 0}
            className="py-3 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/60 rounded-xl text-xs font-sans font-medium text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
            id="hold-sale-btn"
          >
            <Pause className="w-4 h-4 text-amber-400" />
            Hold Sale
          </button>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-sans font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            id="checkout-sale-btn"
          >
            <Receipt className="w-4 h-4" />
            Proceed Payment
          </button>
        </div>

      </div>

      {/* ==========================================
          MODAL: CAMERA BARCODE SCAN SIMULATION
          ========================================== */}
      {showCameraScan && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-100 shadow-xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-sans font-semibold text-slate-900 flex items-center gap-1.5">
                <Camera className="w-5 h-5 text-slate-700" />
                Simulated Laser Scanner
              </h3>
              <button 
                onClick={() => setShowCameraScan(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              In retail stores, scanning barcodes (via USB/Bluetooth lasers or camera) instantly adds items to the ticket. Simulate a scan by typing one of the sample barcodes below or selecting a quick-scan product.
            </p>

            <form onSubmit={handleBarcodeSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Enter Product Barcode</label>
                <input 
                  type="text" 
                  value={barcodeScanInput}
                  onChange={e => setBarcodeScanInput(e.target.value)}
                  placeholder="e.g. 6001108000011"
                  className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border-none focus:ring-2 focus:ring-slate-900 text-sm font-mono rounded-xl text-slate-900"
                  autoFocus
                />
              </div>

              {/* Sample Shortcuts */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Sample Barcode Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button 
                    type="button"
                    onClick={() => { setBarcodeScanInput('6001108000011'); }}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg text-slate-700 font-mono font-medium cursor-pointer"
                  >
                    6001108000011 (Castle)
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setBarcodeScanInput('5449000000996'); }}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg text-slate-700 font-mono font-medium cursor-pointer"
                  >
                    5449000000996 (Coke)
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setBarcodeScanInput('6001302001151'); }}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg text-slate-700 font-mono font-medium cursor-pointer"
                  >
                    6001302001151 (Mazoe)
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow cursor-pointer"
                >
                  Confirm Scan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: PAYMENT PROCESSING
          ========================================== */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 border border-slate-100 shadow-xl space-y-4 text-slate-800 my-auto max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-sans font-semibold text-slate-900 text-base">Select Payment Method</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">✕</button>
            </div>

            {/* Total due badge */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center">
              <span className="text-xs font-medium text-slate-400">Total Outstanding</span>
              <span className="text-2xl font-mono font-bold">{currencySymbol}{cartTotal.toFixed(2)}</span>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              {(['Cash', 'Card', 'EcoCash', 'OneMoney', 'Bank Transfer', 'Mixed'] as PaymentMethod[]).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2.5 text-xs font-sans font-medium rounded-xl border transition-all cursor-pointer ${
                    paymentMethod === method 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                      : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            {/* Input Details based on Method */}
            {paymentMethod === 'Cash' && (
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-medium">Cash Tendered</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-semibold text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                {/* Short values */}
                <div className="flex gap-2">
                  {[5, 10, 20, 50, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashReceived(val.toString())}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-semibold text-slate-700 cursor-pointer"
                    >
                      {currencySymbol}{val}
                    </button>
                  ))}
                </div>
                {parseFloat(cashReceived || '0') >= cartTotal && (
                  <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl text-xs font-mono font-medium flex justify-between">
                    <span>Change Due:</span>
                    <span>{currencySymbol}{(parseFloat(cashReceived || '0') - cartTotal).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'Mixed' && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Mixed Payment Split</span>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span>Cash Amount:</span>
                    <input 
                      type="number" 
                      value={splitPayments.cash}
                      onChange={e => setSplitPayments(prev => ({ ...prev, cash: parseFloat(e.target.value) || 0 }))}
                      className="w-24 bg-white border border-slate-200 text-right px-2 py-1 rounded-md"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Card Amount:</span>
                    <input 
                      type="number" 
                      value={splitPayments.card}
                      onChange={e => setSplitPayments(prev => ({ ...prev, card: parseFloat(e.target.value) || 0 }))}
                      className="w-24 bg-white border border-slate-200 text-right px-2 py-1 rounded-md"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>EcoCash Amount:</span>
                    <input 
                      type="number" 
                      value={splitPayments.ecoCash}
                      onChange={e => setSplitPayments(prev => ({ ...prev, ecoCash: parseFloat(e.target.value) || 0 }))}
                      className="w-24 bg-white border border-slate-200 text-right px-2 py-1 rounded-md"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200/50 pt-2.5 flex justify-between text-xs font-semibold">
                  <span>Total Captured:</span>
                  <span className={`${
                    Math.abs((splitPayments.cash + splitPayments.card + splitPayments.ecoCash) - cartTotal) < 0.01
                      ? 'text-emerald-600'
                      : 'text-rose-500'
                  }`}>
                    {currencySymbol}{(splitPayments.cash + splitPayments.card + splitPayments.ecoCash).toFixed(2)} / {currencySymbol}{cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {paymentMethod !== 'Cash' && paymentMethod !== 'Mixed' && (
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                Awaiting connection with {paymentMethod} terminal... The transaction will be finalized upon authorization.
              </p>
            )}

            <div className="pt-2">
              <button
                onClick={handleCompletePayment}
                disabled={
                  (paymentMethod === 'Cash' && parseFloat(cashReceived || '0') < cartTotal) ||
                  (paymentMethod === 'Mixed' && Math.abs((splitPayments.cash + splitPayments.card + splitPayments.ecoCash) - cartTotal) > 0.01)
                }
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-45 text-white font-sans font-semibold rounded-xl text-xs flex justify-center items-center gap-1.5 shadow cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Finalize Checkout
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: THERMAL RECEIPT DISPLAY
          ========================================== */}
      {showReceipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-100 shadow-xl flex flex-col max-h-[90vh] my-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-800" />
                <h3 className="font-sans font-bold text-slate-900 text-sm">Transaction Receipt</h3>
              </div>
              <button 
                onClick={() => setShowReceipt(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                id="receipt-close-x-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dynamic CSS Print Stylesheet for Thermal 80mm Receipt Roll */}
            <style>{`
              @media print {
                @page {
                  size: 80mm auto;
                  margin: 0mm !important;
                }
                html, body {
                  width: 80mm !important;
                  height: auto !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  overflow: visible !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #thermal-receipt-printable, #thermal-receipt-printable * {
                  visibility: visible !important;
                }
                #thermal-receipt-printable {
                  position: fixed !important;
                  top: 0 !important;
                  left: 0 !important;
                  width: 78mm !important;
                  max-width: 80mm !important;
                  margin: 0 !important;
                  padding: 4mm !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  font-family: 'Courier New', Courier, monospace !important;
                  font-size: 11px !important;
                  line-height: 1.25 !important;
                  box-shadow: none !important;
                  border: none !important;
                  page-break-before: avoid !important;
                  page-break-after: avoid !important;
                  page-break-inside: avoid !important;
                  break-before: avoid !important;
                  break-after: avoid !important;
                  break-inside: avoid !important;
                }
                .no-print, #receipt-close-x-btn, #thermal-receipt-print-btn, #thermal-receipt-close-btn {
                  display: none !important;
                }
              }
            `}</style>

            {/* SCROLLABLE RECEIPT CONTENT CONTAINER */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 my-1">
              {/* Real 80mm Thermal Receipt layout */}
              <div className="w-full bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 shadow-inner font-mono text-xs text-slate-800 space-y-4" id="thermal-receipt-printable">
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-sm tracking-tight text-slate-900 uppercase">COBULT STOCKS RETAIL</h3>
                  <p className="text-[10px] text-slate-600">123 Samora Machel Ave, Harare</p>
                  <p className="text-[10px] text-slate-600">Tel: +263 771111222 / +263 242700000</p>
                  <p className="text-[10px] text-slate-600">VAT Reg: VAT-789-201-99</p>
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mt-1">TAX INVOICE / RECEIPT</p>
                </div>

                <div className="border-t border-dashed border-slate-400 pt-2.5 space-y-1 text-[10px] text-slate-700">
                  <div className="flex justify-between">
                    <span>Invoice #:</span>
                    <span className="font-bold">{showReceipt.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>{showReceipt.cashierName} (ID: {showReceipt.cashierId})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Terminal:</span>
                    <span>{showReceipt.branchId === 'b1' ? 'Harare CBD' : showReceipt.branchId === 'b2' ? 'Bulawayo' : showReceipt.branchId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span>{new Date(showReceipt.timestamp).toLocaleString()}</span>
                  </div>
                  {showReceipt.customerName && (
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <span className="font-bold">{showReceipt.customerName}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-400 pt-2.5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] text-slate-600 border-b border-dashed border-slate-400 font-bold">
                        <th className="pb-1 text-left">Item</th>
                        <th className="pb-1 text-center">Qty</th>
                        <th className="pb-1 text-right">Price</th>
                        <th className="pb-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {showReceipt.items.map(item => (
                        <tr key={item.id} className="text-[10px] text-slate-800">
                          <td className="py-1 pr-1 font-medium">{item.name}</td>
                          <td className="py-1 text-center font-mono">{item.quantity}</td>
                          <td className="py-1 text-right font-mono">{currencySymbol}{item.price.toFixed(2)}</td>
                          <td className="py-1 text-right font-mono font-bold">{currencySymbol}{item.subtotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-dashed border-slate-400 pt-2.5 space-y-1 text-[10px]">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal:</span>
                    <span>{currencySymbol}{showReceipt.subtotal.toFixed(2)}</span>
                  </div>
                  {showReceipt.discountTotal > 0 && (
                    <div className="flex justify-between text-amber-700 font-medium">
                      <span>Discount Applied:</span>
                      <span>-{currencySymbol}{showReceipt.discountTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-700">
                    <span>VAT ({taxPercentage}%):</span>
                    <span>{currencySymbol}{showReceipt.taxTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-950 pt-1.5 border-t border-slate-900">
                    <span>TOTAL PAID:</span>
                    <span>{currencySymbol}{showReceipt.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>Payment Method:</span>
                    <span className="font-bold">{showReceipt.paymentMethod}</span>
                  </div>
                  {showReceipt.paymentMethod === 'Cash' && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Cash Tendered:</span>
                        <span>{currencySymbol}{(showReceipt.total + showReceipt.changeDue).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-800 font-bold">
                        <span>Change Due:</span>
                        <span>{currencySymbol}{showReceipt.changeDue.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {showReceipt.paymentMethod === 'Mixed' && showReceipt.payments && (
                    <div className="pt-1 text-[9px] text-slate-600 border-t border-dotted border-slate-300 space-y-0.5">
                      {showReceipt.payments.cash > 0 && <div className="flex justify-between"><span>&bull; Cash:</span><span>{currencySymbol}{showReceipt.payments.cash.toFixed(2)}</span></div>}
                      {showReceipt.payments.card > 0 && <div className="flex justify-between"><span>&bull; Card:</span><span>{currencySymbol}{showReceipt.payments.card.toFixed(2)}</span></div>}
                      {showReceipt.payments.ecoCash > 0 && <div className="flex justify-between"><span>&bull; EcoCash:</span><span>{currencySymbol}{showReceipt.payments.ecoCash.toFixed(2)}</span></div>}
                      {showReceipt.payments.oneMoney > 0 && <div className="flex justify-between"><span>&bull; OneMoney:</span><span>{currencySymbol}{showReceipt.payments.oneMoney.toFixed(2)}</span></div>}
                      {showReceipt.payments.bankTransfer > 0 && <div className="flex justify-between"><span>&bull; Bank Transfer:</span><span>{currencySymbol}{showReceipt.payments.bankTransfer.toFixed(2)}</span></div>}
                    </div>
                  )}
                </div>

                {/* Thermal Barcode Representation */}
                <div className="flex flex-col items-center justify-center pt-3 border-t border-dashed border-slate-400 space-y-2">
                  <div className="flex items-center justify-center gap-0.5 h-10 w-full px-4 bg-white border border-slate-200 p-1">
                    {Array.from({ length: 32 }).map((_, i) => (
                      <div key={i} className={`h-full ${i % 3 === 0 ? 'w-1 bg-slate-900' : i % 2 === 0 ? 'w-0.5 bg-slate-900' : 'w-0.5 bg-transparent'}`} />
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-600 font-mono text-center tracking-widest">{showReceipt.invoiceNumber}</p>
                  <p className="text-[8px] text-slate-500 text-center leading-tight">
                    Goods once sold are returnable within 7 days with original receipt.<br/>
                    Thank you for your business!
                  </p>
                </div>

              </div>

              {/* WhatsApp Receipt dispatch box */}
              <div className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                    Send Receipt via WhatsApp
                  </span>
                  <span className="text-[9px] text-emerald-700 font-mono">Instant digital receipt</span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={whatsappPhone}
                    onChange={e => setWhatsappPhone(e.target.value)}
                    placeholder="e.g. +263771234567 or 0771234567"
                    className="flex-1 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                    id="whatsapp-phone-input"
                  />
                  <button 
                    type="button"
                    onClick={handleSendWhatsAppReceipt}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs shrink-0"
                    id="send-whatsapp-receipt-btn"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>

            {/* STICKY BOTTOM ACTION BUTTONS */}
            <div className="flex gap-3 pt-3 border-t border-slate-100 mt-2 shrink-0 w-full">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                id="thermal-receipt-print-btn"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
              <button 
                onClick={() => setShowReceipt(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                id="thermal-receipt-close-btn"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CUSTOMER TRANSACTION HISTORY (PAST 5)
          ========================================== */}
      {showHistoryModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="customer-history-modal-overlay">
          <div className="bg-[#16191F] border border-[#2D3139] rounded-2xl max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden shadow-2xl" id="customer-history-modal-container">
            {/* Header */}
            <div className="p-5 border-b border-[#2D3139] flex justify-between items-center" id="customer-history-modal-header">
              <div className="flex items-center gap-2 text-blue-400">
                <Receipt className="w-5 h-5" />
                <h3 className="text-sm font-sans font-semibold text-white uppercase tracking-wider">
                  Transaction History (Last 5)
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 bg-[#1A1D23] hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors focus:outline-none"
                id="close-customer-history-btn-top"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Brief Card */}
            <div className="px-5 py-4 bg-[#1A1D23] border-b border-[#2D3139]" id="customer-history-brief-card">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-white">{selectedCustomer.name}</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedCustomer.phone || 'No Phone'} • {selectedCustomer.email || 'No Email'}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md inline-block">
                    VIP DISCOUNT: {selectedCustomer.discountLevel}%
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">Loyalty Points: <span className="text-blue-400 font-bold">{selectedCustomer.loyaltyPoints} pts</span></p>
                </div>
              </div>
            </div>

            {/* Scrollable history items */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-slate-900/40" id="customer-history-list-container">
              {customerPastSales.length > 0 ? (
                customerPastSales.map((sale) => (
                  <div key={sale.id} className="bg-[#1A1D23]/60 border border-slate-800 rounded-xl p-4 space-y-3" id={`history-sale-card-${sale.id}`}>
                    {/* Sale Info Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded">
                          {sale.invoiceNumber}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono mt-2">
                          {new Date(sale.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono font-bold text-emerald-400 block">
                          {currencySymbol}{sale.total.toFixed(2)}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded inline-block mt-1">
                          {sale.paymentMethod}
                        </span>
                      </div>
                    </div>

                    {/* Sale Items Table list */}
                    <div className="border-t border-slate-800/85 pt-2.5">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 font-sans">Purchased Items</p>
                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        {sale.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center text-xs text-slate-300">
                            <span className="truncate pr-4 flex-1 text-left">
                              {item.name} <span className="text-slate-500 font-mono text-[10px]">x{item.quantity}</span>
                            </span>
                            <span className="font-mono text-slate-400 shrink-0">
                              {currencySymbol}{item.subtotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sale footer info */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-800/30 pt-2 font-sans">
                      <span>Cashier: {sale.cashierName}</span>
                      <div className="flex items-center gap-2">
                        {sale.discountTotal > 0 && (
                          <span className="text-amber-500 font-medium mr-1">Saved {currencySymbol}{sale.discountTotal.toFixed(2)}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setShowReceipt(sale);
                            setShowHistoryModal(false);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2 py-1 rounded transition-colors font-medium cursor-pointer"
                          title="Re-print receipt for this transaction"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print Receipt</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 flex flex-col items-center justify-center text-slate-400" id="no-customer-history-state">
                  <span className="text-4xl">📜</span>
                  <p className="text-sm font-sans font-semibold mt-3 text-slate-300">No transactions captured yet</p>
                  <p className="text-xs text-slate-500 font-sans mt-1 text-center">This is a newly registered customer or has no past completed sales.</p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-[#2D3139] bg-[#1A1D23] flex justify-end" id="customer-history-modal-footer">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/10 focus:outline-none animate-fade-in"
                id="close-customer-history-btn-bottom"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
