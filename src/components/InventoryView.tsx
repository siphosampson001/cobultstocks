/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  TrendingUp, 
  BarChart, 
  Filter, 
  ShieldAlert, 
  Barcode,
  Package,
  Boxes,
  Activity,
  PlusCircle,
  FileCheck2
} from 'lucide-react';
import { Product, Supplier, UserRole } from '../types.ts';

interface InventoryViewProps {
  products: Product[];
  suppliers: Supplier[];
  userRole: UserRole;
  currencySymbol: string;
  onAddProduct: (prod: Omit<Product, 'id' | 'status' | 'updatedAt'>) => void;
  onUpdateProduct: (id: string, prod: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  branchId: string;
}

export default function InventoryView({
  products,
  suppliers,
  userRole,
  currencySymbol,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  branchId
}: InventoryViewProps) {
  // Local UI States
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Product | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState<Product | null>(null);

  // Quick Adjust Form States
  const [adjustQtyDelta, setAdjustQtyDelta] = useState<string>('0');
  const [adjustReason, setAdjustReason] = useState<'Damaged' | 'Expired' | 'Stocktake' | 'Theft'>('Stocktake');

  // New Product Form States
  const [newProduct, setNewProduct] = useState({
    barcode: '',
    sku: '',
    name: '',
    description: '',
    category: 'Alcohol & Beverages',
    brand: '',
    supplierId: suppliers[0]?.id || '',
    purchasePrice: 0,
    sellingPrice: 0,
    wholesalePrice: 0,
    retailPrice: 0,
    vatPercentage: 15,
    quantity: 10,
    minQuantity: 5,
    maxQuantity: 100,
    weight: '',
    volume: '',
    alcoholPercentage: 0,
    expiryDate: '',
    batchNumber: '',
    location: 'Aisle 1',
    branchId: branchId
  });

  // Category and Status filters list
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  // Restricted Access flags
  const canModify = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.OWNER || userRole === UserRole.MANAGER;
  const canViewFinancials = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.OWNER || userRole === UserRole.MANAGER;

  // Inventory Valuations
  const valuation = useMemo(() => {
    let totalCost = 0;
    let potentialSales = 0;
    products.forEach(p => {
      totalCost += p.purchasePrice * p.quantity;
      potentialSales += p.sellingPrice * p.quantity;
    });
    return {
      totalCost,
      potentialSales,
      potentialProfit: potentialSales - totalCost
    };
  }, [products]);

  // Filter products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.barcode.includes(search) || 
                          p.sku.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'All' || p.status === filterStatus;
      const matchCategory = filterCategory === 'All' || p.category === filterCategory;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [products, search, filterStatus, filterCategory]);

