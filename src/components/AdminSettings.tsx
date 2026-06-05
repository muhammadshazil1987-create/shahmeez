import React, { useState, useEffect } from 'react';
import { IntegrationSettings } from '../types';
import { Settings, ShieldAlert, Cpu, CheckCircle, RefreshCw, XCircle, Database as DbIcon, Info, Eye, EyeOff } from 'lucide-react';

interface SettingsProps {
  token: string;
  onSettingsChanged?: () => void;
}

export default function AdminSettings({ token, onSettingsChanged }: SettingsProps) {
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states matching types.ts
  const [nimbusApiUrl, setNimbusApiUrl] = useState('');
  const [nimbusApiKey, setNimbusApiKey] = useState('');
  const [nimbusSecretKey, setNimbusSecretKey] = useState('');
  const [showApiUrl, setShowApiUrl] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [realTimeSync, setRealTimeSync] = useState(true);
  const [simulateFailure, setSimulateFailure] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data: IntegrationSettings = await res.json();
        setSettings(data);
        setNimbusApiUrl(data.nimbusApiUrl);
        setNimbusApiKey(data.nimbusApiKey);
        setNimbusSecretKey(data.nimbusSecretKey);
        setRealTimeSync(data.realTimeSync);
        setSimulateFailure(data.simulateFailure);
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nimbusApiUrl,
          nimbusApiKey,
          nimbusSecretKey,
          realTimeSync,
          simulateFailure
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setSaveSuccess(true);
        if (onSettingsChanged) onSettingsChanged();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: nimbusApiUrl,
          key: nimbusApiKey,
          secret: nimbusSecretKey
        })
      });

      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message
      });
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Network validation failure: ${e.message || e}`
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab intro */}
      <div className="border-b border-neutral-200 pb-4">
        <h2 className="text-xl font-display font-medium text-zinc-900">Integration Settings</h2>
        <p className="text-xs text-zinc-500 font-mono mt-0.5">NIMBUS POS METRICS & SYNC GATEWAY</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-lg border border-neutral-200 shadow-xs p-6 space-y-5">
            <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-500" />
              Credentials Configuration
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1">
                  Nimbus POS API Base URL
                </label>
                <div className="relative">
                  <input
                    type={showApiUrl ? 'text' : 'password'}
                    required
                    value={nimbusApiUrl}
                    onChange={(e) => setNimbusApiUrl(e.target.value)}
                    placeholder="https://api.nimbuspos.com/v1"
                    className="w-full text-sm bg-zinc-50 border border-neutral-350 focus:border-neutral-900 rounded-md pl-3.5 pr-10 py-2 outline-none font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiUrl(!showApiUrl)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-650 transition-colors"
                    id="nimbus-api-url-eye"
                  >
                    {showApiUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Defaults to local integrated mock: <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-700">http://localhost:3000/api/nimbus-mock</code>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1">
                    API KEY (x-nimbus-api-key)
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      required
                      value={nimbusApiKey}
                      onChange={(e) => setNimbusApiKey(e.target.value)}
                      placeholder="Enter Nimbus API key"
                      className="w-full text-sm bg-zinc-50 border border-neutral-350 focus:border-neutral-900 rounded-md pl-3.5 pr-10 py-2 outline-none font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-650 transition-colors"
                      id="nimbus-api-key-eye"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1">
                    SECRET KEY (x-nimbus-secret-key)
                  </label>
                  <div className="relative">
                    <input
                      type={showSecretKey ? 'text' : 'password'}
                      required
                      value={nimbusSecretKey}
                      onChange={(e) => setNimbusSecretKey(e.target.value)}
                      placeholder="Enter Secret secret key"
                      className="w-full text-sm bg-zinc-50 border border-neutral-350 focus:border-neutral-900 rounded-md pl-3.5 pr-10 py-2 outline-none font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-650 transition-colors"
                      id="nimbus-secret-key-eye"
                    >
                      {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-neutral-100 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-zinc-800">Real-Time Synchronization</label>
                    <p className="text-xs text-zinc-500">Automatically pull dynamically during selection and push during checkout updates.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRealTimeSync(!realTimeSync)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none ${realTimeSync ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${realTimeSync ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-start justify-between bg-amber-50/50 p-3 rounded-lg border border-amber-200/50">
                  <div className="space-y-0.5 pr-4">
                    <label className="text-sm font-medium text-amber-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Simulate POS Connection Failure
                    </label>
                    <p className="text-xs text-amber-700">
                      Forcefully reject outbound connections. Perfect to verify error-resilience, active fallback caching, and storefront warning toasts.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none ${simulateFailure ? 'bg-amber-600' : 'bg-zinc-200'}`}
                    onClick={() => setSimulateFailure(!simulateFailure)}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${simulateFailure ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={testConnection}
                disabled={testing}
                className="text-xs font-semibold px-4 py-2 border border-neutral-300 rounded-md hover:bg-zinc-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {testing ? 'Testing Connection...' : 'Test Connection'}
              </button>

              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-fade-in">
                    <CheckCircle className="w-3.5 h-3.5" /> Saved Settings
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold px-5 py-2 rounded-md transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>

          {/* Connection diagnostics block */}
          {testResult && (
            <div className={`p-4 rounded-lg border flex items-start gap-3 transition-all ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider">
                  Test Connection Result: {testResult.success ? 'SUCCESS' : 'FAILED'}
                </h4>
                <p className="text-sm">{testResult.message}</p>
                <div className="font-mono text-[10px] text-zinc-400 mt-1">
                  TIMESTAMP: {new Date().toLocaleTimeString()} • ACTION: PING_VERIFY_CREDENTIALS
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
