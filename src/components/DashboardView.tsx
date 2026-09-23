/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  Clock, 
  ShieldAlert,
  Calendar,
  FileSpreadsheet,
  Download,
  Printer,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell
} from 'recharts';
import { UserRole } from '../types.ts';

interface DashboardViewProps {
  stats: any;
  userRole: UserRole;
  currencySymbol: string;
}

export default function DashboardView({ stats, userRole, currencySymbol }: DashboardViewProps) {
  const [selectedPrintSale, setSelectedPrintSale] = useState<any | null>(null);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const cardStyle = "bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow duration-200";

  // Hide financial metrics from Cashiers
  const showFinance = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.OWNER || userRole === UserRole.MANAGER;
  const showProfit = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.OWNER;

  // Custom colors for charts
  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#38bdf8'];

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard-module">
      {/* Upper bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-sans font-medium tracking-tight text-slate-900">Retail Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Live analytics and performance metrics for this branch.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Today: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          {showFinance && (
            <button 
              onClick={() => alert('Exporting dashboard report to Excel...')}
              className="text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
              id="export-dash-btn"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sales Card */}
        {showFinance ? (
          <div className={cardStyle} id="stat-revenue">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Revenue</span>
                <h3 className="text-3xl font-sans font-medium text-slate-900">
                  {currencySymbol}{stats.revenue.toFixed(2)}
                </h3>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <DollarSign className="w-5 h-5 text-slate-800" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-emerald-600 text-xs font-semibold">
              <ArrowUpRight className="w-4 h-4" />
              <span>+14.5% from yesterday</span>
            </div>
          </div>
        ) : (
          <div className={cardStyle} id="stat-sales-count">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Sales</span>
                <h3 className="text-3xl font-sans font-medium text-slate-900">
                  {stats.recentSales.length} Transactions
                </h3>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <TrendingUp className="w-5 h-5 text-slate-800" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-emerald-600 text-xs font-semibold">
              <span>Active POS Shift</span>
            </div>
          </div>
        )}

        {/* Expenses Card */}
        {showFinance && (
          <div className={cardStyle} id="stat-expenses">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cost & Expenses</span>
                <h3 className="text-3xl font-sans font-medium text-slate-900">
                  {currencySymbol}{stats.expenses.toFixed(2)}
                </h3>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <FileSpreadsheet className="w-5 h-5 text-slate-800" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-rose-500 text-xs font-semibold">
              <ArrowDownRight className="w-4 h-4" />
              <span>Deductions & COGS</span>
            </div>
          </div>
        )}

        {/* Profit Card */}
        {showProfit ? (
          <div className={`${cardStyle} bg-slate-900 border-slate-950`} id="stat-profit">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Net Profit (Est)</span>
                <h3 className="text-3xl font-sans font-medium text-white">
                  {currencySymbol}{stats.profit.toFixed(2)}
                </h3>
              </div>
              <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-emerald-400 text-xs font-semibold">
              <ArrowUpRight className="w-4 h-4" />
              <span>Healthy Margin ({(stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0).toFixed(0)}%)</span>
            </div>
          </div>
        ) : showFinance ? (
          <div className={cardStyle} id="stat-profit-restricted">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Net Profit</span>
                <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>Restricted to Owner</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Stock Alerts Card */}
        <div className={cardStyle} id="stat-stock-alerts">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Low / Out of Stock</span>
              <h3 className="text-3xl font-sans font-medium text-slate-900">
                {stats.lowStockCount + stats.outOfStockCount} Items
              </h3>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-slate-500 text-xs">
            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md font-mono font-medium">{stats.outOfStockCount} Empty</span>
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-mono font-medium">{stats.lowStockCount} Critical</span>
          </div>
        </div>

        {/* Pending Orders Card */}
        <div className={cardStyle} id="stat-pending-orders">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Orders</span>
              <h3 className="text-3xl font-sans font-medium text-slate-900">
                {stats.pendingOrdersCount} POs
              </h3>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <Clock className="w-5 h-5 text-slate-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-slate-500 text-xs">
            <span>Awaiting stock arrival</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Trend Area Chart */}
        {showFinance ? (
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs" id="chart-revenue-trend">
            <h4 className="text-sm font-medium text-slate-900 uppercase tracking-wider mb-6">Sales Trend Today</h4>
            <div className="h-72 w-full min-w-0 min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={stats.salesTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1D23', borderRadius: '12px', border: '1px solid #2D3139', color: '#E2E8F0' }}
                    labelClassName="text-xs text-[#94A3B8]"
                    itemStyle={{ fontSize: '12px', color: '#E2E8F0' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col justify-center items-center h-80 text-center" id="chart-revenue-restricted">
            <Package className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-sans font-medium text-slate-700">Financial Chart Restricted</h4>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">Detailed sales trend charts and financial records are only viewable by store managers and owners.</p>
          </div>
        )}

        {/* Top Products Bar Chart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs" id="chart-top-products">
          <h4 className="text-sm font-medium text-slate-900 uppercase tracking-wider mb-6">Top Selling Items</h4>
          {stats.topSelling.length > 0 ? (
            <div className="h-72 w-full min-w-0 min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={stats.topSelling} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#94A3B8', fontSize: 11 }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1D23', borderRadius: '12px', border: '1px solid #2D3139', color: '#E2E8F0' }}
                    itemStyle={{ fontSize: '11px', color: '#E2E8F0' }}
                  />
                  <Bar dataKey="qty" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={14}>
                    {stats.topSelling.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Package className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">No products sold yet today.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid - Recent Sales */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs" id="recent-sales-table">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-sm font-medium text-slate-900 uppercase tracking-wider">Recent Transactions</h4>
          <span className="text-xs text-slate-500 font-mono">Total logs: {stats.recentSales.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-mono">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
              {stats.recentSales.map((sale: any) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-900 font-medium">{sale.invoiceNumber}</td>
                  <td className="py-3.5 px-4 text-slate-600">{sale.cashier}</td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md font-medium">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-900 font-semibold">
                    {currencySymbol}{sale.total.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => setSelectedPrintSale(sale)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-all focus:outline-none"
                      title="Print Invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </td>
                </tr>
              ))}
              {stats.recentSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No transactions captured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/*                    PRINT INVOICE SYSTEM & MODAL                      */}
      {/* ==================================================================== */}
      {selectedPrintSale && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-fade-in" id="print_invoice_modal">
          {/* Inject Dynamic Printing CSS styling rules */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
              }
              /* Hide absolutely everything on the web page */
              body * {
                visibility: hidden !important;
              }
              /* Show only the targeted invoice container and its contents */
              #printable-invoice-container, #printable-invoice-container * {
                visibility: visible !important;
              }
              /* Position the printable container at the top left of the printing page */
              #printable-invoice-container {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 15mm !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                color: black !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              /* Hide print-preview dialog element tree completely */
              #print_invoice_modal {
                background: none !important;
                backdrop-filter: none !important;
              }
              #print_preview_dialog_card {
                background: none !important;
                border: none !important;
                box-shadow: none !important;
              }
              #print_action_bar, .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="max-w-2xl w-full bg-[#16191F] border border-[#2D3139] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" id="print_preview_dialog_card">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#2D3139] flex justify-between items-center" id="print_preview_header">
              <div className="flex items-center gap-2 text-blue-400">
                <Printer className="w-5 h-5" />
                <h3 className="text-sm font-semibold text-white font-sans uppercase tracking-wider">
                  Invoice Print Preview
                </h3>
              </div>
              <button
                onClick={() => setSelectedPrintSale(null)}
                className="p-1.5 bg-[#1A1D23] hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Formatted Invoice Container */}
            <div className="p-6 overflow-y-auto bg-slate-900/50 flex-1">
              <div className="bg-white text-slate-900 p-8 rounded-xl border border-slate-200 max-w-xl mx-auto font-sans shadow-lg space-y-6" id="printable-invoice-container">
                {/* Header branding */}
                <div className="text-center space-y-1 pb-5 border-b border-slate-200">
                  <h2 className="text-xl font-extrabold uppercase tracking-wide text-slate-950 font-sans">
                    COBULT STOCKS RETAIL
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">123 Samora Machel Ave, Harare CBD, Zimbabwe</p>
                  <p className="text-[11px] text-slate-500">Phone: +263 771 111 222 | support@cobultstocks.com</p>
                  <p className="text-[10px] text-slate-400 font-mono">VAT Reg No: VAT-789-201-99</p>
                </div>

                {/* Metadata details */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">BILL TO</span>
                    <strong className="text-slate-900 text-sm block">
                      {selectedPrintSale.customerName || 'Walk-In Client'}
                    </strong>
                    {selectedPrintSale.customerId && (
                      <span className="text-[10px] text-slate-500 font-mono block bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 w-max">
                        Loyalty ID: {selectedPrintSale.customerId}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="flex justify-between md:justify-end gap-2">
                      <span className="text-slate-400">Invoice #:</span>
                      <strong className="text-slate-900 font-mono">{selectedPrintSale.invoiceNumber}</strong>
                    </div>
                    <div className="flex justify-between md:justify-end gap-2">
                      <span className="text-slate-400">Date/Time:</span>
                      <span className="text-slate-700">{new Date(selectedPrintSale.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between md:justify-end gap-2">
                      <span className="text-slate-400">Cashier ID:</span>
                      <span className="text-slate-700 font-mono">{selectedPrintSale.cashier || selectedPrintSale.cashierName}</span>
                    </div>
                  </div>
                </div>

                {/* Item List Table */}
                <div className="pt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                        <th className="py-2 pb-2">Item Description</th>
                        <th className="py-2 pb-2 text-center w-12">Qty</th>
                        <th className="py-2 pb-2 text-right w-24">Unit Price</th>
                        <th className="py-2 pb-2 text-right w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedPrintSale.items && selectedPrintSale.items.length > 0 ? (
                        selectedPrintSale.items.map((item: any) => (
                          <tr key={item.id || item.productId}>
                            <td className="py-3 font-medium text-slate-900">
                              <span>{item.name}</span>
                              {item.barcode && (
                                <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                                  Barcode: {item.barcode}
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-center font-mono">{item.quantity}</td>
                            <td className="py-3 text-right font-mono">{currencySymbol}{item.price.toFixed(2)}</td>
                            <td className="py-3 text-right font-mono font-medium text-slate-950">
                              {currencySymbol}{item.subtotal.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                            No product rows available in transaction record.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summaries Block */}
                <div className="border-t border-slate-200 pt-4 flex justify-end">
                  <div className="w-64 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span className="font-mono text-slate-800">
                        {currencySymbol}{(selectedPrintSale.subtotal || selectedPrintSale.total).toFixed(2)}
                      </span>
                    </div>
                    {selectedPrintSale.discountTotal > 0 && (
                      <div className="flex justify-between text-rose-600 font-medium">
                        <span>Discount Total:</span>
                        <span className="font-mono">-{currencySymbol}{selectedPrintSale.discountTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                      <span>VAT Included (15%):</span>
                      <span className="font-mono text-slate-800">
                        {currencySymbol}{(selectedPrintSale.taxTotal || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-950 border-t border-slate-200 pt-2">
                      <span>Total Amount Paid:</span>
                      <span className="font-mono">{currencySymbol}{selectedPrintSale.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Payment Mode:</span>
                      <span className="font-semibold text-slate-700">{selectedPrintSale.paymentMethod}</span>
                    </div>
                    {selectedPrintSale.paymentMethod === 'Cash' && selectedPrintSale.changeDue !== undefined && (
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Change Returned:</span>
                        <span className="font-mono text-slate-700">{currencySymbol}{selectedPrintSale.changeDue.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Guarantee footer note */}
                <div className="text-center pt-6 border-t border-dashed border-slate-200 mt-4 space-y-1">
                  <p className="text-xs font-bold text-slate-800">Thank you for your business!</p>
                  <p className="text-[9px] text-slate-400 leading-normal">
                    This is a digital point-of-sale receipt verification document.<br />
                    Returns of unopened bottles/items only accepted with original invoice within 7 days.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#2D3139] bg-[#1A1D23] flex justify-end gap-3" id="print_action_bar">
              <button
                type="button"
                onClick={() => setSelectedPrintSale(null)}
                className="px-4 py-2 bg-[#16191F] border border-[#2D3139] hover:bg-[#2D3139] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors focus:outline-none"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/10 transition-all focus:outline-none"
              >
                <Printer className="w-4 h-4" />
                <span>Confirm & Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
