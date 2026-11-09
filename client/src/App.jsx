import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import DisputesPage from './pages/DisputesPage';
import DisputeDetailPage from './pages/DisputeDetailPage';
import PayPalConnectionPage from './pages/PayPalConnectionPage';
import IntegrationDocsPage from './pages/IntegrationDocsPage';
import { api } from './api/client';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [stats, setStats] = useState(null);
  const [payPalStatus, setPayPalStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('deadline');
  const [sortOrder, setSortOrder] = useState('asc');

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const statusData = await api.getPayPalStatus();
      setPayPalStatus(statusData);
    } catch (err) {
      console.warn('Could not load PayPal status:', err);
    }
  }, []);

  const fetchDisputesData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, disputesRes] = await Promise.all([
        api.getDisputeStats(),
        api.getDisputes({
          status: statusFilter,
          search: searchTerm,
          sortBy: sortBy,
          order: sortOrder
        })
      ]);

      setStats(statsRes.stats);
      setDisputes(disputesRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load disputes data from server.');
      setDisputes([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm, sortBy, sortOrder]);

  // Initial load
  useEffect(() => {
    fetchStatus();
    fetchDisputesData();
  }, [fetchStatus, fetchDisputesData]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncDisputes();
      await fetchDisputesData();
      await fetchStatus();
      showNotification(res.message || 'Disputes synchronized successfully!', 'success');
    } catch (err) {
      showNotification(err.message || 'Failed to sync with PayPal', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectDispute = (dispute) => {
    setSelectedDispute(dispute);
    setCurrentView('dispute-detail');
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setSortBy('deadline');
    setSortOrder('asc');
  };

  const getPageHeaderProps = () => {
    switch (currentView) {
      case 'dashboard':
        return {
          title: 'Dispute Management Dashboard',
          subtitle: 'Overview of incoming PayPal dispute claims, financial exposure, and response timelines.'
        };
      case 'disputes':
        return {
          title: 'Disputes & Claims Registry',
          subtitle: 'Search, filter, and inspect PayPal claims awaiting merchant evidence.'
        };
      case 'dispute-detail':
        return {
          title: selectedDispute ? `Dispute ${selectedDispute.paypalDisputeId}` : 'Dispute Detail',
          subtitle: 'Transaction breakdown, buyer message log, and evidence preparation checklist.'
        };
      case 'paypal-connection':
        return {
          title: 'PayPal Account Connection',
          subtitle: 'Connect your PayPal Developer Sandbox app credentials securely.'
        };
      case 'integration-docs':
        return {
          title: 'FlowPilot Shared Architecture',
          subtitle: 'Integration contracts and API data specifications for team members 2, 3, and 4.'
        };
      default:
        return {
          title: 'FlowPilot',
          subtitle: 'PayPal Dispute Evidence Copilot'
        };
    }
  };

  const headerProps = getPageHeaderProps();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        payPalStatus={payPalStatus}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <Header
          title={headerProps.title}
          subtitle={headerProps.subtitle}
          onSync={handleSync}
          isSyncing={isSyncing}
          payPalStatus={payPalStatus}
        />

        {/* Floating Notification Banner */}
        {notification && (
          <div className="px-8 pt-4">
            <div className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between shadow-xs transition-all ${
              notification.type === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            }`}>
              <span>{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-slate-600 font-bold ml-2"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Page Views */}
        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && (
            <DashboardPage
              stats={stats}
              recentActivity={disputes.slice(0, 5)}
              onSelectDispute={handleSelectDispute}
              onNavigate={setCurrentView}
              payPalStatus={payPalStatus}
            />
          )}

          {currentView === 'disputes' && (
            <DisputesPage
              disputes={disputes}
              isLoading={isLoading}
              error={error}
              onSelectDispute={handleSelectDispute}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              onResetFilters={handleResetFilters}
              onSync={handleSync}
              isSyncing={isSyncing}
              payPalStatus={payPalStatus}
            />
          )}

          {currentView === 'dispute-detail' && (
            <DisputeDetailPage
              dispute={selectedDispute}
              onBack={() => setCurrentView('disputes')}
              onNavigateToPayPal={() => setCurrentView('paypal-connection')}
            />
          )}

          {currentView === 'paypal-connection' && (
            <PayPalConnectionPage
              payPalStatus={payPalStatus}
              onStatusChange={() => {
                fetchStatus();
                fetchDisputesData();
              }}
            />
          )}

          {currentView === 'integration-docs' && (
            <IntegrationDocsPage />
          )}
        </main>
      </div>
    </div>
  );
}
