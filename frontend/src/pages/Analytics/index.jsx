import React from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import analyticsData from '../../data/analytics.json';
import projectsData from '../../data/projects.json';
import { formatCurrency } from '../../utils/formatters';

const STATUS_COLORS = { Sold: '#7A1E3A', Available: '#15803d', Blocked: '#dc2626', Reserved: '#d97706' };
const fmtL = (v) => v >= 10000000 ? `₹${(v/10000000).toFixed(1)}Cr` : `₹${(v/100000).toFixed(0)}L`;

export default function Analytics() {
  const totalRevenue = analyticsData.monthlyRevenue?.reduce((s, d) => s + d.revenue, 0) || 84800000;
  const targetRevenue = analyticsData.monthlyRevenue?.reduce((s, d) => s + d.target, 0) || 83000000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'landos-fade-in 0.2s ease-out' }}>
      
      {/* ── Page Header ── */}
      <div className="page-header-container responsive-stack" style={{
        padding: '16px 20px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '10px',
        boxShadow: 'var(--df-shadow-xs)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--df-text)', margin: 0, lineHeight: 1.2 }}>
              Executive Portfolio Analytics & Health
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)', border: '1px solid var(--df-accent-medium)' }}>
              Fiscal Year 2025
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--df-text-muted)', marginTop: '4px', margin: 0 }}>
            Real-time sales velocity, lead conversion funnels, occupancy distribution, and revenue projections.
          </p>
        </div>
      </div>

      {/* ── Top Metric Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
      }}>
        {[
          { label: 'Total Revenue YTD', value: formatCurrency(totalRevenue), color: 'var(--df-success)' },
          { label: 'Target Achievement', value: `${((totalRevenue / targetRevenue) * 100).toFixed(1)}%`, color: 'var(--df-accent)' },
          { label: 'Total Sites', value: `${projectsData.length} Projects`, color: 'var(--df-text)' },
          { label: 'Avg Plot Velocity', value: '4.2 plots / wk', color: '#3b82f6' },
        ].map((k, i) => (
          <div
            key={i}
            style={{
              padding: '14px 18px',
              backgroundColor: 'var(--df-card-bg)',
              border: '1px solid var(--df-card-border)',
              borderRadius: '8px',
              boxShadow: 'var(--df-shadow-xs)'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', letterSpacing: '0.05em', marginBottom: '6px' }}>
              {k.label}
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: k.color, fontFamily: 'var(--font-mono, monospace)' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="dashboard-charts-grid">
        
        {/* Monthly Revenue vs Target */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'var(--df-card-bg)',
          border: '1px solid var(--df-card-border)',
          borderRadius: '10px',
          boxShadow: 'var(--df-shadow-xs)'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--df-text)', marginBottom: '4px' }}>
            Monthly Collections vs Target Projection
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--df-text-muted)', marginBottom: '14px' }}>
            Consolidated inflows across all real estate development sites
          </div>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData.monthlyRevenue || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="anRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--df-accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--df-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--df-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--df-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--df-text-muted)" fontSize={11} tickFormatter={fmtL} tickLine={false} axisLine={false} width={50} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="revenue" name="Actual Revenue" stroke="var(--df-accent)" strokeWidth={2} fill="url(#anRevGrad)" />
                <Area type="monotone" dataKey="target" name="Target Budget" stroke="#C9A87C" strokeWidth={1.5} strokeDasharray="4 3" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plot Inventory Breakdown */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'var(--df-card-bg)',
          border: '1px solid var(--df-card-border)',
          borderRadius: '10px',
          boxShadow: 'var(--df-shadow-xs)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--df-text)', marginBottom: '4px' }}>
              Plot Status Distribution
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--df-text-muted)', marginBottom: '10px' }}>
              Current occupancy across total site inventory
            </div>
          </div>
          <div style={{ height: '170px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.plotStatusBreakdown || []}
                  cx="50%" cy="50%" innerRadius={45} outerRadius={68}
                  paddingAngle={3} dataKey="count"
                >
                  {(analyticsData.plotStatusBreakdown || []).map((e, i) => (
                    <Cell key={i} fill={STATUS_COLORS[e.status] || '#888'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {(analyticsData.plotStatusBreakdown || []).map((item) => (
              <div key={item.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--df-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_COLORS[item.status], display: 'inline-block' }} />
                  <span style={{ fontSize: '11px', color: 'var(--df-text-soft)' }}>{item.status}</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--df-text)', fontFamily: 'var(--font-mono)' }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
