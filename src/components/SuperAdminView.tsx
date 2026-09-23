import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Coins, ShoppingBag, ShieldAlert, Plus, Search, 
  Ban, CheckCircle, Key, Trash2, Calendar, RefreshCw, X, ShieldCheck, Mail, Send,
  Database, Table, Code, Eye, Download, Copy, ChevronLeft, ChevronRight, Layers, Terminal, AlertCircle, HardDrive, Inbox
} from 'lucide-react';
import { Shop, UserRole } from '../types';
import EmailLogModal from './EmailLogModal';

interface SuperAdminStats {
  totalShops: number;
  activeShops: number;
  totalRevenue: number;
  totalSalesCount: number;
  totalUsers: number;
  totalBranches: number;
  recentShops: Shop[];
}

interface CollectionMeta {
  name: string;
  label: string;
  desc: string;
  count: number;
}

interface DbSummary {
  engine: string;
  isConnected: boolean;
  collections: CollectionMeta[];
}

export default function SuperAdminView() {
  // Main view switcher
  const [activeTab, setActiveTab] = useState<'tenants' | 'database'>('tenants');

  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Create Shop State
  const [isCreatingShop, setIsCreatingShop] = useState<boolean>(false);
  const [isSubmittingShop, setIsSubmittingShop] = useState<boolean>(false);
  const [newShopName, setNewShopName] = useState<string>('');
  const [newOwnerName, setNewOwnerName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newSubscriptionPlan, setNewSubscriptionPlan] = useState<string>('Trial');
  const [newPassword, setNewPassword] = useState<string>('owner123');
  const [creationResult, setCreationResult] = useState<any>(null);

  // Reset Password State
  const [resettingShopId, setResettingShopId] = useState<string | null>(null);
  const [newResetPassword, setNewResetPassword] = useState<string>('newpass123');

  // Email Outbox Log State
  const [isEmailLogOpen, setIsEmailLogOpen] = useState<boolean>(false);

  // Database Inspector State
  const [dbSummary, setDbSummary] = useState<DbSummary | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string>('shops');
  const [collectionRecords, setCollectionRecords] = useState<any[]>([]);
  const [collectionTotal, setCollectionTotal] = useState<number>(0);
  const [collectionPage, setCollectionPage] = useState<number>(1);
  const [collectionTotalPages, setCollectionTotalPages] = useState<number>(1);
  const [collectionSearch, setCollectionSearch] = useState<string>('');
  const [collectionLoading, setCollectionLoading] = useState<boolean>(false);
  const [inspectingRecord, setInspectingRecord] = useState<any | null>(null);
  const [jsonCopied, setJsonCopied] = useState<boolean>(false);

  // Fetch Database Summary
  const fetchDatabaseSummary = async () => {
    try {
      const token = localStorage.getItem('cobult_token');
      const res = await fetch('/api/super/db/summary', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setDbSummary(data);
      }
    } catch (err) {
      console.error('[DB Inspector] Summary fetch failed:', err);
    }
  };

  // Fetch Records for Selected Collection
  const fetchCollectionRecords = async (colName: string, search: string = '', page: number = 1) => {
    setCollectionLoading(true);
    try {
      const token = localStorage.getItem('cobult_token');
      const res = await fetch(`/api/super/db/collection/${colName}?search=${encodeURIComponent(search)}&page=${page}&limit=50`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setCollectionRecords(data.records || []);
        setCollectionTotal(data.total || 0);
        setCollectionPage(data.page || 1);
        setCollectionTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('[DB Inspector] Collection fetch failed:', err);
    } finally {
      setCollectionLoading(false);
    }
  };

  // Handle Collection Selection Switch
  const handleSelectCollection = (colName: string) => {
    setSelectedCollection(colName);
    setCollectionSearch('');
    setCollectionPage(1);
    fetchCollectionRecords(colName, '', 1);
  };

  // Delete Record in Database Inspector
  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm(`WARNING: Are you sure you want to permanently delete document "${recordId}" from collection "${selectedCollection}"?`)) {
      return;
    }
    try {
      const token = localStorage.getItem('cobult_token');
      const res = await fetch(`/api/super/db/collection/${selectedCollection}/${recordId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        fetchCollectionRecords(selectedCollection, collectionSearch, collectionPage);
        fetchDatabaseSummary();
      } else {
        alert('Failed to delete document.');
      }
    } catch (err) {
      alert('Error communicating with backend database.');
    }
  };

  // Export Collection Records as Downloadable JSON File
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(collectionRecords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${selectedCollection}_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Copy JSON document to clipboard
  const handleCopyJSON = (doc: any) => {
    navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  useEffect(() => {
    if (activeTab === 'database') {
      fetchDatabaseSummary();
      fetchCollectionRecords(selectedCollection, collectionSearch, collectionPage);
    }
  }, [activeTab]);


  // Load SaaS Stats and Shops list
  const fetchSaaSMasterData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cobult_token');
      const headers = {
        'x-superadmin': 'true',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const statsRes = await fetch('/api/super/stats', { headers });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      const shopsRes = await fetch('/api/super/shops', { headers });
      if (shopsRes.ok) {
        setShops(await shopsRes.json());
      }
    } catch (err) {
      console.error('[SaaS Admin] Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaaSMasterData();
    fetchDatabaseSummary();
  }, []);

  // Handle Create Shop Tenant
  const handleCreateShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingShop(true);
    try {
      const token = localStorage.getItem('cobult_token');
      const res = await fetch('/api/super/shops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin': 'true',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          shopName: newShopName,
          ownerName: newOwnerName,
          email: newEmail,
          phone: newPhone,
          subscriptionPlan: newSubscriptionPlan,
          password: newPassword
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCreationResult(data);
        // Reset fields
        setNewShopName('');
        setNewOwnerName('');
        setNewEmail('');
        setNewPhone('');
        setNewSubscriptionPlan('Trial');
        setNewPassword('owner123');
        fetchSaaSMasterData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to create shop'}`);
      }
    } catch (err) {
      alert('Network error provisioning new tenant shop.');
    } finally {
      setIsSubmittingShop(false);
    }
  };

  // Toggle Shop status (Suspend / Activate)
  const handleToggleShopStatus = async (shop: Shop) => {
    const nextStatus = shop.status === 'Active' ? 'Suspended' : 'Active';
    try {
      const token = localStorage.getItem('cobult_token');
      const res = await fetch(`/api/super/shops/${shop.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        fetchSaaSMasterData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to update shop status'}`);
      }
    } catch (err) {
      alert('Error communicating with database.');
    }
  };

  // Change Subscription Plan
  const handleChangeSubscription = async (shopId: string, plan: string) => {
    // Calculate expiry based on plan
    const expiry = new Date();
    if (plan === 'Monthly') expiry.setMonth(expiry.getMonth() + 1);
    else if (plan === 'Quarterly') expiry.setMonth(expiry.getMonth() + 3);
    else if (plan === 'Yearly') expiry.setFullYear(expiry.getFullYear() + 1);
    else expiry.setDate(expiry.getDate() + 14);

    try {
      const token = localStorage.getItem('cobult_token');
      const res = await fetch(`/api/super/shops/${shopId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          subscriptionPlan: plan, 
          expiryDate: expiry.toISOString().slice(0, 10),
          subscriptionStatus: 'Active' // Re-activate subscription when plan is changed
        })
      });

      if (res.ok) {
        fetchSaaSMasterData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Change Subscription Status
  const handleChangeSubscriptionStatus = async (shopId: string, status: string) => {
    try {
      const token = localStorage.getItem('cobult_token');
      const res = await fetch(`/api/super/shops/${shopId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          subscriptionStatus: status 
        })
      });

      if (res.ok) {
        fetchSaaSMasterData();
      }
    } catch (err) {
      console.error('[SaaS Admin] Failed to change subscription status:', err);
    }
  };

  // Delete Tenant
  const handleDeleteShop = async (shopId: string, name: string) => {
    if (shopId === 'super_admin_shop') {
      alert('The Super Admin system workspace cannot be deleted.');
      return;
    }

    if (!confirm(`WARNING: Are you absolutely sure you want to permanently delete Shop "${name}"? This action is irreversible and all its collections and users will be dropped.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('cobult_token');
      const res = await fetch(`/api/super/shops/${shopId}`, {
        method: 'DELETE',
        headers: {
          'x-superadmin': 'true',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        alert(`Shop "${name}" deleted successfully.`);
        setShops(prev => prev.filter(s => s.id !== shopId));
        fetchSaaSMasterData();
      } else {
        const err = await res.json();
        alert(`Error deleting shop: ${err.error || 'Failed to delete shop'}`);
      }
    } catch (err) {
      alert('Network error failed to delete shop.');
    }
  };

  // Resend Owner Credentials Email
  const handleResendOwnerEmail = async (shop: Shop) => {
    try {
      const token = localStorage.getItem('cobult_token');
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          recipientEmail: shop.email,
          recipientName: shop.ownerName,
          role: UserRole.OWNER,
          username: shop.email.split('@')[0],
          password: 'owner123_ResetPassword',
          branchName: `${shop.shopName} Main Branch`
        })
      });

      if (res.ok) {
        alert(`Owner credentials notification email successfully dispatched to ${shop.email}!`);
      } else {
        alert('Failed to dispatch email.');
      }
    } catch (err) {
      alert('Network error while dispatching email.');
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingShopId) return;

    try {
      const token = localStorage.getItem('cobult_token');
      const res = await fetch('/api/super/reset-owner-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          shopId: resettingShopId,
          newPassword: newResetPassword
        })
      });

      if (res.ok) {
        alert('Owner credentials successfully reset.');
        setResettingShopId(null);
        setNewResetPassword('newpass123');
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      alert('Error updating user record.');
    }
  };

  // Filter shops
  const filteredShops = shops.filter(s => 
    s.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" id="super_admin_panel">
      
      {/* Platform Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-sans font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            COBULT SAAS CONTROL PANEL
          </h2>
          <p className="text-[11px] text-slate-400 font-mono mt-1">
            Global Cloud Tenant Isolation, Subscription Billing, and Database Schema Explorer
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Main Module Selector Tabs */}
          <div className="flex bg-[#16191F] border border-[#2D3139] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('tenants')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'tenants' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Tenants & Billing</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('database')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'database' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-300" />
              <span>Database Table Inspector</span>
              {dbSummary && (
                <span className="px-1.5 py-0.5 text-[9px] bg-emerald-950 text-emerald-400 rounded-full font-mono border border-emerald-500/30">
                  {dbSummary.collections.length} Tables
                </span>
              )}
            </button>
          </div>

          {activeTab === 'tenants' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEmailLogOpen(true)}
                className="px-3.5 py-2 bg-[#1A1D23] hover:bg-[#222731] text-blue-400 border border-[#2D3139] font-sans text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                title="View Dispatched Credentials Email Outbox Log"
              >
                <Mail className="w-4 h-4 text-blue-400" />
                <span>Outbox Email Logs</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreatingShop(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/10 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Shop</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: TENANTS & SUBSCRIPTIONS MANAGER                   */}
      {/* ======================================================== */}
      {activeTab === 'tenants' && (
        <>
          {/* 1. Global Metrics Bento Blocks */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" id="saas_metrics_grid">
          <div className="p-4 bg-[#16191F] border border-[#2D3139] rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-[#94A3B8]">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider">Total Shops</span>
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xl font-mono font-bold text-white">{stats.totalShops}</p>
          </div>

          <div className="p-4 bg-[#16191F] border border-[#2D3139] rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-[#94A3B8]">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider">Active Tenants</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-mono font-bold text-emerald-400">{stats.activeShops}</p>
          </div>

          <div className="p-4 bg-[#16191F] border border-[#2D3139] rounded-2xl space-y-2 col-span-2 lg:col-span-1">
            <div className="flex justify-between items-center text-[#94A3B8]">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider">SaaS Revenue</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl font-mono font-bold text-amber-400">
              ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-4 bg-[#16191F] border border-[#2D3139] rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-[#94A3B8]">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider">Total Orders</span>
              <ShoppingBag className="w-4 h-4 text-pink-400" />
            </div>
            <p className="text-xl font-mono font-bold text-white">{stats.totalSalesCount}</p>
          </div>

          <div className="p-4 bg-[#16191F] border border-[#2D3139] rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-[#94A3B8]">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider">Total Users</span>
              <Users className="w-4 h-4 text-violet-400" />
            </div>
            <p className="text-xl font-mono font-bold text-white">{stats.totalUsers}</p>
          </div>
        </div>
      )}

      {/* 2. Main Tenant Table & Search */}
      <div className="bg-[#16191F] border border-[#2D3139] rounded-2xl overflow-hidden" id="shops_manager_card">
        <div className="p-5 border-b border-[#2D3139] flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
              Registered Shops (Tenants)
            </h3>
            <p className="text-[10px] text-[#94A3B8] font-mono">
              Perform admin commands, suspend accounts, and manage subscriptions safely
            </p>
          </div>

          <div className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by Shop Name, Owner, Email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#1A1D23] hover:bg-[#1F232B] focus:bg-[#0F1115] border border-[#2D3139] rounded-xl text-white font-sans text-xs focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
            </div>
            <button
              onClick={fetchSaaSMasterData}
              className="p-2.5 bg-[#1A1D23] hover:bg-[#222731] text-slate-300 border border-[#2D3139] rounded-xl cursor-pointer transition-colors"
              title="Refresh SaaS Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingShop(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold uppercase rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Shop</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#1A1D23] border-b border-[#2D3139] text-[#94A3B8] font-mono text-[9px] uppercase tracking-wider">
                <th className="p-4">Shop Details</th>
                <th className="p-4">Owner Name</th>
                <th className="p-4">Subscription Plan</th>
                <th className="p-4">Subscription Status</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D3139]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Querying Atlas DB SaaS Collections...
                  </td>
                </tr>
              ) : filteredShops.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No shops found matching filters.
                  </td>
                </tr>
              ) : (
                filteredShops.map((shop, idx) => {
                  const isExpired = new Date(shop.expiryDate).getTime() < Date.now();
                  return (
                    <tr key={`${shop.id}_${idx}`} className="hover:bg-[#1A1D23]/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-white block text-xs">{shop.shopName}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{shop.id} | {shop.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-slate-300 font-medium">
                        {shop.ownerName}
                      </td>

                      <td className="p-4">
                        <select
                          value={shop.subscriptionPlan}
                          onChange={(e) => handleChangeSubscription(shop.id, e.target.value)}
                          className="bg-[#1A1D23] hover:bg-[#1F232B] border border-[#2D3139] rounded-lg px-2 py-1 text-[11px] text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="Trial">Trial</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Yearly">Yearly</option>
                        </select>
                      </td>

                      <td className="p-4">
                        <select
                          value={shop.subscriptionStatus || 'Active'}
                          onChange={(e) => handleChangeSubscriptionStatus(shop.id, e.target.value)}
                          className="bg-[#1A1D23] hover:bg-[#1F232B] border border-[#2D3139] rounded-lg px-2 py-1 text-[11px] text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-sans"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Expired">Expired</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      </td>

                      <td className="p-4 font-mono text-xs">
                        <span className={`inline-flex items-center gap-1 ${isExpired ? 'text-rose-400' : 'text-slate-300'}`}>
                          <Calendar className="w-3 h-3" />
                          {shop.expiryDate}
                          {isExpired && <span className="text-[8px] bg-rose-500/15 border border-rose-500/20 px-1 rounded font-sans uppercase">Expired</span>}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-sans font-bold border ${
                          shop.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${shop.status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {shop.status}
                        </span>
                      </td>

                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleResendOwnerEmail(shop)}
                          className="p-1.5 bg-[#1A1D23] hover:bg-[#20242E] text-blue-400 border border-[#2D3139] rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                          title="Resend Owner Credentials Email"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleShopStatus(shop)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer inline-flex items-center justify-center ${
                            shop.status === 'Active'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                          title={shop.status === 'Active' ? 'Suspend Shop' : 'Activate Shop'}
                        >
                          {shop.status === 'Active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => setResettingShopId(shop.id)}
                          className="p-1.5 bg-[#1A1D23] hover:bg-[#20242E] text-amber-400 border border-[#2D3139] rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                          title="Reset Owner Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteShop(shop.id, shop.shopName)}
                          className="p-1.5 bg-rose-600/10 hover:bg-rose-600 hover:text-white text-rose-400 border border-rose-500/20 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                          title="Delete Shop Permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DATABASE TABLE & SCHEMA INSPECTOR                  */}
      {/* ======================================================== */}
      {activeTab === 'database' && (
        <div className="space-y-6 animate-fade-in" id="database_inspector_view">
          
          {/* Engine Banner & Live Summary */}
          <div className="p-5 bg-[#16191F] border border-[#2D3139] rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
                    Live Database Engine Inspector
                  </h3>
                  {dbSummary && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                      dbSummary.isConnected 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {dbSummary.engine}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Inspect raw database collections, search documents, verify tenant isolation, and export JSON schemas directly.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchDatabaseSummary();
                fetchCollectionRecords(selectedCollection, collectionSearch, collectionPage);
              }}
              className="px-3.5 py-2 bg-[#1A1D23] hover:bg-[#222731] text-emerald-400 border border-[#2D3139] rounded-xl font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${collectionLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Collections</span>
            </button>
          </div>

          {/* Main 2-Column Inspector Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left Column: Database Tables / Collections Selector */}
            <div className="lg:col-span-1 bg-[#16191F] border border-[#2D3139] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2D3139] pb-3">
                <span className="text-xs font-bold text-white uppercase font-sans flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-emerald-400" />
                  Database Tables ({dbSummary?.collections.length || 0})
                </span>
                <span className="text-[10px] font-mono text-slate-400">Records</span>
              </div>

              <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                {dbSummary?.collections.map((col, idx) => {
                  const isSelected = selectedCollection === col.name;
                  return (
                    <button
                      key={`${col.name}_${idx}`}
                      type="button"
                      onClick={() => handleSelectCollection(col.name)}
                      className={`w-full p-3 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer border ${
                        isSelected 
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-white shadow-lg' 
                          : 'bg-[#1A1D23]/60 hover:bg-[#1F232B] border-[#2D3139] text-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5 max-w-[170px]">
                        <span className="font-bold text-xs block font-mono tracking-tight truncate">{col.label}</span>
                        <span className="text-[9px] text-slate-400 block font-sans truncate">{col.desc}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                        isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-[#252a35] text-slate-300'
                      }`}>
                        {col.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Selected Collection Records Explorer */}
            <div className="lg:col-span-3 bg-[#16191F] border border-[#2D3139] rounded-2xl overflow-hidden flex flex-col">
              
              {/* Header & Search Toolbar */}
              <div className="p-4 border-b border-[#2D3139] flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-[#1A1D23]/50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-mono uppercase">
                      Table: {dbSummary?.collections.find(c => c.name === selectedCollection)?.label || selectedCollection}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                      {collectionTotal} records
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {dbSummary?.collections.find(c => c.name === selectedCollection)?.desc}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter records..."
                      value={collectionSearch}
                      onChange={e => {
                        setCollectionSearch(e.target.value);
                        fetchCollectionRecords(selectedCollection, e.target.value, 1);
                      }}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#16191F] border border-[#2D3139] rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Export Collection to JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export JSON</span>
                  </button>
                </div>
              </div>

              {/* Records Table */}
              <div className="overflow-x-auto flex-1 min-h-[400px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#1A1D23] border-b border-[#2D3139] text-[#94A3B8] font-mono text-[9px] uppercase tracking-wider">
                      <th className="p-3">Doc ID</th>
                      <th className="p-3">Tenant (Shop ID)</th>
                      <th className="p-3">Main Attributes / Record Data</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D3139]">
                    {collectionLoading ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400 font-mono">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                          Querying table collection records from database...
                        </td>
                      </tr>
                    ) : collectionRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400 font-mono">
                          No documents stored in collection matching current filter.
                        </td>
                      </tr>
                    ) : (
                      collectionRecords.map((doc, idx) => {
                        const docId = doc.id || doc._id || `row_${idx}`;
                        const tenantId = doc.shopId || 'N/A';
                        const createdAt = doc.createdAt || doc.timestamp || doc.date || 'N/A';
                        
                        const mainLabel = doc.shopName || doc.username || doc.fullname || doc.name || doc.invoiceNumber || doc.title || doc.barcode || doc.subject || 'Record Entry';
                        const secondaryInfo = doc.email || doc.role || doc.category || doc.paymentMethod || (doc.total ? `$${doc.total}` : '');

                        return (
                          <tr key={`${docId}_${idx}`} className="hover:bg-[#1A1D23]/60 transition-colors">
                            <td className="p-3 font-mono text-[11px] font-bold text-blue-400">
                              {docId}
                            </td>
                            <td className="p-3 font-mono text-[10px] text-slate-300">
                              <span className="px-1.5 py-0.5 bg-[#202530] border border-[#2D3139] rounded text-slate-300">
                                {tenantId}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="space-y-0.5 max-w-md">
                                <span className="font-bold text-white block text-xs truncate">{mainLabel}</span>
                                {secondaryInfo && <span className="text-[10px] text-slate-400 font-mono block truncate">{secondaryInfo}</span>}
                              </div>
                            </td>
                            <td className="p-3 font-mono text-[10px] text-slate-400">
                              {typeof createdAt === 'string' && createdAt.length > 10 ? createdAt.slice(0, 19).replace('T', ' ') : createdAt}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setInspectingRecord(doc)}
                                  className="px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold font-mono flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Inspect Full JSON Document"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>JSON</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(docId)}
                                  className="p-1 bg-[#1A1D23] hover:bg-rose-600/20 text-slate-500 hover:text-rose-400 border border-[#2D3139] rounded-lg transition-colors cursor-pointer"
                                  title="Delete Document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

              {/* Pagination Controls */}
              <div className="p-4 border-t border-[#2D3139] flex items-center justify-between bg-[#1A1D23]/50">
                <span className="text-xs font-mono text-slate-400">
                  Page {collectionPage} of {collectionTotalPages} ({collectionTotal} documents total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={collectionPage <= 1}
                    onClick={() => {
                      const nextP = collectionPage - 1;
                      setCollectionPage(nextP);
                      fetchCollectionRecords(selectedCollection, collectionSearch, nextP);
                    }}
                    className="p-1.5 bg-[#16191F] disabled:opacity-30 text-slate-300 border border-[#2D3139] rounded-lg cursor-pointer hover:bg-[#202530]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={collectionPage >= collectionTotalPages}
                    onClick={() => {
                      const nextP = collectionPage + 1;
                      setCollectionPage(nextP);
                      fetchCollectionRecords(selectedCollection, collectionSearch, nextP);
                    }}
                    className="p-1.5 bg-[#16191F] disabled:opacity-30 text-slate-300 border border-[#2D3139] rounded-lg cursor-pointer hover:bg-[#202530]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: JSON DOCUMENT INSPECTOR                         */}
      {/* ======================================================== */}
      {inspectingRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="max-w-3xl w-full bg-[#16191F] border border-[#2D3139] p-6 rounded-2xl shadow-2xl space-y-4 text-xs animate-fade-in max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#2D3139] pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  JSON Document View — {selectedCollection}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1A1D23] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 bg-[#0F1115] border border-[#2D3139] rounded-xl p-4 overflow-y-auto font-mono text-[11px] text-emerald-400 leading-relaxed">
              <pre>{JSON.stringify(inspectingRecord, null, 2)}</pre>
            </div>

            <div className="pt-3 border-t border-[#2D3139] flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-mono">
                Document ID: {inspectingRecord.id || inspectingRecord._id}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyJSON(inspectingRecord)}
                  className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{jsonCopied ? 'Copied to Clipboard!' : 'Copy Raw JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingRecord(null)}
                  className="px-4 py-2 bg-[#1A1D23] hover:bg-[#202530] text-slate-200 border border-[#2D3139] rounded-xl font-sans text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. PROVISION SHOP MODAL */}
      {isCreatingShop && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="max-w-md w-full bg-[#16191F] border border-[#2D3139] p-6 rounded-2xl shadow-2xl space-y-6 text-xs animate-fade-in">
            <div className="flex justify-between items-center border-b border-[#2D3139] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-500" />
                Provision SaaS Tenant
              </h3>
              <button
                onClick={() => {
                  setIsCreatingShop(false);
                  setCreationResult(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1A1D23] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {creationResult ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/20 rounded-xl space-y-2 text-slate-200">
                  <p className="font-bold text-emerald-400 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Shop Owner Provisioned & Email Dispatched!
                  </p>
                  <p className="text-[11px] text-slate-300">
                    The Shop Owner account for <strong>{creationResult.shop.ownerName}</strong> has been created. An automated credentials email was dispatched to <strong>{creationResult.owner.email}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingShop(false);
                      setCreationResult(null);
                      setIsEmailLogOpen(true);
                    }}
                    className="mt-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Mail className="w-3 h-3" />
                    <span>View Dispatched Email in Outbox</span>
                  </button>
                </div>

                <div className="p-3.5 bg-[#1A1D23] rounded-xl space-y-2.5 border border-[#2D3139] font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block uppercase text-[9px] tracking-wider">Assigned Role:</span>
                    <span className="text-purple-400 font-bold">SHOP OWNER</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[9px] tracking-wider">Tenant Id:</span>
                    <span className="text-white font-bold">{creationResult.shop.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[9px] tracking-wider">Owner Login Username:</span>
                    <span className="text-white font-bold">{creationResult.owner.username}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[9px] tracking-wider">Temporary Password:</span>
                    <span className="text-amber-400 font-bold">{creationResult.owner.temporaryPassword}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCreatingShop(false);
                    setCreationResult(null);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-sans font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateShopSubmit} className="space-y-4">
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300">
                  <strong>Role Assignment Notice:</strong> Super Admin provisions the <strong>Shop Owner</strong> account. The Shop Owner will then create Managers and Cashiers.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">Shop Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Spar Express"
                      value={newShopName}
                      onChange={e => setNewShopName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1D23] border border-[#2D3139] rounded-lg text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">Shop Owner Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={newOwnerName}
                      onChange={e => setNewOwnerName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1D23] border border-[#2D3139] rounded-lg text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">Email Address</label>
                    <input
                      type="email"
                      placeholder="owner@example.com"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1D23] border border-[#2D3139] rounded-lg text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+263 77..."
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1D23] border border-[#2D3139] rounded-lg text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">Billing Tier</label>
                    <select
                      value={newSubscriptionPlan}
                      onChange={e => setNewSubscriptionPlan(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1D23] border border-[#2D3139] rounded-lg text-white"
                    >
                      <option value="Trial">14-Day Trial</option>
                      <option value="Monthly">Monthly Premium</option>
                      <option value="Quarterly">Quarterly Corporate</option>
                      <option value="Yearly">Yearly Enterprise</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">Owner Password</label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1D23] border border-[#2D3139] rounded-lg text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2D3139] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreatingShop(false)}
                    className="px-4 py-2.5 bg-[#1A1D23] hover:bg-[#20242D] border border-[#2D3139] text-white font-sans text-xs font-bold uppercase rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingShop}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-sans text-xs font-bold uppercase rounded-xl shadow-lg shadow-blue-500/15 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {isSubmittingShop ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating Shop & Dispatching Email...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>+ Create Shop & Send Credentials Email</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 4. RESET PASSWORD MODAL */}
      {resettingShopId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <form onSubmit={handleResetPassword} className="max-w-md w-full bg-[#16191F] border border-[#2D3139] p-6 rounded-2xl shadow-2xl space-y-4 text-xs animate-fade-in">
            <div className="flex justify-between items-center border-b border-[#2D3139] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-500" />
                Reset Tenant Credentials
              </h3>
              <button
                type="button"
                onClick={() => setResettingShopId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1A1D23] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">New Password for Owner</label>
              <input
                type="text"
                value={newResetPassword}
                onChange={e => setNewResetPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1D23] border border-[#2D3139] rounded-lg text-white font-mono"
                required
              />
            </div>

            <div className="pt-3 border-t border-[#2D3139] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setResettingShopId(null)}
                className="px-4 py-2.5 bg-[#1A1D23] hover:bg-[#20242D] border border-[#2D3139] text-white font-sans text-xs font-bold uppercase rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold uppercase rounded-xl shadow-lg shadow-amber-500/15"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. EMAIL LOG MODAL */}
      <EmailLogModal isOpen={isEmailLogOpen} onClose={() => setIsEmailLogOpen(false)} />

    </div>
  );
}
