import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Key, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Lock, 
  Eye, 
  EyeOff,
  HelpCircle,
  Database,
  Info
} from 'lucide-react';
import { api } from '../api/client';

export default function PayPalConnectionPage({ payPalStatus, onStatusChange }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const isConnected = payPalStatus?.connected;
  const activeMode = payPalStatus?.mode || 'demo';

  const handleTest = async (e) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      setActionError('Please enter both Client ID and Client Secret.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await api.testPayPalConnection(clientId.trim(), clientSecret.trim());
      setTestResult({
        success: true,
        message: 'PayPal OAuth 2.0 verification succeeded! Credentials are valid for Sandbox.'
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'PayPal authentication failed. Check credentials and retry.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      setActionError('Please enter both Client ID and Client Secret.');
      return;
    }

    setIsConnecting(true);
    setActionError(null);
    setActionSuccess(null);
    setTestResult(null);

    try {
      const res = await api.connectPayPal(clientId.trim(), clientSecret.trim());
      setActionSuccess(`Successfully connected to PayPal Sandbox! Synced ${res.syncedCount || 0} disputes.`);
      setClientId('');
      setClientSecret('');
      if (onStatusChange) onStatusChange();
    } catch (err) {
      setActionError(err.message || 'Failed to connect PayPal Sandbox.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect? The system will revert to FlowPilot Demo Mode with sample records.')) {
      return;
    }

    setIsDisconnecting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await api.disconnectPayPal();
      setActionSuccess('Disconnected PayPal Sandbox. Switched to FlowPilot Demo Mode.');
      if (onStatusChange) onStatusChange();
    } catch (err) {
      setActionError(err.message || 'Failed to disconnect PayPal.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">PayPal Account & API Connection</h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure official PayPal REST API credentials to synchronize disputes and dispute evidence directly.
        </p>
      </div>

      {/* Mode Comparison: Sandbox vs Live Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sandbox Card */}
        <div className="bg-white rounded-xl border-2 border-blue-500 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Recommended for Development
            </span>
            <span className="text-xs font-semibold text-slate-600">Sandbox Mode</span>
          </div>
          <h3 className="text-base font-bold text-slate-900">PayPal Developer Sandbox</h3>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Uses <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">https://api-m.sandbox.paypal.com</code>. Safe virtual test environment with dummy transactions and test buyer/seller accounts.
          </p>
          <ul className="mt-3 text-xs text-slate-600 space-y-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero real financial risk or transaction fees</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full Customer Disputes API testing</span>
            </li>
          </ul>
        </div>

        {/* Live Mode Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs opacity-80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Production Only
            </span>
            <span className="text-xs font-semibold text-slate-600">Live Mode</span>
          </div>
          <h3 className="text-base font-bold text-slate-900">PayPal Production Environment</h3>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Uses <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">https://api-m.paypal.com</code>. Processes real cardholder chargebacks and PayPal merchant funds.
          </p>
          <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Disabled during development as mandated by FlowPilot security requirements.</span>
          </div>
        </div>
      </div>

      {/* Current Connection Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Active Ingestion State
            </span>
            <div className="flex items-center gap-3">
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-lg font-bold text-slate-900">Connected to PayPal Sandbox</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span className="text-lg font-bold text-slate-900">FlowPilot Demo Mode Active</span>
                </div>
              )}
            </div>
          </div>

          {isConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect Sandbox'}
            </button>
          ) : (
            <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              Presenting realistic mock disputes (never presented as real PayPal records)
            </span>
          )}
        </div>

        {isConnected && payPalStatus?.maskedClientId && (
          <div className="mt-4 text-xs text-slate-600 flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-blue-600" />
            <span>Active Client ID: <code className="font-mono font-semibold">{payPalStatus.maskedClientId}</code></span>
          </div>
        )}
      </div>

      {/* Credential Entry Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            {isConnected ? 'Update Sandbox Credentials' : 'Connect PayPal Sandbox Credentials'}
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-6">
          Enter your PayPal Developer Sandbox REST App credentials. They are securely verified via the backend and never exposed in client bundles.
        </p>

        {actionError && (
          <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {testResult && (
          <div className={`mb-5 p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
            testResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <form className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Sandbox Client ID
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. AX7... (from developer.paypal.com)"
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Sandbox Client Secret
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="e.g. EL... (never commit this to git)"
                className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || isConnecting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
              <span>{isTesting ? 'Testing Auth...' : 'Test Credentials'}</span>
            </button>

            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting || isTesting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isConnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{isConnecting ? 'Connecting & Syncing...' : 'Connect PayPal Sandbox'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Beginner Step-by-Step Guide on Obtaining Credentials */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">
            How to Get PayPal Sandbox Credentials (Beginner Step-by-Step)
          </h3>
        </div>

        <ol className="text-xs text-slate-600 space-y-2.5 list-decimal list-inside leading-relaxed">
          <li>
            Visit the official PayPal Developer portal:{' '}
            <a 
              href="https://developer.paypal.com/dashboard/" 
              target="_blank" 
              rel="noreferrer"
              className="text-blue-600 font-semibold underline inline-flex items-center gap-0.5"
            >
              developer.paypal.com/dashboard <ExternalLink className="w-3 h-3" />
            </a>.
          </li>
          <li>Log in with your PayPal developer account credentials (free to sign up).</li>
          <li>In the left sidebar, click <strong>Apps & Credentials</strong>.</li>
          <li>Ensure the toggle at the top is set to <strong>Sandbox</strong> (not Live).</li>
          <li>Click <strong>Create App</strong> (or select <em>Default Application</em>).</li>
          <li>Copy the <strong>Client ID</strong> and <strong>Secret</strong> into the form above or into your local <code className="bg-white border px-1 py-0.5 rounded font-mono">.env</code> file.</li>
          <li>
            For disputes testing, consult PayPal's Customer Disputes API doc:{' '}
            <a 
              href="https://developer.paypal.com/docs/api/customer-disputes/v1/" 
              target="_blank" 
              rel="noreferrer"
              className="text-blue-600 underline inline-flex items-center gap-0.5"
            >
              developer.paypal.com/docs/api/customer-disputes/v1 <ExternalLink className="w-3 h-3" />
            </a>.
          </li>
        </ol>
      </div>
    </div>
  );
}
