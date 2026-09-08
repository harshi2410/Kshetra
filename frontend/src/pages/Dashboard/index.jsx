import React from 'react';
import KpiBanner from './components/KpiBanner';
import RevenueChart from './components/RevenueChart';
import PlotDistributionChart from './components/PlotDistributionChart';
import ActiveProjectsTable from './components/ActiveProjectsTable';
import RecentPayments from './components/RecentPayments';
import RecentDocuments from './components/RecentDocuments';
import BrokerLeaderboard from './components/BrokerLeaderboard';
import ActivityTimeline from './components/ActivityTimeline';

import analyticsData from '../../data/analytics.json';
import projectsData from '../../data/projects.json';
import customersData from '../../data/customers.json';
import paymentsData from '../../data/payments.json';
import documentsData from '../../data/documents.json';
import brokersData from '../../data/brokers.json';
import useAuth from '../../auth/useAuth';

const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
};

const formattedDate = new Date().toLocaleDateString('en-IN', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'landos-fade-in 0.2s ease-out' }}>

      {/* ── Page heading ── */}
      <div className="page-header-container responsive-stack" style={{ marginBottom: '4px' }}>
        <div>
          <h1 style={{
            fontSize: '1.4rem', fontWeight: 700, color: 'var(--df-text)',
            letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2,
            fontFamily: 'var(--font-display)',
          }}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Shivam'} 👋
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--df-text-muted)', marginTop: '4px' }}>
            {formattedDate} · LandOS Executive Overview
          </p>
        </div>
        <div className="btn-group-responsive" style={{ display: 'flex', gap: '8px' }}>
          <a href="/projects" style={actionBtnStyle('secondary')}>+ New Project</a>
          <a href="/payments" style={actionBtnStyle('primary')}>Record Payment</a>
        </div>
      </div>

      {/* Row 1: KPI Banner */}
      <KpiBanner
        analyticsData={analyticsData}
        projectsData={projectsData}
        customersData={customersData}
        paymentsData={paymentsData}
        documentsData={documentsData}
        brokersData={brokersData}
      />

      {/* Row 2: Revenue Chart (8fr) + Plot Distribution (4fr) */}
      <div className="dashboard-charts-grid">
        <RevenueChart data={analyticsData.monthlyRevenue} />
        <PlotDistributionChart data={analyticsData.plotStatusBreakdown} />
      </div>

      {/* Row 3: Active Projects Table */}
      <ActiveProjectsTable projects={projectsData} />

      {/* Row 4: Recent Payments (1fr) + Recent Documents (1fr) */}
      <div className="dashboard-two-col-grid">
        <RecentPayments payments={paymentsData} customers={customersData} projects={projectsData} />
        <RecentDocuments documents={documentsData} />
      </div>

      {/* Row 5: Broker Leaderboard (1fr) + Activity Timeline (1fr) */}
      <div className="dashboard-two-col-grid">
        <BrokerLeaderboard brokers={brokersData} />
        <ActivityTimeline />
      </div>

    </div>
  );
}

function actionBtnStyle(variant) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '7px 14px', borderRadius: '6px',
    fontSize: '12.5px', fontWeight: 500, textDecoration: 'none',
    border: '1px solid', cursor: 'pointer', lineHeight: 1,
    transition: 'opacity 0.15s',
  };
  if (variant === 'primary') return {
    ...base,
    backgroundColor: 'var(--df-accent)', color: '#fff',
    borderColor: 'var(--df-accent)',
  };
  return {
    ...base,
    backgroundColor: 'var(--df-card-bg)', color: 'var(--df-text-soft)',
    borderColor: 'var(--df-border)',
  };
}
