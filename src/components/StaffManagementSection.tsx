import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Mail, Shield, Key, CheckCircle, RefreshCw, X, ShieldAlert, UserCheck, Send, Check 
} from 'lucide-react';
import { User, UserRole, Branch } from '../types';
import { Building2 } from 'lucide-react';

interface StaffManagementSectionProps {
  currentShopId?: string;
  userRole?: UserRole;
  onNavigateToSuperAdmin?: () => void;
}

export default function StaffManagementSection({ currentShopId, userRole, onNavigateToSuperAdmin }: StaffManagementSectionProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('ALL');

  // Modal State
  const [isCreatingStaff, setIsCreatingStaff] = useState<boolean>(false);
  const [fullname, setFullname] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [role, setRole] = useState<UserRole>(UserRole.CASHIER);
  const [branchId, setBranchId] = useState<string>('b1');
  const [password, setPassword] = useState<string>('cashier123');
  const [sendEmailToggle, setSendEmailToggle] = useState<boolean>(true);
  const [creationResult, setCreationResult] = useState<any>(null);
  const [sendingResend, setSendingResend] = useState<string | null>(null);

  const fetchStaffAndBranches = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cobult_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const [usersRes, branchesRes] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/branches', { headers })
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (branchesRes.ok) {
        const branchList = await branchesRes.json();
        setBranches(branchList);
        if (branchList.length > 0 && !branchId) {
          setBranchId(branchList[0].id);
        }
      }
    } catch (err) {
      console.error('[Staff Management] Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffAndBranches();
  }, []);

  // Auto-suggest username and default password when email or role changes
  useEffect(() => {
    if (email && email.includes('@')) {
      const suggestedUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      setUsername(suggestedUsername);
    }
  }, [email]);

  useEffect(() => {
    if (role === UserRole.MANAGER) {
      setPassword('manager123');
    } else if (role === UserRole.CASHIER) {
      setPassword('cashier123');
    }
  }, [role]);

  const handleCreateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('cobult_token');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          username,
          fullname,
          email,
          role,
          branchId,
          password
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCreationResult(data);
        fetchStaffAndBranches();
      } else {
        const err = await res.json();
        alert(`Failed to create staff credentials: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Error communicating with server.');
    }
  };

  const handleResendCredentials = async (staff: User) => {
    setSendingResend(staff.id);
    try {
      const token = localStorage.getItem('cobult_token');
      const branchName = branches.find(b => b.id === staff.branchId)?.name || 'Main Branch';
      
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          recipientEmail: staff.email,
          recipientName: staff.fullname,
          role: staff.role,
          username: staff.username,
          password: 'PasswordReset_Pass123!',
          branchName
        })
      });

      if (res.ok) {
        alert(`Credentials notification email successfully sent to ${staff.email}!`);
      } else {
        alert('Failed to resend credentials email.');
      }
    } catch (err) {
      alert('Network error while dispatching email.');
    } finally {
      setSendingResend(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'ALL' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs space-y-6" id="staff_credentials_management">
      
      {userRole === UserRole.SUPER_ADMIN && (
        <div className="bg-blue-950 text-white p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md border border-blue-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-sans font-bold text-xs uppercase tracking-wide text-blue-300">
                Super Admin Multi-Tenant Notice
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                To create or provision a brand new <strong>Tenant Shop</strong> with an Owner account, open the <strong>SaaS Admin Panel</strong>.
              </p>
            </div>
          </div>
          {onNavigateToSuperAdmin && (
            <button
              onClick={onNavigateToSuperAdmin}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Go to SaaS Panel (+ Provision Shop)</span>
            </button>
          )}
        </div>
      )}

      {/* Title & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-base font-sans font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Staff Management & Credentials Dispatch
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Shop Owners can provision Manager and Cashier user credentials with automatic email notifications.
          </p>
        </div>

        <button
          onClick={() => {
            setFullname('');
            setEmail('');
            setUsername('');
            setRole(UserRole.CASHIER);
            setPassword('cashier123');
            setCreationResult(null);
            setIsCreatingStaff(true);
          }}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4 text-blue-400" />
          Create Manager / Cashier Credentials
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Filter Role:</span>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value={UserRole.OWNER}>Shop Owners</option>
            <option value={UserRole.MANAGER}>Managers</option>
            <option value={UserRole.CASHIER}>Cashiers</option>
          </select>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search staff name, email, username..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase tracking-wider border-b border-slate-100">
              <th className="p-3.5">Staff Member</th>
              <th className="p-3.5">Assigned Role</th>
              <th className="p-3.5">Branch Location</th>
              <th className="p-3.5">Username / Credentials</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Email Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                  Loading user records...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No staff members match the current filter.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, idx) => {
                const branchName = branches.find(b => b.id === user.branchId)?.name || 'Harare CBD Main';
                return (
                  <tr key={`${user.id}_${idx}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'} 
                          alt={user.fullname} 
                          className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 block">{user.fullname}</span>
                          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        user.role === UserRole.OWNER 
                          ? 'bg-purple-50 text-purple-700 border-purple-200' 
                          : user.role === UserRole.MANAGER 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>

                    <td className="p-3.5 text-slate-600 font-medium text-[11px]">
                      {branchName}
                    </td>

                    <td className="p-3.5">
                      <code className="bg-slate-100 text-slate-800 font-mono text-[11px] px-2 py-0.5 rounded border border-slate-200 font-semibold">
                        {user.username}
                      </code>
                    </td>

                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleResendCredentials(user)}
                        disabled={sendingResend === user.id}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Resend login credentials email to staff"
                      >
                        <Send className="w-3 h-3 text-blue-600" />
                        {sendingResend === user.id ? 'Sending...' : 'Resend Email'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE STAFF MODAL */}
      {isCreatingStaff && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="max-w-md w-full bg-[#16191F] border border-[#2D3139] p-6 rounded-2xl shadow-2xl space-y-6 text-xs text-slate-200 animate-fade-in">
            <div className="flex justify-between items-center border-b border-[#2D3139] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" />
                Provision Staff Credentials
              </h3>
              <button
                onClick={() => {
                  setIsCreatingStaff(false);
                  setCreationResult(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1A1D23] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {creationResult ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/20 rounded-xl space-y-2">
                  <p className="font-bold text-emerald-400 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Credentials Created & Email Dispatched!
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Staff account for <strong>{creationResult.fullname}</strong> has been saved. An automated credentials notification email was dispatched to <strong>{creationResult.email}</strong>.
                  </p>
                </div>

                <div className="p-3.5 bg-[#1A1D23] rounded-xl space-y-2 border border-[#2D3139] font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block uppercase text-[9px]">Assigned Role:</span>
                    <span className="text-blue-400 font-bold">{creationResult.role}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[9px]">Login Username:</span>
                    <span className="text-white font-bold">{creationResult.username}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[9px]">Temporary Password:</span>
                    <span className="text-amber-400 font-bold">{password}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCreatingStaff(false);
                    setCreationResult(null);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded-xl transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateStaffSubmit} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">Select Role to Create</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole(UserRole.MANAGER)}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        role === UserRole.MANAGER 
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md' 
                          : 'bg-[#1A1D23] text-slate-300 border-[#2D3139] hover:bg-[#20242D]'
                      }`}
                    >
                      Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(UserRole.CASHIER)}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        role === UserRole.CASHIER 
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' 
                          : 'bg-[#1A1D23] text-slate-300 border-[#2D3139] hover:bg-[#20242D]'
                      }`}
                    >
                      Cashier
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Smith"
                    value={fullname}
                    onChange={e => setFullname(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1A1D23] border border-[#2D3139] rounded-lg text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">Email Address (Receives Credentials)</label>
                  <input
                    type="email"
                    placeholder="staff@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1A1D23] border border-[#2D3139] rounded-lg text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">Login Username</label>
                    <input
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1D23] border border-[#2D3139] rounded-lg text-white font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">Branch Assignment</label>
                    <select
                      value={branchId}
                      onChange={e => setBranchId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1D23] border border-[#2D3139] rounded-lg text-white"
                    >
                      {branches.map((b, idx) => (
                        <option key={`${b.id}_${idx}`} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">Assigned Temporary Password</label>
                  <input
                    type="text"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1A1D23] border border-[#2D3139] rounded-lg text-amber-400 font-mono font-bold"
                    required
                  />
                </div>

                <div className="p-3 bg-[#1A1D23] rounded-xl border border-[#2D3139] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <span>Send Login Credentials Email Instantly</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendEmailToggle}
                    onChange={e => setSendEmailToggle(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="pt-3 border-t border-[#2D3139] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreatingStaff(false)}
                    className="px-4 py-2 bg-[#1A1D23] hover:bg-[#20242D] border border-[#2D3139] text-white font-bold uppercase rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded-xl shadow-lg shadow-blue-500/15 cursor-pointer"
                  >
                    Create & Dispatch Email
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