  // Handle Form Submission
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.barcode || !newProduct.sku) {
      alert('Please fill out essential fields: Name, Barcode, SKU');
      return;
    }
    onAddProduct({
      ...newProduct,
      wholesalePrice: newProduct.sellingPrice * 0.85,
      retailPrice: newProduct.sellingPrice
    });
    setShowAddModal(false);
    // Reset form
    setNewProduct({
      barcode: '',
      sku: '',
      name: '',
      description: '',
      category: 'Alcohol & Beverages',
      brand: '',
      supplierId: suppliers[0]?.id || '',
      purchasePrice: 0,
      sellingPrice: 0,
      wholesalePrice: 0,
      retailPrice: 0,
      vatPercentage: 15,
      quantity: 10,
      minQuantity: 5,
      maxQuantity: 100,
      weight: '',
      volume: '',
      alcoholPercentage: 0,
      expiryDate: '',
      batchNumber: '',
      location: 'Aisle 1',
      branchId: branchId
    });
  };

  // Handle Edit Submission
  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    onUpdateProduct(showEditModal.id, showEditModal);
    setShowEditModal(null);
  };

  // Handle Stock Adjustment
  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustModal) return;
    const delta = parseInt(adjustQtyDelta);
    if (isNaN(delta) || delta === 0) {
      alert('Please enter a valid non-zero adjust quantity.');
      return;
    }
    
    // Quantity calculation: delta can be negative
    const newQty = Math.max(0, showAdjustModal.quantity + delta);
    onUpdateProduct(showAdjustModal.id, {
      quantity: newQty,
      description: `${showAdjustModal.description} [Adjust: ${adjustReason} of ${delta} units]`
    });
    setShowAdjustModal(null);
    setAdjustQtyDelta('0');
    alert(`Applied adjustment. Stock is now ${newQty} units.`);
  };

  // EAN Barcode generator helper
  const triggerGenerateBarcode = () => {
    const randomEan = '600' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setNewProduct(prev => ({
      ...prev,
      barcode: randomEan,
      sku: `ALC-${randomEan.slice(4, 9)}-${newProduct.volume || 'VOL'}`
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in" id="inventory-module">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-sans font-medium tracking-tight text-slate-900">Inventory & Stock</h1>
          <p className="text-slate-500 text-sm mt-1">Manage warehouse stock, valuation, batch details, and low-stock alerts.</p>
        </div>
        
        {canModify && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
            id="add-product-btn"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        )}
      </div>

      {/* Asset Valuation Dashboard Banner */}
      {canViewFinancials ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-900 text-white p-5 rounded-2xl border border-slate-950 shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5 text-slate-400" />
              Stock Valuation (Cost)
            </span>
            <h4 className="text-2xl font-sans font-bold text-white">
              {currencySymbol}{valuation.totalCost.toFixed(2)}
            </h4>
            <p className="text-[10px] text-slate-400">Net capital locked in warehouse</p>
          </div>
          <div className="space-y-1 border-slate-800 sm:border-l sm:pl-6">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Expected Retail Value
            </span>
            <h4 className="text-2xl font-sans font-bold text-emerald-400">
              {currencySymbol}{valuation.potentialSales.toFixed(2)}
            </h4>
            <p className="text-[10px] text-slate-400">Total selling capital on shelves</p>
          </div>
          <div className="space-y-1 border-slate-800 sm:border-l sm:pl-6">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              Potential Profit Margin
            </span>
            <h4 className="text-2xl font-sans font-bold text-sky-400">
              {currencySymbol}{valuation.potentialProfit.toFixed(2)}
            </h4>
            <p className="text-[10px] text-slate-400">Estimated margin on total inventory</p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-slate-400" />
          <p className="text-xs text-slate-500 font-sans">Inventory valuation, markup details, and purchasing cost analysis is restricted under your active Cashier session.</p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search products by barcode, SKU, brand, name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs rounded-xl border-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-800"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-none">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
            <Filter className="w-3 h-3 text-slate-400" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-transparent text-[10px] font-sans font-medium text-slate-600 border-none outline-none focus:ring-0 p-0"
            >
              <option value="All">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
            <Package className="w-3 h-3 text-slate-400" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-transparent text-[10px] font-sans font-medium text-slate-600 border-none outline-none focus:ring-0 p-0"
            >
              <option value="All">All Categories</option>
              {categories.filter(c => c !== 'All').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-xs text-slate-500 uppercase font-mono tracking-wider">
                <th className="py-3 px-4">Product details</th>
                <th className="py-3 px-4">EAN Barcode / SKU</th>
                <th className="py-3 px-4">Category</th>
                {canViewFinancials && <th className="py-3 px-4">Unit Cost</th>}
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock Levels</th>
                <th className="py-3 px-4">Location & Expiry</th>
                {canModify && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
              {filteredProducts.map(prod => (
                <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Name and Brand */}
                  <td className="py-4 px-4">
                    <div>
                      <span className="font-sans font-medium text-slate-900">{prod.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                        <span>{prod.brand}</span>
                        {prod.alcoholPercentage ? (
                          <span className="bg-slate-100 px-1 py-0.2 rounded text-[9px] text-slate-500 font-mono">
                            {prod.alcoholPercentage}% Vol
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  {/* Barcode and SKU */}
                  <td className="py-4 px-4 font-mono text-xs">
                    <div className="space-y-0.5">
                      <span className="text-slate-900 font-medium flex items-center gap-1">
                        <Barcode className="w-3.5 h-3.5 text-slate-400" />
                        {prod.barcode}
                      </span>
                      <span className="text-slate-400 block">{prod.sku}</span>
                    </div>
                  </td>
                  {/* Category */}
                  <td className="py-4 px-4 text-xs">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">
                      {prod.category}
                    </span>
                  </td>
                  {/* Unit Cost */}
                  {canViewFinancials && (
                    <td className="py-4 px-4 font-mono text-xs text-slate-600">
                      {currencySymbol}{prod.purchasePrice.toFixed(2)}
                    </td>
                  )}
                  {/* Selling Price */}
                  <td className="py-4 px-4 font-mono text-xs font-semibold text-slate-950">
                    {currencySymbol}{prod.sellingPrice.toFixed(2)}
                  </td>
                  {/* Stock Level with alert indicators */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 text-center font-mono font-bold text-xs ${
                        prod.quantity === 0 ? 'text-rose-600' : prod.quantity <= prod.minQuantity ? 'text-amber-600' : 'text-slate-900'
                      }`}>
                        {prod.quantity}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                        prod.status === 'In Stock' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : prod.status === 'Low Stock' 
                          ? 'bg-amber-50 text-amber-700' 
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {prod.status}
                      </span>
                    </div>
                  </td>
                  {/* Location and Expiry */}
                  <td className="py-4 px-4 text-xs text-slate-500">
                    <div className="space-y-0.5">
                      <span className="block font-medium">{prod.location}</span>
                      {prod.expiryDate && (
                        <span className={`text-[10px] flex items-center gap-1 ${
                          new Date(prod.expiryDate).getTime() < Date.now() + (30 * 24 * 3600 * 1000) 
                            ? 'text-rose-500 font-semibold' 
                            : 'text-slate-400'
                        }`}>
                          Exp: {prod.expiryDate}
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Action buttons */}
                  {canModify && (
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setShowAdjustModal(prod)}
                          title="Quick Adjust Stock"
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowEditModal(prod)}
                          title="Edit Details"
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {(userRole === UserRole.SUPER_ADMIN || userRole === UserRole.OWNER) && (
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to completely delete ${prod.name}?`)) {
                                onDeleteProduct(prod.id);
                              }
                            }}
                            title="Delete Product"
                            className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={canModify ? 8 : 6} className="py-12 text-center text-slate-400 text-xs">
                    No items match the current search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================
          MODAL: QUICK ADJUST STOCK (Damaged, Expired)
          ========================================== */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-100 shadow-xl space-y-4 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-sans font-semibold text-slate-900 text-sm">Stocktake & Write-offs</h3>
              <button onClick={() => setShowAdjustModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <span className="text-slate-400 font-mono">Product:</span>
              <p className="font-semibold text-slate-900 mt-0.5">{showAdjustModal.name}</p>
              <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-mono">
                <span>Current Quantity: {showAdjustModal.quantity}</span>
                <span>Barcode: {showAdjustModal.barcode}</span>
              </div>
            </div>

            <form onSubmit={handleApplyAdjustment} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Adjustment Type / Reason</label>
                <select
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value as any)}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs text-slate-800 font-sans cursor-pointer focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Stocktake">Stocktake Correction</option>
                  <option value="Damaged">Write-off: Damaged Stock</option>
                  <option value="Expired">Write-off: Expired Products</option>
                  <option value="Theft">Shrinkage / Theft Loss</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Adjustment Quantity Delta</label>
                <input 
                  type="number"
                  placeholder="e.g. -5 to deduct, 12 to add"
                  value={adjustQtyDelta}
                  onChange={e => setAdjustQtyDelta(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-mono text-slate-900"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Use negative values to deduct stock (damages, expire) and positive to add.</p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-sans font-semibold rounded-xl text-xs shadow flex justify-center items-center gap-1.5"
                >
                  <FileCheck2 className="w-4 h-4" />
                  Save Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: ADD NEW PRODUCT
          ========================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-100 shadow-xl space-y-4 my-8 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-sans font-semibold text-slate-900">Add New Product Record</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-600">Barcode (EAN-13)</label>
                  <div className="flex gap-2 mt-1">
                    <input 
                      type="text" 
                      value={newProduct.barcode}
                      onChange={e => setNewProduct(prev => ({ ...prev, barcode: e.target.value }))}
                      placeholder="e.g. 6001108000011"
                      className="flex-1 px-3 py-2 bg-slate-50 border-none rounded-lg font-mono text-slate-900 text-xs"
                      required
                    />
                    <button 
                      type="button"
                      onClick={triggerGenerateBarcode}
                      className="px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold font-mono"
                    >
                      Gen EAN
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-medium text-slate-600">SKU Code</label>
                  <input 
                    type="text" 
                    value={newProduct.sku}
                    onChange={e => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="e.g. ALC-CSL-375"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg font-mono text-slate-900 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-600">Product Name</label>
                <input 
                  type="text" 
                  value={newProduct.name}
                  onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Castle Lager 375ml"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-slate-900 text-xs font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="font-medium text-slate-600">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={e => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs"
                  >
                    <option value="Alcohol & Beverages">Alcohol & Beverages</option>
                    <option value="Groceries & Soft Drinks">Groceries & Soft Drinks</option>
                    <option value="Snacks & Confectionery">Snacks & Confectionery</option>
                    <option value="Dairy & Fresh Food">Dairy & Fresh Food</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-600">Brand</label>
                  <input 
                    type="text" 
                    value={newProduct.brand}
                    onChange={e => setNewProduct(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="Castle"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600">Supplier</label>
                  <select
                    value={newProduct.supplierId}
                    onChange={e => setNewProduct(prev => ({ ...prev, supplierId: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.company}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <label className="font-medium text-slate-600">Cost Price</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newProduct.purchasePrice}
                    onChange={e => setNewProduct(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600">Selling Price</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newProduct.sellingPrice}
                    onChange={e => setNewProduct(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600">VAT (%)</label>
                  <input 
                    type="number" 
                    value={newProduct.vatPercentage}
                    onChange={e => setNewProduct(prev => ({ ...prev, vatPercentage: parseInt(e.target.value) || 0 }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <label className="font-medium text-slate-600">Initial Quantity</label>
                  <input 
                    type="number" 
                    value={newProduct.quantity}
                    onChange={e => setNewProduct(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600">Min Quantity (Alert)</label>
                  <input 
                    type="number" 
                    value={newProduct.minQuantity}
                    onChange={e => setNewProduct(prev => ({ ...prev, minQuantity: parseInt(e.target.value) || 0 }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600">Location</label>
                  <input 
                    type="text" 
                    value={newProduct.location}
                    onChange={e => setNewProduct(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Shelf A"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <label className="font-medium text-slate-600">Expiry Date</label>
                  <input 
                    type="date" 
                    value={newProduct.expiryDate}
                    onChange={e => setNewProduct(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600">Batch Number</label>
                  <input 
                    type="text" 
                    value={newProduct.batchNumber}
                    onChange={e => setNewProduct(prev => ({ ...prev, batchNumber: e.target.value }))}
                    placeholder="B-9921"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600">Alcohol % (Optional)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newProduct.alcoholPercentage}
                    onChange={e => setNewProduct(prev => ({ ...prev, alcoholPercentage: parseFloat(e.target.value) || 0 }))}
                    placeholder="5.0"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow"
                >
                  Save Product Record
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: EDIT PRODUCT DETAILS
          ========================================== */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-100 shadow-xl space-y-4 my-8 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-sans font-semibold text-slate-900">Edit Product Details</h3>
              <button onClick={() => setShowEditModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4 text-xs">
              
              <div>
                <label className="font-medium text-slate-600">Product Name</label>
                <input 
                  type="text" 
                  value={showEditModal.name}
                  onChange={e => setShowEditModal(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-slate-900 text-xs font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-600">Cost Price ({currencySymbol})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={showEditModal.purchasePrice}
                    onChange={e => setShowEditModal(prev => prev ? ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }) : null)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600">Selling Price ({currencySymbol})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={showEditModal.sellingPrice}
                    onChange={e => setShowEditModal(prev => prev ? ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }) : null)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <label className="font-medium text-slate-600">Quantity in Stock</label>
                  <input 
                    type="number" 
                    value={showEditModal.quantity}
                    onChange={e => setShowEditModal(prev => prev ? ({ ...prev, quantity: parseInt(e.target.value) || 0 }) : null)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600">Min Stock Limit</label>
                  <input 
                    type="number" 
                    value={showEditModal.minQuantity}
                    onChange={e => setShowEditModal(prev => prev ? ({ ...prev, minQuantity: parseInt(e.target.value) || 0 }) : null)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600">Warehouse Location</label>
                  <input 
                    type="text" 
                    value={showEditModal.location}
                    onChange={e => setShowEditModal(prev => prev ? ({ ...prev, location: e.target.value }) : null)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <label className="font-medium text-slate-600">Expiry Date</label>
                  <input 
                    type="date" 
                    value={showEditModal.expiryDate || ''}
                    onChange={e => setShowEditModal(prev => prev ? ({ ...prev, expiryDate: e.target.value }) : null)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600">Batch Number</label>
                  <input 
                    type="text" 
                    value={showEditModal.batchNumber || ''}
                    onChange={e => setShowEditModal(prev => prev ? ({ ...prev, batchNumber: e.target.value }) : null)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow"
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
