/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Plus, 
  Clock, 
  CheckCircle, 
  Truck, 
  Receipt,
  FileText,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { Supplier, PurchaseOrder, Product, UserRole } from '../types.ts';

interface SuppliersPurchasesViewProps {
  suppliers: Supplier[];
  purchases: PurchaseOrder[];
  products: Product[];
  currencySymbol: string;
  userRole: UserRole;
  onAddSupplier: (sup: Omit<Supplier, 'id' | 'balance' | 'purchaseHistoryCount'>) => void;
  onAddPurchase: (po: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'createdAt'>) => void;
  branchId: string;
}

export default function SuppliersPurchasesView({
  suppliers,
  purchases,
  products,
  currencySymbol,
  userRole,
  onAddSupplier,
  onAddPurchase,
  branchId
}: SuppliersPurchasesViewProps) {
  // Tabs: Suppliers or Purchase Orders
  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchases'>('suppliers');
  
  // UI States
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState<PurchaseOrder | null>(null);

  // New Supplier form states
  const [newSupplier, setNewSupplier] = useState({
    company: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });

  // New PO form states
  const [poSupplierId, setPoSupplierId] = useState(suppliers[0]?.id || '');
  const [poItems, setPoItems] = useState<{ productId: string; quantity: number; cost: number }[]>([
    { productId: products[0]?.id || '', quantity: 10, cost: products[0]?.purchasePrice || 0.50 }
  ]);

  // Receive PO form states
  const [receivedInvoice, setReceivedInvoice] = useState('');
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});

  // Calculations for PO summary metrics
  const summaryMetrics = useMemo(() => {
    let totalSpent = 0;
    let pendingPOs = 0;
    purchases.forEach(p => {
      totalSpent += p.totalAmount;
      if (p.status === 'Pending') pendingPOs++;
    });

    const totalSupplierOwed = suppliers.reduce((sum, s) => sum + s.balance, 0);

    return {
      totalSpent,
      pendingPOs,
      totalSupplierOwed
    };
  }, [purchases, suppliers]);

  // Handle Create Supplier
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.company || !newSupplier.contactPerson) {
      alert('Please fill out Company Name and Contact Person.');
      return;
    }
    onAddSupplier(newSupplier);
    setShowSupplierModal(false);
    setNewSupplier({ company: '', contactPerson: '', phone: '', email: '', address: '' });
  };

  // Handle PO Item modifications
  const handleAddPOItem = () => {
    setPoItems(prev => [...prev, { productId: products[0]?.id || '', quantity: 10, cost: products[0]?.purchasePrice || 0.50 }]);
  };

  const handleUpdatePOItem = (index: number, field: string, value: any) => {
    setPoItems(prev => prev.map((item, i) => {
      if (i === index) {
        if (field === 'productId') {
          const selectedProd = products.find(p => p.id === value);
          return {
            ...item,
            productId: value,
            cost: selectedProd ? selectedProd.purchasePrice : item.cost
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemovePOItem = (index: number) => {
    setPoItems(prev => prev.filter((_, i) => i !== index));
  };

  // Submit PO
  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSup = suppliers.find(s => s.id === poSupplierId);
    if (!selectedSup) return;

    const formattedItems = poItems.map(item => {
      const prod = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        name: prod ? prod.name : 'Unknown Product',
        quantityOrdered: item.quantity,
        quantityReceived: 0,
        purchasePrice: item.cost
      };
    });

    const total = formattedItems.reduce((sum, item) => sum + (item.quantityOrdered * item.purchasePrice), 0);

    onAddPurchase({
      supplierId: poSupplierId,
      supplierName: selectedSup.company,
      items: formattedItems,
      totalAmount: total,
      paidAmount: total, // Assuming cash on delivery
      balance: 0,
      status: 'Pending',
      branchId
    });

    setShowPOModal(false);
    setPoItems([{ productId: products[0]?.id || '', quantity: 10, cost: products[0]?.purchasePrice || 0.50 }]);
    alert('Purchase Order created in Pending status.');
  };

  // Trigger Receive PO Modal
  const openReceiveModal = (po: PurchaseOrder) => {
    const initialQtys: Record<string, number> = {};
    po.items.forEach(item => {
      initialQtys[item.productId] = item.quantityOrdered;
    });
    setReceivedQtys(initialQtys);
    setReceivedInvoice('');
    setShowReceiveModal(po);
  };

  // Submit Receive PO Stock
  const handleReceiveStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReceiveModal) return;
    if (!receivedInvoice.trim()) {
      alert('Please provide the Supplier Invoice Number.');
      return;
    }

    // Prepare updated PO details
    const updatedItems = showReceiveModal.items.map(item => ({
      ...item,
      quantityReceived: receivedQtys[item.productId] || 0
    }));

    // If all items fully received, mark as Received, else Partial
    const allReceived = updatedItems.every(item => item.quantityReceived >= item.quantityOrdered);
    const status = allReceived ? 'Received' : 'Partial';

    // Direct stock update logic is processed by parent callback as an update
    onAddPurchase({
      ...showReceiveModal,
      items: updatedItems,
      status,
      invoiceNumber: receivedInvoice,
      receivedAt: new Date().toISOString()
    } as any);

    setShowReceiveModal(null);
    alert(`Inventory successfully replenished for Order ${showReceiveModal.orderNumber}!`);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="purchases-module">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-sans font-medium tracking-tight text-slate-900">Procurement & Suppliers</h1>
          <p className="text-slate-500 text-sm mt-1">Manage wholesale distributors, ledger balances, purchase orders, and stock receipts.</p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'suppliers' ? (
            <button
              onClick={() => setShowSupplierModal(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Supplier
            </button>
          ) : (
            <button
              onClick={() => setShowPOModal(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create PO
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-100 pb-px">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`pb-3 text-sm font-sans font-medium relative transition-colors ${
            activeTab === 'suppliers' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Suppliers Directory
          {activeTab === 'suppliers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />}
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 text-sm font-sans font-medium relative transition-colors ${
            activeTab === 'purchases' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Purchase Orders
          {activeTab === 'purchases' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Accounts Payable</span>
          <h4 className="text-2xl font-bold font-sans text-slate-900 mt-1">
            {currencySymbol}{summaryMetrics.totalSupplierOwed.toFixed(2)}
          </h4>
          <span className="text-[10px] text-slate-500 mt-1 block">Owed to distributors</span>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Pending Replenishments</span>
          <h4 className="text-2xl font-bold font-sans text-slate-900 mt-1">
            {summaryMetrics.pendingPOs} Orders
          </h4>
          <span className="text-[10px] text-slate-500 mt-1 block">Outstanding PO pipeline</span>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Cumulative PO Spend</span>
          <h4 className="text-2xl font-bold font-sans text-slate-900 mt-1">
            {currencySymbol}{summaryMetrics.totalSpent.toFixed(2)}
          </h4>
          <span className="text-[10px] text-slate-500 mt-1 block">Cost of inventory acquired</span>
        </div>
      </div>

      {/* Render Active Tab */}
      {activeTab === 'suppliers' ? (
        /* SUPPLIERS CARD GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="suppliers-list">
          {suppliers.map(sup => (
            <div key={sup.id} className="bg-white border border-slate-100 hover:border-slate-200 p-5 rounded-2xl shadow-3xs flex flex-col justify-between hover:shadow-xs transition-all duration-200">
              <div className="space-y-3.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-sans font-medium text-slate-900">{sup.company}</h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">Contact: {sup.contactPerson}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <Users className="w-4 h-4 text-slate-600" />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{sup.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sup.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{sup.address}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-50 pt-4 mt-4 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Ledger Balance</span>
                  <p className={`font-mono font-bold mt-0.5 ${sup.balance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {currencySymbol}{sup.balance.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Supply Batches</span>
                  <p className="font-mono font-medium text-slate-700 mt-0.5">
                    {sup.purchaseHistoryCount} POs
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* PURCHASE ORDERS LIST */
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden" id="po-table">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs text-slate-500 uppercase font-mono tracking-wider">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Cost Value</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Issued Date</th>
                  <th className="py-3 px-4 text-center">Receipt Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                {purchases.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-900 font-medium">{po.orderNumber}</td>
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-900">{po.supplierName}</td>
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-950">
                      {currencySymbol}{po.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      <span className="line-clamp-1">
                        {po.items.map(item => `${item.name} (x${item.quantityOrdered})`).join(', ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className={`px-2 py-0.5 rounded font-mono font-medium ${
                        po.status === 'Received' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : po.status === 'Partial'
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                      {new Date(po.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {po.status === 'Pending' ? (
                        <button
                          onClick={() => openReceiveModal(po)}
                          className="text-[10px] font-sans font-semibold bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 mx-auto shadow-sm"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Receive Stock
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-mono">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Delivered</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No purchase records registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: ADD SUPPLIER
          ========================================== */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-100 shadow-xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-sans font-semibold text-slate-900 text-sm">Add New Supplier Record</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-600">Company Name</label>
                <input 
                  type="text" 
                  value={newSupplier.company}
                  onChange={e => setNewSupplier(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="e.g. Delta Beverages"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-slate-900 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-slate-600">Contact Person</label>
                <input 
                  type="text" 
                  value={newSupplier.contactPerson}
                  onChange={e => setNewSupplier(prev => ({ ...prev, contactPerson: e.target.value }))}
                  placeholder="Charles Chiri"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-slate-900 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-600">Phone</label>
                  <input 
                    type="text" 
                    value={newSupplier.phone}
                    onChange={e => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+26377..."
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg font-mono text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600">Email</label>
                  <input 
                    type="email" 
                    value={newSupplier.email}
                    onChange={e => setNewSupplier(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="sales@deltabev..."
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-slate-900 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-600">Office Address</label>
                <textarea 
                  value={newSupplier.address}
                  onChange={e => setNewSupplier(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Sable House, Northridge Park..."
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-slate-900 text-xs h-16 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CREATE PURCHASE ORDER
          ========================================== */}
      {showPOModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-100 shadow-xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-sans font-semibold text-slate-900 text-sm">Issue Purchase Order</h3>
              <button onClick={() => setShowPOModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-600">Select Supplier / Distributor</label>
                <select
                  value={poSupplierId}
                  onChange={e => setPoSupplierId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs cursor-pointer"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.company}</option>
                  ))}
                </select>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="font-medium text-slate-600">Reorder Stock list</label>
                  <button
                    type="button"
                    onClick={handleAddPOItem}
                    className="text-[10px] font-sans font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {poItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <select
                        value={item.productId}
                        onChange={e => handleUpdatePOItem(idx, 'productId', e.target.value)}
                        className="flex-1 bg-transparent border-none text-[10px]"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input 
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={e => handleUpdatePOItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-14 bg-white border border-slate-200 rounded px-1.5 py-1 text-center font-mono text-[10px]"
                      />
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="Cost"
                        value={item.cost}
                        onChange={e => handleUpdatePOItem(idx, 'cost', parseFloat(e.target.value) || 0.10)}
                        className="w-16 bg-white border border-slate-200 rounded px-1.5 py-1 text-right font-mono text-[10px]"
                      />
                      <button 
                        type="button"
                        onClick={() => handleRemovePOItem(idx)}
                        className="text-slate-400 hover:text-rose-500 font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowPOModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow"
                >
                  Dispatch Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: RECEIVE INCOMING STOCK
          ========================================== */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-100 shadow-xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-sans font-semibold text-slate-900 text-sm">Acknowledge Stock Arrival</h3>
              <button onClick={() => setShowReceiveModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleReceiveStock} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-600">Supplier Invoice Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. DEL-99120"
                  value={receivedInvoice}
                  onChange={e => setReceivedInvoice(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-xl font-mono text-slate-900 text-xs"
                  required
                />
              </div>

              {/* Items receiving allocations */}
              <div className="space-y-2">
                <span className="font-medium text-slate-600">Receive Product Counts</span>
                <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
                  {showReceiveModal.items.map(item => (
                    <div key={item.productId} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="space-y-0.5">
                        <span className="font-medium text-slate-800 line-clamp-1">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ordered: {item.quantityOrdered} units</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-mono text-slate-400">Received:</label>
                        <input 
                          type="number"
                          value={receivedQtys[item.productId] ?? item.quantityOrdered}
                          onChange={e => setReceivedQtys(prev => ({ ...prev, [item.productId]: parseInt(e.target.value) || 0 }))}
                          className="w-14 bg-white border border-slate-200 rounded px-1.5 py-1 text-center font-mono font-semibold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-sans font-semibold rounded-xl text-xs flex justify-center items-center gap-1.5 shadow"
                >
                  <CheckCircle className="w-4 h-4" />
                  Replenish Inventory Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
