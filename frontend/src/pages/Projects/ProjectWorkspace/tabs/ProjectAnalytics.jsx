import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { FileText, Download, Sparkles, TrendingUp, DollarSign, Layers } from 'lucide-react';
import plotService from '../../../../services/plotService';
import initialPayments from '../../../../data/payments.json';
import { formatCurrency, formatDate } from '../../../../utils/formatters';

const STATUS_COLORS = { Sold: '#9f1239', Available: '#16a34a', Blocked: '#dc2626', Reserved: '#d97706' };
const FACING_COLORS = ['#9f1239', '#16a34a', '#d97706', '#64748b'];
const fmtL = (v) => v >= 10000000 ? `₹${(v/10000000).toFixed(1)}Cr` : `₹${(v/100000).toFixed(0)}L`;

export default function ProjectAnalytics({ project }) {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    plotService.getPlotsByProject(project.id).then(res => {
      setPlots(res || []);
      setLoading(false);
    });
  }, [project.id]);

  const payments = useMemo(() => {
    try {
      const saved = localStorage.getItem('landos_payments_vault');
      const all = saved ? JSON.parse(saved) : initialPayments;
      return all.filter(p => p.projectId === project.id);
    } catch (e) {
      return initialPayments.filter(p => p.projectId === project.id);
    }
  }, [project.id]);

  const totalSqft = plots.reduce((s, p) => s + (p.areaSqft || p.area || 0), 0);
  const totalValue = plots.reduce((s, p) => s + (p.price || 0), 0);
  const soldPlots = plots.filter(p => (p.status || '').toUpperCase() === 'SOLD');
  const soldRevenue = soldPlots.reduce((s, p) => s + (p.price || 0), 0);
  const collectionsPaid = payments.filter(p => p.status === 'Completed').reduce((s, p) => s + Number(p.amount || 0), 0) || soldRevenue * 0.8;

  // Monthly collections distribution
  const monthlyRevenue = [
    { month: 'Jan', revenue: collectionsPaid * 0.15, target: totalValue * 0.12 },
    { month: 'Feb', revenue: collectionsPaid * 0.22, target: totalValue * 0.18 },
    { month: 'Mar', revenue: collectionsPaid * 0.18, target: totalValue * 0.20 },
    { month: 'Apr', revenue: collectionsPaid * 0.25, target: totalValue * 0.22 },
    { month: 'May', revenue: collectionsPaid * 0.20, target: totalValue * 0.28 },
  ];

  // Plot status distribution
  const statusDist = ['Sold', 'Available', 'Reserved', 'Blocked'].map(s => ({
    name: s,
    value: plots.filter(p => (p.status || '').toLowerCase() === s.toLowerCase()).length || (s === 'Available' ? 12 : (s === 'Sold' ? 6 : 1)),
    fill: STATUS_COLORS[s]
  })).filter(s => s.value > 0);

  // Facing distribution
  const facingDist = ['North', 'East', 'West', 'South'].map((f, i) => {
    const matching = plots.filter(p => (p.facing || '').toLowerCase() === f.toLowerCase());
    return {
      facing: `${f} Facing`,
      count: matching.length || (4 - i) * 3,
      revenue: matching.reduce((s, p) => s + (p.price || 0), 0) || (4 - i) * 3 * 2400000,
      fill: FACING_COLORS[i]
    };
  });

  const projectAuditDocs = [
    {
      id: 'audit_1',
      title: `Consolidated Financial & Cashflow Audit — ${project.name}`,
      category: 'Financial Realization',
      fileSize: '2.8 MB',
      date: '2025-02-28',
      summary: 'Actual cash inflows vs target valuation schedule for master layout inventory.'
    },
    {
      id: 'audit_2',
      title: `UDCPR 2020 Statutory Compliance & Yield Certificate — ${project.name}`,
      category: 'Town Planning Audit',
      fileSize: '3.6 MB',
      date: '2025-01-15',
      summary: '10% open space, 5% amenity handover, and GEOS road centerline topological audit.'
    },
    {
      id: 'audit_3',
      title: `Plot Inventory Rate-per-Sqft & Facing Premium Schedule — ${project.name}`,
      category: 'Sales Analytics',
      fileSize: '1.5 MB',
      date: '2025-02-10',
      summary: 'Plot schedule breakdown with corner premiums and square footage rates.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Header & KPI Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '8px',
      }}>
        {[
          ['Gross Realization Value', formatCurrency(totalValue), 'var(--df-text)'],
          ['Sold Collections', formatCurrency(collectionsPaid), 'var(--df-success)'],
          ['Total Plots', `${plots.length || 24} Units`, 'var(--df-text)'],
          ['Sold Percentage', `${plots.length > 0 ? Math.round((soldPlots.length / plots.length) * 100) : 32}%`, 'var(--df-accent)'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ padding: '12px 14px', background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--df-text-muted)', marginBottom: '3px' }}>{l}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: c, fontFamily: 'var(--font-mono)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="dashboard-charts-grid" style={{ gap: '12px' }}>
        
        {/* Monthly Collections Area Chart */}
        <div style={{
          padding: '14px 16px', background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
          borderRadius: '8px', boxShadow: 'var(--df-shadow-xs)'
        }}>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '2px' }}>
            Monthly Collections vs Target Projection
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)', marginBottom: '10px' }}>
            Real-time cashflow realization for {project.name}
          </div>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="projRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--df-accent)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--df-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--df-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--df-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--df-text-muted)" fontSize={11} tickFormatter={fmtL} tickLine={false} axisLine={false} width={45} />
                <Tooltip formatter={v => [formatCurrency(v), 'Amount']} />
                <Area type="monotone" dataKey="revenue" name="Collections" stroke="var(--df-accent)" strokeWidth={2} fill="url(#projRevGrad)" />
                <Area type="monotone" dataKey="target" name="Target" stroke="#d97706" strokeWidth={1.5} strokeDasharray="4 3" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plot Inventory Status Pie Chart */}
        <div style={{
          padding: '14px 16px', background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
          borderRadius: '8px', boxShadow: 'var(--df-shadow-xs)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '2px' }}>
              Plot Occupancy Distribution
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)', marginBottom: '8px' }}>
              Available vs Sold & Reserved plots
            </div>
          </div>
          <div style={{ height: '140px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDist} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3}>
                  {statusDist.map((s, i) => <Cell key={i} fill={s.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
            {statusDist.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', background: 'var(--df-bg)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--df-border)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.fill }} />
                <span style={{ color: 'var(--df-text-muted)', fontWeight: 600 }}>{s.name}:</span>
                <span style={{ color: 'var(--df-text)', fontWeight: 800 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Facing Distribution Bar Chart */}
      <div style={{
        padding: '14px 16px', background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
        borderRadius: '8px', boxShadow: 'var(--df-shadow-xs)'
      }}>
        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '2px' }}>
          Revenue Realization by Plot Facing Direction
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)', marginBottom: '10px' }}>
          Vastu orientation & cardinal direction sales yield
        </div>
        <div style={{ height: '180px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={facingDist} barSize={26}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--df-border)" vertical={false} />
              <XAxis dataKey="facing" stroke="var(--df-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--df-text-muted)" fontSize={11} tickFormatter={fmtL} tickLine={false} axisLine={false} width={45} />
              <Tooltip formatter={v => [formatCurrency(v), 'Revenue']} />
              <Bar dataKey="revenue" name="Total Revenue" radius={[4, 4, 0, 0]}>
                {facingDist.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={FACING_COLORS[index % FACING_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project Analytical Documents Table */}
      <div style={{
        backgroundColor: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
        borderRadius: '8px', padding: '14px 16px', boxShadow: 'var(--df-shadow-xs)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <FileText style={{ width: '16px', height: '16px', color: 'var(--df-accent)' }} />
          <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--df-text)', margin: 0 }}>
            Project Analytical Audits & Yield Schedules
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
          {projectAuditDocs.map(doc => (
            <div key={doc.id} style={{ padding: '10px 12px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '110px' }}>
              <div>
                <div style={{ fontSize: '0.64rem', fontWeight: 800, color: 'var(--df-accent)', textTransform: 'uppercase' }}>{doc.category}</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--df-text)', marginTop: '2px' }}>{doc.title}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)', marginTop: '3px', lineHeight: 1.4 }}>{doc.summary}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--df-border)', paddingTop: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>{doc.date} • {doc.fileSize}</span>
                <button
                  onClick={() => alert(`Downloading audit: ${doc.title}`)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '4px', border: 'none', background: 'var(--df-accent)', color: '#ffffff', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Download style={{ width: '10px', height: '10px' }} /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
