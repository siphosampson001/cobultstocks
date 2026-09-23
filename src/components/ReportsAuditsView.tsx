/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  ShieldAlert, 
  Download, 
  Calendar, 
  BarChart, 
  Users, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  FileSpreadsheet,
  AlertOctagon,
  Search,
  Activity,
  Award,
  UserCheck,
  Filter,
  KeyRound,
  Trash2,
  Edit3,
  ShoppingCart,
  ArrowLeftRight,
  UserPlus,
  RotateCcw,
  Shield,
  Layers,
  ChevronRight,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Printer
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell
} from 'recharts';
import { Sale, AuditLog, Product, UserRole, User } from '../types.ts';

interface ReportsAuditsViewProps {
  sales: Sale[];
  auditLogs: AuditLog[];
  products: Product[];
  currencySymbol: string;
  userRole: UserRole;
  taxPercentage: number;
  users?: User[];
}

export default function ReportsAuditsView({
  sales,
  auditLogs,
  products,
  currencySymbol,
  userRole,
  taxPercentage,
  users = []
}: ReportsAuditsViewProps) {
  // Tabs: Reports, Employee Activity, or Security Audits
  const [activeTab, setActiveTab] = useState<'reports' | 'employee_activity' | 'audits'>('reports');
  
  // Security Audits tab search
  const [searchLog, setSearchLog] = useState('');

  // Employee Activity tab filters
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  // Restricted Access flags
  const isOwner = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.OWNER;
  const isManager = userRole === UserRole.MANAGER;
  const canAccessAudits = isOwner || isManager;

  // 1. Calculations: Cashier Performance
  const cashierPerfData = useMemo(() => {
    const map: Record<string, { name: string; sales: number; count: number }> = {};
    sales.forEach(s => {
      if (!map[s.cashierId]) {
        map[s.cashierId] = { name: s.cashierName, sales: 0, count: 0 };
      }
      map[s.cashierId].sales += s.total;
      map[s.cashierId].count += 1;
    });
    return Object.values(map);
  }, [sales]);

  // 2. Calculations: Fast vs Slow Moving Stock
  const stockMovements = useMemo(() => {
    const tally: Record<string, number> = {};
    sales.forEach(s => {
      s.items.forEach(item => {
        tally[item.productId] = (tally[item.productId] || 0) + item.quantity;
      });
    });

    const fastMoving: { name: string; qtySold: number; left: number }[] = [];
    const slowMoving: { name: string; left: number; costValue: number }[] = [];

    products.forEach(p => {
      const sold = tally[p.id] || 0;
      if (sold > 5) {
        fastMoving.push({ name: p.name, qtySold: sold, left: p.quantity });
      } else if (sold === 0 && p.quantity > 0) {
        slowMoving.push({ name: p.name, left: p.quantity, costValue: p.purchasePrice * p.quantity });
      }
    });

    return {
      fastMoving: fastMoving.sort((a, b) => b.qtySold - a.qtySold).slice(0, 5),
      slowMoving: slowMoving.sort((a, b) => b.left - a.left).slice(0, 5)
    };
  }, [sales, products]);

  // 3. VAT/Tax report summary
  const taxMetrics = useMemo(() => {
    let totalTaxable = 0;
    let totalVatCollected = 0;
    sales.forEach(s => {
      if (s.status === 'Completed') {
        totalVatCollected += s.taxTotal;
        totalTaxable += s.total - s.taxTotal;
      }
    });
    return {
      totalTaxable,
      totalVatCollected
    };
  }, [sales]);

  // 4. Filtered Logs for Security Audits Tab
  const filteredSecurityLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchSearch = log.action.toLowerCase().includes(searchLog.toLowerCase()) ||
                          log.userName.toLowerCase().includes(searchLog.toLowerCase()) ||
                          log.details.toLowerCase().includes(searchLog.toLowerCase());
      return matchSearch;
    });
  }, [auditLogs, searchLog]);

  // 5. Employee Activity calculations & filtered feed
  const staffActivityData = useMemo(() => {
    // Unique list of staff members from logs and user records
    const staffMap: Record<string, {
      id: string;
      name: string;
      role: UserRole;
      actionCount: number;
      lastAction: string;
      branchId: string;
    }> = {};

    auditLogs.forEach(log => {
      const key = log.userName.toLowerCase();
      if (!staffMap[key]) {
        staffMap[key] = {
          id: log.userId || key,
          name: log.userName,
          role: log.userRole || UserRole.CASHIER,
          actionCount: 0,
          lastAction: log.timestamp,
          branchId: log.branchId || 'b1'
        };
      }
      staffMap[key].actionCount += 1;
      if (new Date(log.timestamp) > new Date(staffMap[key].lastAction)) {
        staffMap[key].lastAction = log.timestamp;
      }
    });

    const staffList = Object.values(staffMap).sort((a, b) => b.actionCount - a.actionCount);

    // Apply filters to logs for Employee Activity Feed
    const filtered = auditLogs.filter(log => {
      // Search filter
      const searchLower = staffSearch.toLowerCase();
      const matchesSearch = !staffSearch || (
        log.userName.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower) ||
        log.details.toLowerCase().includes(searchLower) ||
        (log.branchId && log.branchId.toLowerCase().includes(searchLower))
      );

      // Staff filter
      const matchesStaff = selectedStaff === 'all' || 
        log.userName.toLowerCase() === selectedStaff.toLowerCase() ||
        log.userId === selectedStaff;

      // Category filter
      let matchesCategory = true;
      const act = log.action.toUpperCase();
      if (selectedCategory === 'logins') {
        matchesCategory = act.includes('LOGIN') || act.includes('LOGOUT') || act.includes('PASSWORD');
      } else if (selectedCategory === 'inventory') {
        matchesCategory = act.includes('PRODUCT') || act.includes('STOCK') || act.includes('PURCHASE');
      } else if (selectedCategory === 'sales') {
        matchesCategory = act.includes('SALE') || act.includes('QUOTATION') || act.includes('RETURN');
      } else if (selectedCategory === 'staff') {
        matchesCategory = act.includes('USER') || act.includes('PROVISION') || act.includes('BRANCH');
      } else if (selectedCategory === 'financial') {
        matchesCategory = act.includes('EXPENSE') || act.includes('TAX') || act.includes('PAYMENT');
      }

      // Date range filter
      let matchesDate = true;
      if (dateRange !== 'all') {
        const logDate = new Date(log.timestamp).getTime();
        const now = Date.now();
        if (dateRange === 'today') {
          const todayStart = new Date().setHours(0,0,0,0);
          matchesDate = logDate >= todayStart;
        } else if (dateRange === '7days') {
          matchesDate = logDate >= now - 7 * 24 * 60 * 60 * 1000;
        } else if (dateRange === '30days') {
          matchesDate = logDate >= now - 30 * 24 * 60 * 60 * 1000;
        }
      }

      return matchesSearch && matchesStaff && matchesCategory && matchesDate;
    });

    // Activity Metrics
    const criticalActionsCount = filtered.filter(l => 
      l.action.includes('DELETE') || 
      l.action.includes('ADJUST') || 
      l.action.includes('PASSWORD') ||
      l.action.includes('PROVISION')
    ).length;

    const latestTimestamp = filtered.length > 0 ? filtered[0].timestamp : null;

    return {
      staffList,
      filteredLogs: filtered,
      totalCount: filtered.length,
      activeStaffCount: staffList.length,
      criticalActionsCount,
      latestTimestamp
    };
  }, [auditLogs, staffSearch, selectedStaff, selectedCategory, dateRange]);

  const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8'];

  // Helper for relative time formatting
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  // Helper to render action badge & icon
  const renderActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('LOGIN') || act.includes('LOGOUT')) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
          <KeyRound className="w-3 h-3 text-emerald-600" />
          {action}
        </span>
      );
    }
    if (act.includes('DELETE')) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
          <Trash2 className="w-3 h-3 text-rose-600" />
          {action}
        </span>
      );
    }
    if (act.includes('UPDATE') || act.includes('EDIT')) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
          <Edit3 className="w-3 h-3 text-amber-600" />
          {action}
        </span>
      );
    }
    if (act.includes('SALE') || act.includes('QUOTATION')) {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
          <ShoppingCart className="w-3 h-3 text-blue-600" />
          {action}
        </span>
      );
    }
    if (act.includes('TRANSFER') || act.includes('STOCK')) {
      return (
        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
          <ArrowLeftRight className="w-3 h-3 text-indigo-600" />
          {action}
        </span>
      );
    }
    if (act.includes('PROVISION') || act.includes('USER')) {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
          <UserPlus className="w-3 h-3 text-purple-600" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
        <Activity className="w-3 h-3 text-slate-500" />
        {action}
      </span>
    );
  };

  // Trigger native browser print specifically formatted for PDF audit exports
  const handlePrintPDF = () => {
    window.print();
  };

  // Simulated export action
  const triggerExport = (format: 'Excel' | 'PDF' | 'CSV') => {
    alert(`Generating ${activeTab === 'employee_activity' ? 'Employee Activity Audit' : 'Performance'} ${format} report export... File downloaded successfully.`);
  };

  // Export CSV specifically for staff activity
  const exportEmployeeActivityCSV = () => {
    const headers = ['Timestamp', 'Staff Member', 'Role', 'Branch', 'Action', 'Details', 'IP Address', 'Device'];
    const rows = staffActivityData.filteredLogs.map(l => [
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.userName}"`,
      `"${l.userRole || ''}"`,
      `"${l.branchId || ''}"`,
      `"${l.action}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.ipAddress || ''}"`,
      `"${l.device || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `employee_activity_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="reports-module">
      
      {/* Dynamic Print Stylesheet for Crisp PDF Auditing */}
      <style>{`
        @media print {
          /* Hide non-report layout elements */
          header, aside, footer, #quick-replenish-modal-overlay, .no-print {
            display: none !important;
          }

          /* Force high contrast clean background for printing */
          body, html, #root, main {
            background-color: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
          }

          /* Adapt container boxes & cards to light print format */
          .bg-white, .bg-slate-50, .bg-slate-100, .bg-slate-900 {
            background-color: #ffffff !important;
            color: #0f172a !important;
            border-color: #cbd5e1 !important;
            box-shadow: none !important;
          }

          .text-slate-900, .text-slate-800, .text-slate-700, .text-slate-600, .text-slate-500, .text-slate-400 {
            color: #0f172a !important;
          }

          /* Format tables for crisp audit printing */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 12px !important;
          }

          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 8px 10px !important;
            color: #0f172a !important;
            font-size: 10px !important;
          }

          thead th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
          }

          tr {
            page-break-inside: avoid !important;
          }

          /* Ensure page breaks inside cards are avoided */
          .bg-white {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Official Audit Report Header (Visible only when printed / saved to PDF) */}
      <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-900">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight font-sans">Cobult Stocks POS &mdash; Official Audit Report</h1>
            <p className="text-xs text-slate-700 mt-1 font-medium">
              Report Section: <strong className="text-slate-900 font-bold">{
                activeTab === 'reports' ? 'Performance & Sales Tax Analytics' :
                activeTab === 'employee_activity' ? 'Employee Activity & Staff Action Audit Trail' :
                'Security Audit Trail & Compliance'
              }</strong>
            </p>
          </div>
          <div className="text-right text-xs text-slate-700 font-mono">
            <p className="font-bold text-slate-900 uppercase tracking-wider">CONFIDENTIAL AUDIT DOCUMENT</p>
            <p className="mt-0.5">Date: {new Date().toLocaleDateString([], { dateStyle: 'full' })}</p>
            <p>Time: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Print Filter & Context Summary */}
        <div className="mt-3 pt-3 border-t border-slate-300 text-xs flex justify-between text-slate-800 bg-slate-100 p-3 rounded font-mono">
          {activeTab === 'employee_activity' && (
            <>
              <div>
                <span>Staff: <strong>{selectedStaff === 'all' ? 'All Employees' : selectedStaff}</strong></span> &bull; {' '}
                <span>Category: <strong>{selectedCategory === 'all' ? 'All Actions' : selectedCategory}</strong></span> &bull; {' '}
                <span>Timeframe: <strong>{dateRange === 'all' ? 'All Time' : dateRange}</strong></span>
              </div>
              <div>
                <span>Matching Entries: <strong>{staffActivityData.totalCount}</strong></span>
              </div>
            </>
          )}

          {activeTab === 'audits' && (
            <>
              <div>
                <span>Filter Query: <strong>{searchLog || 'All Security Events'}</strong></span>
              </div>
              <div>
                <span>Total Events: <strong>{filteredSecurityLogs.length}</strong></span>
              </div>
            </>
          )}

          {activeTab === 'reports' && (
            <>
              <div>
                <span>VAT Rate: <strong>{taxPercentage}% Standard</strong></span> &bull; {' '}
                <span>Currency: <strong>{currencySymbol}</strong></span>
              </div>
              <div>
                <span>Taxable Turnover: <strong>{currencySymbol}{taxMetrics.totalTaxable.toFixed(2)}</strong></span> &bull; {' '}
                <span>VAT Liability: <strong>{currencySymbol}{taxMetrics.totalVatCollected.toFixed(2)}</strong></span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upper bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-sans font-medium tracking-tight text-slate-900">Reports & Staff Audit Logs</h1>
          <p className="text-slate-500 text-sm mt-1">Monitor operational throughput, staff activity timelines, and security audit trails.</p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'employee_activity' && (
            <button 
              onClick={exportEmployeeActivityCSV}
              className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
              id="export-employee-csv-btn"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Export CSV
            </button>
          )}
          {activeTab === 'reports' && (
            <button 
              onClick={() => triggerExport('Excel')}
              className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
              id="export-excel-btn"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
          )}

          <button 
            onClick={handlePrintPDF}
            className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            id="export-pdf-btn"
          >
            <Printer className="w-4 h-4" />
            Export to PDF
          </button>
        </div>
      </div>

      {/* Tabs Selection Bar */}
      <div className="flex gap-6 border-b border-slate-200 pb-px overflow-x-auto no-print">
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 text-sm font-sans font-medium relative transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reports' ? 'text-slate-900 font-semibold' : 'text-slate-400 hover:text-slate-600'
          }`}
          id="tab-btn-reports"
        >
          <BarChart className="w-4 h-4" />
          Performance Reports
          {activeTab === 'reports' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />}
        </button>

        <button
          onClick={() => setActiveTab('employee_activity')}
          className={`pb-3 text-sm font-sans font-medium relative transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'employee_activity' ? 'text-slate-900 font-semibold' : 'text-slate-400 hover:text-slate-600'
          }`}
          id="tab-btn-employee-activity"
        >
          <UserCheck className="w-4 h-4 text-blue-600" />
          Employee Activity
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
            {auditLogs.length}
          </span>
          {activeTab === 'employee_activity' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
        </button>

        {canAccessAudits && (
          <button
            onClick={() => setActiveTab('audits')}
            className={`pb-3 text-sm font-sans font-medium relative transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audits' ? 'text-slate-900 font-semibold' : 'text-slate-400 hover:text-slate-600'
            }`}
            id="tab-btn-audits"
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            Security Audit Trails
            {activeTab === 'audits' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />}
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. PERFORMANCE REPORTS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-8" id="reports-container">
          
          {/* VAT Ledger summary */}
          {canAccessAudits && (
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400">VAT Reg: VAT-789-201-99</span>
                <h4 className="font-sans font-semibold text-slate-800 text-sm mt-1">Sales Tax & VAT Ledger</h4>
                <p className="text-xs text-slate-400 mt-1">Cumulative tax liability computed at standard rate of {taxPercentage}%.</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 font-mono">Taxable Sales Turnover</span>
                <p className="text-xl font-bold text-slate-900">{currencySymbol}{taxMetrics.totalTaxable.toFixed(2)}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] text-emerald-600 font-semibold font-mono flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  VAT Liability Collected
                </span>
                <p className="text-xl font-bold text-slate-900">{currencySymbol}{taxMetrics.totalVatCollected.toFixed(2)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cashier Throughput performance */}
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="font-sans font-medium text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wider">
                  <Award className="w-4 h-4 text-slate-700" />
                  Cashier Performance
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Sales throughput registered per cashier terminal.</p>
              </div>

              {cashierPerfData.length > 0 ? (
                <div className="h-64 w-full min-w-0 min-h-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <RechartsBarChart data={cashierPerfData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                        itemStyle={{ fontSize: '11px', color: '#fff' }}
                      />
                      <Bar dataKey="sales" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={35}>
                        {cashierPerfData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-44 text-center">
                  <Users className="w-8 h-8 text-slate-200" />
                  <p className="text-xs text-slate-400 mt-2">No cashier transactions logged yet today.</p>
                </div>
              )}
            </div>

            {/* Fast Moving Inventory Stock */}
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
              <div className="mb-4">
                <h3 className="font-sans font-medium text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-slate-700" />
                  Fast-Moving Inventory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Items with high turnover rates requiring regular PO reorders.</p>
              </div>

              <div className="space-y-3">
                {stockMovements.fastMoving.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="font-sans font-semibold text-slate-800">{item.name}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.left} units remaining on shelf</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 font-mono font-bold px-2 py-1 rounded text-[10px]">
                      {item.qtySold} sold
                    </span>
                  </div>
                ))}

                {stockMovements.fastMoving.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-44 text-center">
                    <TrendingUp className="w-8 h-8 text-slate-200" />
                    <p className="text-xs text-slate-400 mt-2">Products sold under threshold limits to classify.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Slow/Dead Stock analysis */}
          {canAccessAudits && (
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-sans font-medium text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wider">
                    <AlertOctagon className="w-4 h-4 text-slate-700" />
                    Dead / Slow Moving Capital (Write-Off Risks)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Products with zero turnover representing dead locked capital.</p>
                </div>
                <button 
                  onClick={() => alert('Triggering automatic supplier return order recommendations...')}
                  className="text-[10px] font-sans font-semibold bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg shadow-sm"
                >
                  Request Returns
                </button>
              </div>

              <div className="space-y-2.5">
                {stockMovements.slowMoving.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-rose-50/20 border border-rose-50 p-3 rounded-xl text-xs text-slate-800">
                    <div className="space-y-0.5">
                      <span className="font-medium text-slate-900">{item.name}</span>
                      <p className="text-[10px] text-slate-400">{item.left} stagnant units in warehouse</p>
                    </div>
                    <span className="font-mono text-rose-600 font-semibold">
                      Capital locked: {currencySymbol}{item.costValue.toFixed(2)}
                    </span>
                  </div>
                ))}

                {stockMovements.slowMoving.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">All products have had active sales velocity.</p>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EMPLOYEE ACTIVITY TAB (NEW FEATURE) */}
      {/* ========================================================================= */}
      {activeTab === 'employee_activity' && (
        <div className="space-y-6 animate-fade-in" id="employee-activity-container">

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-mono uppercase tracking-wider">Logged Actions</span>
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold font-sans text-slate-900">{staffActivityData.totalCount}</p>
              <p className="text-[10px] text-slate-400">Recorded staff operation logs</p>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-mono uppercase tracking-wider">Staff Active</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold font-sans text-slate-900">{staffActivityData.activeStaffCount}</p>
              <p className="text-[10px] text-slate-400">Employees with recorded activity</p>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-mono uppercase tracking-wider">Sensitive Operations</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-bold font-sans text-slate-900">{staffActivityData.criticalActionsCount}</p>
              <p className="text-[10px] text-slate-400">Deletions, price & user edits</p>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-mono uppercase tracking-wider">Latest Activity</span>
                <Clock className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-sm font-bold font-mono text-slate-900 truncate">
                {staffActivityData.latestTimestamp ? formatTimeAgo(staffActivityData.latestTimestamp) : 'None'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {staffActivityData.latestTimestamp ? new Date(staffActivityData.latestTimestamp).toLocaleTimeString() : 'No recent logs'}
              </p>
            </div>
          </div>

          {/* Staff Member Quick Selector Grid */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs space-y-3 no-print">
            <div className="flex justify-between items-center">
              <h3 className="font-sans font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Staff Activity Breakdown
              </h3>
              {selectedStaff !== 'all' && (
                <button
                  onClick={() => setSelectedStaff('all')}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Show All Employees
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <button
                onClick={() => setSelectedStaff('all')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedStaff === 'all' 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                    : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <UserCheck className="w-4 h-4 opacity-80" />
                  <span className="text-[10px] font-mono font-bold">{auditLogs.length}</span>
                </div>
                <p className="text-xs font-bold truncate">All Staff</p>
                <p className="text-[9px] opacity-70">Entire Team</p>
              </button>

              {staffActivityData.staffList.map((staff, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedStaff(staff.name)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedStaff.toLowerCase() === staff.name.toLowerCase()
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="w-6 h-6 rounded-full bg-slate-200 font-mono font-bold text-[10px] flex items-center justify-center text-slate-700 uppercase">
                      {staff.name.slice(0, 2)}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
                      {staff.actionCount}
                    </span>
                  </div>
                  <p className="text-xs font-bold truncate">{staff.name}</p>
                  <p className="text-[9px] opacity-70 flex justify-between">
                    <span>{staff.role}</span>
                    <span>{formatTimeAgo(staff.lastAction)}</span>
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Search and Filters Toolbar */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-2xs space-y-3 no-print">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff, login, sale deletion..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                  id="employee-activity-search-input"
                />
              </div>

              {/* Staff Selector */}
              <div className="relative">
                <select
                  value={selectedStaff}
                  onChange={e => setSelectedStaff(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800 appearance-none pr-8 cursor-pointer"
                  id="employee-activity-staff-select"
                >
                  <option value="all">Filter: All Staff Members</option>
                  {staffActivityData.staffList.map((s, idx) => (
                    <option key={idx} value={s.name}>{s.name} ({s.role})</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Action Category Selector */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800 appearance-none pr-8 cursor-pointer"
                  id="employee-activity-category-select"
                >
                  <option value="all">All Action Categories</option>
                  <option value="logins">🔑 Logins & Credentials</option>
                  <option value="inventory">📦 Products & Stock Edits</option>
                  <option value="sales">🛒 Sales, Returns & Deletions</option>
                  <option value="staff">👤 Staff & Account Management</option>
                  <option value="financial">💵 Expenses & Payments</option>
                </select>
                <Layers className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Date Filter */}
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={e => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800 appearance-none pr-8 cursor-pointer"
                  id="employee-activity-date-select"
                >
                  <option value="all">Date Range: All Time</option>
                  <option value="today">Today Only</option>
                  <option value="7days">Past 7 Days</option>
                  <option value="30days">Past 30 Days</option>
                </select>
                <Calendar className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

            </div>

            {/* Active Filter Indicators */}
            {(staffSearch || selectedStaff !== 'all' || selectedCategory !== 'all' || dateRange !== 'all') && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-700">Active Filters:</span>
                  {selectedStaff !== 'all' && (
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      Staff: {selectedStaff}
                    </span>
                  )}
                  {selectedCategory !== 'all' && (
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium capitalize">
                      Type: {selectedCategory}
                    </span>
                  )}
                  {dateRange !== 'all' && (
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                      Time: {dateRange}
                    </span>
                  )}
                  {staffSearch && (
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                      Query: "{staffSearch}"
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setStaffSearch('');
                    setSelectedStaff('all');
                    setSelectedCategory('all');
                    setDateRange('all');
                  }}
                  className="text-rose-600 hover:text-rose-800 font-semibold transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Activity Logs Feed Table */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="employee-activity-table">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] text-slate-500 uppercase font-mono tracking-wider">
                    <th className="py-3 px-4">Staff Operator</th>
                    <th className="py-3 px-4">Action Taken</th>
                    <th className="py-3 px-4">Activity Description</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Terminal / Device</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-sans text-slate-700">
                  {staffActivityData.filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Staff Member */}
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 uppercase shadow-2xs">
                            {log.userName ? log.userName.slice(0, 2) : 'OP'}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {log.userName}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[9px] font-mono uppercase bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                                {log.userRole || 'Staff'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action Tag */}
                      <td className="py-3.5 px-4">
                        {renderActionBadge(log.action)}
                      </td>

                      {/* Activity Details */}
                      <td className="py-3.5 px-4 text-slate-800 max-w-md">
                        <p className="font-sans leading-relaxed text-slate-700 text-xs">
                          {log.details}
                        </p>
                      </td>

                      {/* Branch Tag */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        <span className="bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px]">
                          {log.branchId === 'b1' ? 'Harare CBD' : log.branchId === 'b2' ? 'Bulawayo' : log.branchId || 'Main'}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="text-slate-900 font-semibold">
                          {formatTimeAgo(log.timestamp)}
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </td>

                      {/* Terminal / Device */}
                      <td className="py-3.5 px-4 text-right font-mono text-[10px] text-slate-400">
                        <div className="text-slate-600 font-semibold">{log.ipAddress || '192.168.1.50'}</div>
                        <div className="text-[9px] text-slate-400 truncate max-w-[120px] ml-auto">{log.device || 'Web App'}</div>
                      </td>

                    </tr>
                  ))}

                  {staffActivityData.filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-sm font-sans space-y-2">
                        <UserCheck className="w-10 h-10 text-slate-200 mx-auto" />
                        <p className="font-semibold text-slate-600">No staff activity logs found.</p>
                        <p className="text-xs text-slate-400">Try adjusting your keyword search or staff member filters.</p>
                        <button
                          onClick={() => {
                            setStaffSearch('');
                            setSelectedStaff('all');
                            setSelectedCategory('all');
                            setDateRange('all');
                          }}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Reset Filters
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SECURITY AUDIT TRAILS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'audits' && canAccessAudits && (
        <div className="space-y-4" id="audits-container">
          
          {/* Search audit filter */}
          <div className="relative no-print">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search security log event, user, details, login activities..."
              value={searchLog}
              onChange={e => setSearchLog(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs rounded-xl border-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-800"
            />
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs text-slate-500 uppercase font-mono tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Detailed Audit Log</th>
                    <th className="py-3 px-4 text-center">Security Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-mono text-slate-700">
                  {filteredSecurityLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {log.userName} ({log.userRole})
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-sans max-w-xs truncate">
                        {log.details}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                          log.action.includes('DELETE') || log.action.includes('ADJUST')
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {log.action.includes('DELETE') || log.action.includes('ADJUST') ? 'CRITICAL' : 'STANDARD'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredSecurityLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-sm font-sans">
                        No security logs found matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
