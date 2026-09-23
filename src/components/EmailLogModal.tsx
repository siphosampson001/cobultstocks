import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, X, CheckCircle, ExternalLink, Key, User, ShieldCheck, Copy, Send } from 'lucide-react';
import { EmailNotification } from '../types';

interface EmailLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailLogModal({ isOpen, onClose }: EmailLogModalProps) {
  const [emails, setEmails] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchEmailLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cobult_token');
      const res = await fetch('/api/emails', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
        if (data.length > 0 && !selectedEmail) {
          setSelectedEmail(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch email notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEmailLogs();
    }
  }, [isOpen]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="max-w-4xl w-full bg-[#16191F] border border-[#2D3139] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in text-xs">
        
        {/* Header */}
        <div className="p-4 bg-[#1A1D23] border-b border-[#2D3139] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
                Outbox & Credentials Email Dispatcher Log
              </h3>
              <p className="text-[10px] text-[#94A3B8] font-mono">
                Real-time delivery log of login credentials sent to Shop Owners, Managers, and Cashiers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchEmailLogs}
              className="p-1.5 bg-[#16191F] hover:bg-[#20242D] text-slate-300 border border-[#2D3139] rounded-lg transition-colors cursor-pointer"
              title="Refresh Emails"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-[#16191F] hover:bg-[#20242D] text-slate-400 hover:text-white border border-[#2D3139] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Split View */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
          
          {/* Email List Left Column */}
          <div className="border-r border-[#2D3139] overflow-y-auto divide-y divide-[#2D3139] bg-[#12141A]">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading email logs...
              </div>
            ) : emails.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Mail className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-semibold text-white">No Sent Emails Yet</p>
                <p className="text-[10px]">When Super Admin or Shop Owner creates accounts, dispatched credentials emails will appear here.</p>
              </div>
            ) : (
              emails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected ? 'bg-blue-600/15 border-l-4 border-l-blue-500' : 'hover:bg-[#1A1D23]/60'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-white text-[11px] truncate max-w-[140px]">
                        {email.recipientName}
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle className="w-2.5 h-2.5" />
                        {email.status}
                      </span>
                    </div>

                    <div className="text-[10px] text-blue-400 font-mono truncate mb-1">
                      {email.recipientEmail}
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-[#94A3B8] font-mono">
                      <span className="px-1.5 py-0.5 bg-[#1F232B] rounded text-slate-300 font-sans font-semibold">
                        {email.role}
                      </span>
                      <span>{new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Email Preview Right Column */}
          <div className="md:col-span-2 p-5 bg-[#16191F] overflow-y-auto space-y-4">
            {selectedEmail ? (
              <div className="space-y-4">
                
                {/* Meta details bar */}
                <div className="p-3 bg-[#1A1D23] border border-[#2D3139] rounded-xl space-y-2">
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#2D3139] pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">RECIPIENT:</span>
                      <span className="text-white font-bold text-xs">{selectedEmail.recipientName} ({selectedEmail.recipientEmail})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      SENT: {new Date(selectedEmail.sentAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-bold">
                        {selectedEmail.role}
                      </span>
                      <span className="text-slate-300 font-mono">
                        Username: <strong className="text-white">{selectedEmail.credentials.username}</strong>
                      </span>
                    </div>

                    {selectedEmail.credentials.password && (
                      <button
                        onClick={() => copyToClipboard(`Username: ${selectedEmail.credentials.username}\nPassword: ${selectedEmail.credentials.password}`, selectedEmail.id)}
                        className="px-2.5 py-1 bg-[#222731] hover:bg-[#2A303C] text-amber-400 border border-[#2D3139] rounded-lg transition-colors flex items-center gap-1 font-mono text-[10px] cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedId === selectedEmail.id ? 'Copied!' : 'Copy Credentials'}
                      </button>
                    )}
                  </div>
                </div>

                {/* HTML Email Render Box */}
                <div className="space-y-1">
                  <label className="text-[10px] text-[#94A3B8] font-mono uppercase tracking-wider block">
                    Rendered HTML Email Notification Body
                  </label>
                  <div 
                    className="p-4 rounded-xl border border-[#2D3139] bg-[#0B0D11] text-slate-200 overflow-auto max-h-[400px]"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                  />
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 py-12">
                <Mail className="w-10 h-10 text-slate-600" />
                <p>Select an email from the dispatch log to view delivery details.</p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#1A1D23] border-t border-[#2D3139] flex justify-between items-center text-[10px] text-slate-400">
          <span className="font-mono">Total Dispatched Emails: {emails.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded-lg transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
}
