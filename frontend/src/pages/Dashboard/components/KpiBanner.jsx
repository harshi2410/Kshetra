import React from 'react';
import { Map, Users, Grid3x3, TrendingUp, Clock, FileText, UserCheck, Percent } from 'lucide-react';

const fmt = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

export default function KpiBanner({ analyticsData, projectsData, customersData, paymentsData, documentsData, brokersData }) {
  const overview = analyticsData?.overview || {};

  const totalPlots = projectsData?.reduce((s, p) => s + (p.totalPlots || 0), 0) || 380;
  const soldPlots  = projectsData?.reduce((s, p) => s + (p.soldPlots  || 0), 0) || 132;
  const occ = totalPlots > 0 ? ((soldPlots / totalPlots) * 100).toFixed(1) : 34.7;

  const kpis = [
    { label: 'Projects',         value: projectsData?.length || 3,           icon: Map,       trend: '+1 this qtr',     up: true  },
    { label: 'Customers',        value: customersData?.length || 98,          icon: Users,     trend: '+18.5%',          up: true  },
    { label: 'Plots Sold',       value: `${soldPlots}/${totalPlots}`,         icon: Grid3x3,   trend: `${occ}% rate`,    up: true  },
    { label: 'Total Revenue',    value: fmt(overview.totalRevenue || 145000000), icon: TrendingUp, trend: '+18.5% YoY',   up: true  },
    { label: 'Pending',          value: fmt(overview.pendingPayments || 8500000), icon: Clock,  trend: 'Follow up',      up: false },
    { label: 'Documents',        value: documentsData?.length || 4,           icon: FileText,  trend: '100% compliant',  up: true  },
    { label: 'Brokers',          value: brokersData?.length || 2,             icon: UserCheck, trend: '+2 new',          up: true  },
    { label: 'Occupancy',        value: `${occ}%`,                            icon: Percent,   trend: '+4.2% month',     up: true  },
  ];

  return (
    <div className="kpi-banner-grid">
      {kpis.map((k, i) => {
        const Icon = k.icon;
        return (
          <div key={i} className="kpi-item">
            {/* Label + icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
              <span style={{
                fontSize: '0.6rem', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: 'var(--df-text-muted)', whiteSpace: 'nowrap',
              }}>
                {k.label}
              </span>
              <Icon style={{ width: '11px', height: '11px', color: 'var(--df-text-muted)', flexShrink: 0 }} />
            </div>

            {/* Value */}
            <div style={{
              fontSize: '1.1rem', fontWeight: 800,
              color: 'var(--df-text)', fontFamily: 'var(--font-mono, monospace)',
              lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {k.value}
            </div>

            {/* Trend */}
            <div style={{
              fontSize: '0.6rem', fontWeight: 600,
              color: k.up ? 'var(--df-success)' : 'var(--color-warning, #d97706)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {k.up ? '↑' : '↓'} {k.trend}
            </div>
          </div>
        );
      })}
    </div>
  );
}
