import React, { useState } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid 
} from 'recharts';
import { 
  BarChart3, TrendingUp, Download, FileText, Sparkles, CheckCircle2, 
  Layers, ArrowUpRight, DollarSign, Activity, FileSpreadsheet, Calendar, ShieldCheck
} from 'lucide-react';
import analyticsData from '../../data/analytics.json';
import projectsData from '../../data/projects.json';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUS_COLORS = { Sold: '#9f1239', Available: '#16a34a', Blocked: '#dc2626', Reserved: '#d97706' };
const FACING_COLORS = ['#9f1239', '#16a34a', '#d97706', '#64748b'];
const fmtL = (v) => v >= 10000000 ? `₹${(v/10000000).toFixed(1)}Cr` : `₹${(v/100000).toFixed(0)}L`;

export default function Analytics() {
  const [selectedAuditDoc, setSelectedAuditDoc] = useState(null);
  const [isGeneratingAudit, setIsGeneratingAudit] = useState(false);
  const [auditDocs, setAuditDocs] = useState(() => analyticsData.analyticalDocuments || []);

  const totalRevenue = analyticsData.monthlyRevenue?.reduce((s, d) => s + d.revenue, 0) || 84800000;
  const targetRevenue = analyticsData.monthlyRevenue?.reduce((s, d) => s + d.target, 0) || 83000000;

  const handleGenerateAuditReport = () => {
    setIsGeneratingAudit(true);
    setTimeout(() => {
      const newDoc = {
        id: `an_doc_${Date.now()}`,
        title: `Real-Time Consolidated Portfolio Audit (${new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})`,
        category: 'Financial & Land Audit',
        format: 'PDF',
        fileSize: '3.1 MB',
        generatedDate: new Date().toISOString().split('T')[0],
        status: 'Generated & Certified',
        summary: 'Automated executive audit calculating plot inventory realization, UDCPR statutory setbacks, and cash inflows.'
      };
      setAuditDocs(prev => [newDoc, ...prev]);
      setIsGeneratingAudit(false);
      alert('Fresh Real-Time Portfolio Audit generated and added to Vault!');
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'landos-fade-in 0.2s ease-out' }}>
      
      {/* ── Page Header ── */}
      <div className="page-header-container responsive-stack" style={{
        padding: '14px 18px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        boxShadow: 'var(--df-shadow-xs)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--df-text)', margin: 0, lineHeight: 1.2 }}>
              Executive Portfolio Analytics & Intelligence
            </h1>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)', border: '1px solid rgba(159,18,57,0.25)' }}>
              FY 2024-25 Real-Time
            </span>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--df-text-muted)', marginTop: '3px', margin: 0 }}>
            Real-time cash inflow realization, plot sales velocity, statutory land utilization, and downloadable audit reports.
          </p>
        </div>

        <button
          onClick={handleGenerateAuditReport}
          disabled={isGeneratingAudit}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            height: '36px', padding: '0 16px', borderRadius: '6px',
            background: 'var(--df-accent)', color: '#ffffff', border: 'none',
            fontSize: '0.78rem', fontWeight: 800, cursor: isGeneratingAudit ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(159,18,57,0.3)',
            opacity: isGeneratingAudit ? 0.7 : 1
          }}
        >
          <Sparkles style={{ width: '14px', height: '14px' }} />
          {isGeneratingAudit ? 'Compiling Audit…' : 'Generate Fresh Audit Report'}
        </button>
      </div>

      {/* ── Top Metric Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
      }}>
        {[
          { label: 'Total Revenue YTD', value: formatCurrency(totalRevenue), color: 'var(--df-success)' },
          { label: 'Target Realization', value: `${((totalRevenue / targetRevenue) * 100).toFixed(1)}%`, color: 'var(--df-accent)' },
          { label: 'Active Projects', value: `${projectsData.length} Sites`, color: 'var(--df-text)' },
          { label: 'Collection Efficiency', value: `${analyticsData.overview?.collectionEfficiency || 94.2}%`, color: 'var(--df-success)' },
        ].map((k, i) => (
          <div
            key={i}
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--df-card-bg)',
              border: '1px solid var(--df-card-border)',
              borderRadius: '8px',
              boxShadow: 'var(--df-shadow-xs)'
            }}
          >
            <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {k.label}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: k.color, fontFamily: 'var(--font-mono, monospace)' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="dashboard-charts-grid">
        
        {/* Monthly Revenue vs Target Area Chart */}
        <div style={{
          padding: '14px 18px',
          backgroundColor: 'var(--df-card-bg)',
          border: '1px solid var(--df-card-border)',
          borderRadius: '8px',
          boxShadow: 'var(--df-shadow-xs)'
        }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '2px' }}>
            Monthly Collections vs Target Projection (₹)
          </div>
          <div style={{ fontSize: '0.70rem', color: 'var(--df-text-muted)', marginBottom: '12px' }}>
            Consolidated cash inflows across active plotting layouts
          </div>
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData.monthlyRevenue || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="anRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--df-accent)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--df-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--df-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--df-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--df-text-muted)" fontSize={11} tickFormatter={fmtL} tickLine={false} axisLine={false} width={45} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Area type="monotone" dataKey="revenue" name="Actual Collections" stroke="var(--df-accent)" strokeWidth={2.2} fill="url(#anRevGrad)" />
                <Area type="monotone" dataKey="target" name="Budget Target" stroke="#d97706" strokeWidth={1.5} strokeDasharray="4 3" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plot Inventory Status Distribution */}
        <div style={{
          padding: '14px 18px',
          backgroundColor: 'var(--df-card-bg)',
          border: '1px solid var(--df-card-border)',
          borderRadius: '8px',
          boxShadow: 'var(--df-shadow-xs)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '2px' }}>
              Plot Inventory Status Distribution
            </div>
            <div style={{ fontSize: '0.70rem', color: 'var(--df-text-muted)', marginBottom: '8px' }}>
              Occupancy and availability ratio across total portfolio
            </div>
          </div>
          <div style={{ height: '150px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.plotStatusBreakdown || []}
                  cx="50%" cy="50%" innerRadius={42} outerRadius={62}
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
              <div key={item.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--df-bg)', border: '1px solid var(--df-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_COLORS[item.status], display: 'inline-block' }} />
                  <span style={{ fontSize: '0.70rem', color: 'var(--df-text-soft)', fontWeight: 600 }}>{item.status}</span>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--df-text)', fontFamily: 'var(--font-mono)' }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Charts Row 2: Facing Direction & Revenue Breakdown ── */}
      <div className="dashboard-charts-grid">
        
        {/* Facing Direction Distribution Bar Chart */}
        <div style={{
          padding: '14px 18px',
          backgroundColor: 'var(--df-card-bg)',
          border: '1px solid var(--df-card-border)',
          borderRadius: '8px',
          boxShadow: 'var(--df-shadow-xs)'
        }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '2px' }}>
            Sales Realization by Facing Direction (Vastu / Orientation)
          </div>
          <div style={{ fontSize: '0.70rem', color: 'var(--df-text-muted)', marginBottom: '12px' }}>
            Revenue generated based on road frontage and cardinal orientation
          </div>
          <div style={{ height: '190px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.facingDistribution || []} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--df-border)" vertical={false} />
                <XAxis dataKey="facing" stroke="var(--df-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--df-text-muted)" fontSize={11} tickFormatter={fmtL} tickLine={false} axisLine={false} width={45} />
                <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} />
                <Bar dataKey="revenue" name="Total Revenue" radius={[4, 4, 0, 0]}>
                  {(analyticsData.facingDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FACING_COLORS[index % FACING_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Velocity by Month */}
        <div style={{
          padding: '14px 18px',
          backgroundColor: 'var(--df-card-bg)',
          border: '1px solid var(--df-card-border)',
          borderRadius: '8px',
          boxShadow: 'var(--df-shadow-xs)'
        }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '2px' }}>
            Monthly Plot Sales Velocity (Volume)
          </div>
          <div style={{ fontSize: '0.70rem', color: 'var(--df-text-muted)', marginBottom: '12px' }}>
            Total number of plots booked & sold per month
          </div>
          <div style={{ height: '190px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.monthlyRevenue || []} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--df-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--df-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--df-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <Tooltip formatter={(v) => [`${v} Plots`, 'Sold Count']} />
                <Bar dataKey="plotsSold" name="Plots Sold" fill="var(--df-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── Analytical Reports & Audit Documents Section ── */}
      <div style={{
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        boxShadow: 'var(--df-shadow-xs)',
        padding: '16px 18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText style={{ width: '16px', height: '16px', color: 'var(--df-accent)' }} />
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--df-text)', margin: 0 }}>
                Downloadable Portfolio Audits & Analytical Documents
              </h3>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--df-text-muted)', margin: '2px 0 0 0' }}>
              Official certified reports exported directly from CAD vector analysis and transaction ledgers.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
          {auditDocs.map((doc) => (
            <div
              key={doc.id}
              style={{
                padding: '12px 14px',
                background: 'var(--df-bg)',
                border: '1px solid var(--df-border)',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '130px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--df-accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {doc.category}
                  </span>
                  <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: 'var(--df-success-soft)', color: 'var(--df-success)' }}>
                    {doc.status}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.80rem', color: 'var(--df-text)', marginBottom: '4px', lineHeight: 1.3 }}>
                  {doc.title}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)', lineHeight: 1.4 }}>
                  {doc.summary}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--df-border)', paddingTop: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '0.66rem', color: 'var(--df-text-muted)' }}>
                  {doc.generatedDate} • {doc.fileSize} ({doc.format})
                </span>
                <button
                  onClick={() => alert(`Downloading audit report: ${doc.title}`)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', borderRadius: '4px', border: 'none',
                    background: 'var(--df-accent)', color: '#ffffff', fontSize: '0.70rem', fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 2px 4px rgba(159,18,57,0.25)'
                  }}
                >
                  <Download style={{ width: '11px', height: '11px' }} /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
