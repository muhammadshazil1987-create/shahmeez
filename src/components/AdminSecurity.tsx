import React, { useState } from 'react';
import { Eye, EyeOff, ShieldAlert, CheckCircle, RefreshCw, Lock } from 'lucide-react';

interface SecurityProps {
  token: string;
}

export default function AdminSecurity({ token }: SecurityProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Security passcode changed successfully.');
        setOldPassword('');
        setNewPassword('');
      } else {
        setErrorMsg(data.error || 'Failed to update administrative passcode.');
      }
    } catch (err: any) {
      setErrorMsg('Network error while requesting secure identity channel.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header heading */}
      <div className="border-b border-neutral-200 pb-4">
        <h2 className="text-xl font-display font-medium text-zinc-900">Security Settings</h2>
        <p className="text-xs text-zinc-500 font-mono mt-0.5">ADMINISTRATIVE ACCESS & CREDENTIAL HARDENING</p>
      </div>

      <div className="max-w-xl bg-white rounded-lg border border-neutral-200 shadow-xs p-6 space-y-5">
        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#1e40af]" />
          Update Admin Security Passcode
        </h3>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-250 text-rose-800 text-xs font-semibold rounded flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-semibold rounded flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1">
              Current Old Password
            </label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm bg-zinc-50 border border-neutral-350 focus:border-[#1e40af] rounded-md pl-3.5 pr-10 py-2 outline-none font-mono tracking-widest transition-all"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3.5 top-2.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                id="toggle-old-password-eye"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[10px] text-zinc-400 mt-1 block leading-normal">
              Provide the valid credential code previously configured (initial default is <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-850">admin123</code>).
            </span>
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1">
              New Password Secure Code
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new admin secret password"
                className="w-full text-sm bg-zinc-50 border border-neutral-350 focus:border-[#1e40af] rounded-md pl-3.5 pr-10 py-2 outline-none font-mono tracking-widest transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3.5 top-2.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                id="toggle-new-password-eye"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[10px] text-zinc-400 mt-1 block leading-normal">
              Minimum length of 4 characters. Write down your new passcode carefully.
            </span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-[#1e40af] hover:bg-blue-800 text-white font-semibold text-xs px-5 py-2.5 rounded-md transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Validating Security Code...' : 'Update Administrative Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
