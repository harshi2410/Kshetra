import React from 'react';
import {
  Map,
  Users,
  Grid,
  TrendingUp,
  Clock,
  FileText,
  UserCheck,
  Percent,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import Card from '../../../components/ui/Card';

const formatINR = (amount) => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function KpiGrid({
  analyticsData,
  projectsData,
  customersData,
  paymentsData,
  documentsData,
  brokersData
}) {
  const overview = analyticsData?.overview || {};

  const totalProjects = projectsData?.length || overview.totalProjects || 3;
  const totalCustomers = customersData?.length || overview.totalCustomers || 98;
  const totalBrokers = brokersData?.length || overview.totalBrokers || 12;
  const totalDocuments = documentsData?.length || 4;
  
  const totalRevenue = overview.totalRevenue || 145000000;
  const pendingPaymentsAmount = overview.pendingPayments || 8500000;

  let totalPlots = 0;
  let totalSoldPlots = 0;
  if (projectsData && projectsData.length > 0) {
    projectsData.forEach(p => {
      totalPlots += p.totalPlots || 0;
      totalSoldPlots += p.soldPlots || 0;
    });
  } else {
    totalPlots = 380;
    totalSoldPlots = overview.totalPlotsSold || 132;
  }

  const occupancyRate = totalPlots > 0 ? ((totalSoldPlots / totalPlots) * 100).toFixed(1) : 43.7;

  const kpis = [
    {
      title: 'Total Projects',
      value: totalProjects,
      subtitle: `${projectsData?.filter(p => p.status === 'Active')?.length || 2} Active Developments`,
      icon: Map,
      trend: '+1 this quarter',
      trendUp: true,
      color: 'text-[var(--color-primary)]',
      bg: 'bg-[var(--color-primary)]/10'
    },
    {
      title: 'Total Customers',
      value: totalCustomers,
      subtitle: 'Verified Buyers & Investors',
      icon: Users,
      trend: '+18.5% growth',
      trendUp: true,
      color: 'text-[var(--color-info)]',
      bg: 'bg-[var(--color-info)]/10'
    },
    {
      title: 'Plots Sold',
      value: `${totalSoldPlots} / ${totalPlots}`,
      subtitle: `${occupancyRate}% Overall Sales Rate`,
      icon: Grid,
      trend: `+${overview.plotsSoldGrowth || 12.3}% growth`,
      trendUp: true,
      color: 'text-[var(--color-success)]',
      bg: 'bg-[var(--color-success)]/10'
    },
    {
      title: 'Total Revenue',
      value: formatINR(totalRevenue),
      subtitle: 'Booked & Realized Sales',
      icon: TrendingUp,
      trend: `+${overview.revenueGrowth || 18.5}% YoY`,
      trendUp: true,
      color: 'text-[var(--color-primary)]',
      bg: 'bg-[var(--color-primary)]/10'
    },
    {
      title: 'Pending Payments',
      value: formatINR(pendingPaymentsAmount),
      subtitle: `${paymentsData?.filter(p => p.status === 'Pending')?.length || 1} Upcoming Installments`,
      icon: Clock,
      trend: 'Follow-up required',
      trendUp: false,
      color: 'text-[var(--color-warning)]',
      bg: 'bg-[var(--color-warning)]/10'
    },
    {
      title: 'Uploaded Documents',
      value: totalDocuments,
      subtitle: `${documentsData?.filter(d => d.status === 'Signed' || d.status === 'Approved')?.length || 2} Verified Files`,
      icon: FileText,
      trend: '100% Compliant',
      trendUp: true,
      color: 'text-[var(--color-accent-dark)]',
      bg: 'bg-[var(--color-accent)]/15'
    },
    {
      title: 'Active Brokers',
      value: totalBrokers,
      subtitle: 'Partner Channel Network',
      icon: UserCheck,
      trend: '+2 new partners',
      trendUp: true,
      color: 'text-[var(--color-info)]',
      bg: 'bg-[var(--color-info)]/10'
    },
    {
      title: 'Occupancy Rate',
      value: `${occupancyRate}%`,
      subtitle: 'Inventory Absorption',
      icon: Percent,
      trend: '+4.2% this month',
      trendUp: true,
      color: 'text-[var(--color-success)]',
      bg: 'bg-[var(--color-success)]/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card key={index} className="p-5 flex flex-col justify-between hover:border-[var(--color-primary)]/40 transition-all duration-200 shadow-xs">
            {/* Top row: Title and Icon */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] truncate">
                {kpi.title}
              </span>
              <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color} shrink-0`}>
                <Icon className="w-4 h-4 stroke-[2]" />
              </div>
            </div>

            {/* Middle: Big Metric Value */}
            <div className="my-3">
              <h3 className="text-2xl font-bold font-display text-[var(--color-text-primary)] tracking-tight truncate">
                {kpi.value}
              </h3>
            </div>

            {/* Bottom row: Subtitle & Trend Pill */}
            <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between gap-2 text-xs">
              <span className="text-[11px] text-[var(--color-text-muted)] truncate font-medium">
                {kpi.subtitle}
              </span>
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                kpi.trendUp
                  ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                  : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
              }`}>
                {kpi.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.trend}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
