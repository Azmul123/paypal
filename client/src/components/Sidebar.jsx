import React from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  AlertTriangle, 
  Key, 
  FileCode, 
  Layers, 
  Cpu, 
  Send, 
  ExternalLink,
  X
} from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, payPalStatus, isMobileOpen, onCloseMobile }) {
  const isConnected = payPalStatus?.connected;

  const handleNavClick = (view) => {
    setCurrentView(view);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <>
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Shield className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              FlowPilot
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                Copilot
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">PayPal Dispute Evidence</p>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation (Module 1) */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Dispute Management (Module 1)
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleNavClick('disputes')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'disputes' || currentView === 'dispute-detail'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Disputes & Claims</span>
            </button>

            <button
              onClick={() => handleNavClick('paypal-connection')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'paypal-connection'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>PayPal Connection</span>
            </button>

            <button
              onClick={() => handleNavClick('integration-docs')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'integration-docs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Architecture & Contracts</span>
            </button>
          </nav>
        </div>

        {/* Future Modules Integration Placeholder Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>FlowPilot Modules 2-4</span>
            <span className="text-[10px] lowercase bg-slate-800 text-slate-400 px-1 rounded">team handoff</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-400 opacity-70 cursor-not-allowed">
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Evidence Vault</span>
              </span>
              <span className="text-[10px] font-medium bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">Mod 2</span>
            </div>

            <div className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-400 opacity-70 cursor-not-allowed">
              <span className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-slate-400" />
                <span>AI Intelligence</span>
              </span>
              <span className="text-[10px] font-medium bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">Mod 3</span>
            </div>

            <div className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-400 opacity-70 cursor-not-allowed">
              <span className="flex items-center gap-2.5">
                <Send className="w-4 h-4 text-slate-400" />
                <span>Response Builder</span>
              </span>
              <span className="text-[10px] font-medium bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">Mod 4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Connection Status Card */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Connection
            </span>
            {isConnected ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Sandbox
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400" title="Synthetic sample dataset">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Demo Mode
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 font-medium truncate">
            {isConnected ? 'PayPal REST Sandbox' : 'Synthetic Sample Records'}
          </p>

          <button
            onClick={() => handleNavClick('paypal-connection')}
            className="mt-2.5 text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
          >
            <span>{isConnected ? 'Manage Credentials' : 'Connect Sandbox'}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col flex-shrink-0 border-r border-slate-800 select-none">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Mobile Slide-Out Drawer */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col z-50 lg:hidden transform transition-transform duration-200 ease-in-out select-none shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
