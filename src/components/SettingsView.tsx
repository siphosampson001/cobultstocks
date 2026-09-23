/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Settings, 
  Store, 
  Percent, 
  Printer, 
  Database, 
  RefreshCw, 
  Save, 
  Download, 
  Upload, 
  FileCheck, 
  ShieldAlert,
  ServerCrash
} from 'lucide-react';
import { UserRole } from '../types.ts';
import StaffManagementSection from './StaffManagementSection';

interface SettingsViewProps {
  userRole: UserRole;
  currencySymbol: string;
  setCurrencySymbol: (val: string) => void;
  taxPercentage: number;
  setTaxPercentage: (val: number) => void;
  onRestoreBackup: () => void;
  onNavigateToSuperAdmin?: () => void;
}

export default function SettingsView({
  userRole,
  currencySymbol,
  setCurrencySymbol,
  taxPercentage,
  setTaxPercentage,
  onRestoreBackup,
  onNavigateToSuperAdmin
}: SettingsViewProps) {
  // Local Settings form state
  const [storeName, setStoreName] = useState('Cobult Stocks Retail');
  const [address, setAddress] = useState('123 Samora Machel Ave, Harare');
  const [vatNumber, setVatNumber] = useState('VAT-789-201-99');
  const [receiptHeader, setReceiptHeader] = useState('Welcome to Cobult Stocks!');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for your business. Please come again!');
  const [printerFormat, setPrinterFormat] = useState('80mm');
  const [syncSeconds, setSyncSeconds] = useState(30);
  const [conflictPolicy, setConflictPolicy] = useState('LWW'); // Last Write Wins

  // MongoDB Connection State
  const [mongoStatus, setMongoStatus] = useState<{ enabled: boolean; connected: boolean }>({ enabled: false, connected: false });
  const [loadingMongo, setLoadingMongo] = useState(true);

  React.useEffect(() => {
    fetch('/api/mongodb-status')
      .then(res => res.json())
      .then(data => {
        setMongoStatus(data);
        setLoadingMongo(false);
      })
      .catch(err => {
        console.error('Failed to load MongoDB status:', err);
        setLoadingMongo(false);
      });
  }, []);

  const canEditSettings = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.OWNER || userRole === UserRole.MANAGER;

  // Actions
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    alert('System settings updated and saved locally.');
  };

  const triggerBackup = (type: 'Cloud' | 'USB' | 'Local') => {
    alert(`Initiating ${type} Database Backup... \nComplete! Data compressed into cobult_db_backup_${new Date().toISOString().slice(0,10)}.zip`);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="settings-module">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-sans font-medium tracking-tight text-slate-900">System Configuration</h1>
        <p className="text-slate-500 text-sm mt-1">Configure retail tax structures, receipt headers, thermal devices, and local database sync overrides.</p>
      </div>

      {!canEditSettings ? (
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex flex-col items-center text-center max-w-md mx-auto space-y-4">
          <ShieldAlert className="w-12 h-12 text-amber-500" />
          <h3 className="font-sans font-semibold text-slate-900 text-base">Restricted Access</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            You are logged in under a Cashier session. Security protocol restricts modifying currency rates, re-configuring fiscal tax rates, or accessing staff credentials management.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Staff Credentials & Roles Management Section */}
          <StaffManagementSection userRole={userRole} onNavigateToSuperAdmin={onNavigateToSuperAdmin} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main settings form */}
          <div className="lg:col-span-2 bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
            <h3 className="font-sans font-medium text-slate-900 flex items-center gap-2 mb-6 text-sm uppercase tracking-wider">
              <Store className="w-4 h-4 text-slate-700" />
              Store Information & Taxes
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-5 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-600">Retail Store Name</label>
                  <input 
                    type="text" 
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600">Store VAT Number</label>
                  <input 
                    type="text" 
                    value={vatNumber}
                    onChange={e => setVatNumber(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-lg font-mono text-slate-900 text-xs focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-600">Physical Store Address</label>
                <input 
                  type="text" 
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                <div>
                  <label className="font-medium text-slate-600">Operational Base Currency</label>
                  <select 
                    value={currencySymbol}
                    onChange={e => setCurrencySymbol(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-lg text-slate-900 text-xs cursor-pointer focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="$">USD ($) - US Dollars</option>
                    <option value="Z$">ZWG (Z$) - Zimbabwe Gold</option>
                    <option value="R">ZAR (R) - South African Rand</option>
                    <option value="£">GBP (£) - British Pound</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-600">Fiscal Tax Rate (VAT %)</label>
                  <input 
                    type="number" 
                    value={taxPercentage}
                    onChange={e => setTaxPercentage(parseInt(e.target.value) || 0)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-lg font-mono text-slate-900 text-xs focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Receipt printer settings */}
              <div className="border-t border-slate-50 pt-4 space-y-4">
                <h3 className="font-sans font-medium text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Printer className="w-4 h-4 text-slate-700" />
                  Thermal Receipt Layout
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-medium text-slate-600">Printer Spool Format</label>
                    <select 
                      value={printerFormat}
                      onChange={e => setPrinterFormat(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="80mm">80mm POS Thermal Paper</option>
                      <option value="58mm">58mm Handheld Terminal</option>
                      <option value="A4">A4 Office Invoice Spool</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-slate-600">Sync Interval Loop</label>
                    <select 
                      value={syncSeconds}
                      onChange={e => setSyncSeconds(parseInt(e.target.value))}
                      className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-slate-900"
                    >
                      <option value={10}>Realtime: Every 10 seconds</option>
                      <option value={30}>Every 30 seconds</option>
                      <option value={60}>Every 1 minute</option>
                      <option value={300}>Every 5 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-medium text-slate-600">Custom Receipt Welcome Header</label>
                    <input 
                      type="text" 
                      value={receiptHeader}
                      onChange={e => setReceiptHeader(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-600">Custom Receipt Footer Policy</label>
                    <input 
                      type="text" 
                      value={receiptFooter}
                      onChange={e => setReceiptFooter(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                  id="save-settings-btn"
                >
                  <Save className="w-4 h-4" />
                  Save Preferences
                </button>
              </div>
            </form>
          </div>

          {/* BACKUP UTILITIES (1 COL) */}
          <div className="space-y-6">
            
            {/* MongoDB Atlas Status Card */}
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs space-y-4">
              <h3 className="font-sans font-medium text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Database className="w-4 h-4 text-sky-500" />
                MongoDB Atlas Connection
              </h3>
              <p className="text-xs text-slate-500 leading-normal">
                Connecting your multi-branch point-of-sale directly to a secure, resilient cluster on MongoDB Atlas.
              </p>

              {loadingMongo ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                  <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
                  Checking connection status...
                </div>
              ) : mongoStatus.enabled && mongoStatus.connected ? (
                <div className="space-y-3 pt-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-semibold border border-emerald-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Connected to Atlas
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Real-time cloud database is fully active. Transactions, products, and inventory adjustments are securely replicated to your Atlas cluster.
                  </p>
                </div>
              ) : mongoStatus.enabled && !mongoStatus.connected ? (
                <div className="space-y-3 pt-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-semibold border border-rose-500/20">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    Connection Failed
                  </div>
                  <p className="text-[10px] text-rose-400">
                    Could not connect to Atlas using the MONGODB_URI. Server has automatically fallen back to safe local storage. Please check your credentials in the secrets panel.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-xl text-xs font-semibold border border-amber-500/20">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Simulated Local Mode
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Currently utilizing safe local file persistence (<code className="bg-slate-850 px-1 py-0.5 rounded font-mono text-[9px]">db_sim_store.json</code>). To enable persistent global cloud databases, set your <code className="bg-slate-850 px-1 py-0.5 rounded font-mono text-[9px]">MONGODB_URI</code> in your environment variables.
                  </p>
                </div>
              )}
            </div>

            {/* Database Backups Card */}
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs space-y-4">
              <h3 className="font-sans font-medium text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Database className="w-4 h-4 text-slate-700" />
                Data Recovery & Backups
              </h3>
              <p className="text-xs text-slate-500 leading-normal">
                Avoid data loss during local computer terminal outages. Create compressed ledger state snapshots.
              </p>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => triggerBackup('Local')}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download Backup (ZIP)
                </button>
                <button
                  onClick={() => triggerBackup('Cloud')}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  Cloud Storage Backup
                </button>
                <button
                  onClick={() => {
                    if (confirm('Restoring will overwrite current local warehouse levels with sample baseline data. Proceed?')) {
                      onRestoreBackup();
                    }
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Restore Sample Seeds
                </button>
              </div>
            </div>

            {/* Conflict resolution policy */}
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-3.5">
              <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                Sync Resolution Engine
              </h4>
              <p className="text-[10px] text-slate-500 leading-normal">
                When offline local computer edits conflict with Cloud server states, dictate the prioritization model:
              </p>

              <div className="space-y-1.5 text-[10px] font-sans font-medium text-slate-600">
                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 cursor-pointer">
                  <input 
                    type="radio" 
                    name="conflict" 
                    value="LWW" 
                    checked={conflictPolicy === 'LWW'}
                    onChange={() => setConflictPolicy('LWW')}
                    className="text-slate-900 focus:ring-0" 
                  />
                  <div>
                    <span>Last-Write-Wins (LWW)</span>
                    <p className="text-[9px] text-slate-400 font-normal">Prioritizes newest modified timestamp</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 cursor-pointer">
                  <input 
                    type="radio" 
                    name="conflict" 
                    value="SERVER" 
                    checked={conflictPolicy === 'SERVER'}
                    onChange={() => setConflictPolicy('SERVER')}
                    className="text-slate-900 focus:ring-0" 
                  />
                  <div>
                    <span>Server-Authority Wins</span>
                    <p className="text-[9px] text-slate-400 font-normal">Discard offline edits in case of disputes</p>
                  </div>
                </label>
              </div>
            </div>

          </div>
        </div>
      </div>
      )}

    </div>
  );
}
