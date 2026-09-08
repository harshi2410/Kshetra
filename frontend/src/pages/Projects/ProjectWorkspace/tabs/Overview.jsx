import React, { useEffect, useState } from 'react';
import { AlertTriangle, MapPin, Building2, Calendar, Clock } from 'lucide-react';
import plotService from '../../../../services/plotService';
import paymentsData from '../../../../data/payments.json';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import { cardStyle, cardHeaderStyle, cardTitleStyle, thStyle, tdStyle } from '../../components/dCardStyles';

const statusColor = {
  Sold:      { bg: 'rgba(122,30,58,0.1)', color: 'var(--df-accent)' },
  Reserved:  { bg: 'rgba(217,119,6,0.1)', color: '#d97706' },
  Available: { bg: 'rgba(21,128,61,0.1)', color: 'var(--df-success)' },
  Blocked:   { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
};

export default function Overview({ project }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    plotService.getProjectStats(project.id).then(s => { setStats(s); setLoading(false); });
  }, [project.id]);

  const recentPayments = paymentsData
    .filter(p => p.projectId === project.id)
    .slice(0, 4);

  const kpis = stats ? [
    { label: 'Total Plots',    value: stats.total,                         mono: true },
    { label: 'Sold',           value: stats.sold,                          mono: true, color: 'var(--df-accent)' },
    { label: 'Reserved',       value: stats.reserved,                      mono: true, color: '#d97706' },
    { label: 'Available',      value: stats.available,                     mono: true, color: 'var(--df-success)' },
    { label: 'Blocked',        value: stats.blocked,                       mono: true, color: '#64748b' },
    { label: 'Revenue',        value: formatCurrency(stats.revenue),        mono: false },
    { label: 'Occupancy',      value: stats.total ? `${Math.round((stats.sold / stats.total) * 100)}%` : '0%', mono: true },
  ] : [];

  const soldPct = stats?.total ? Math.round((stats.sold / stats.total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Project Processing State Banner */}
      {(project.status === 'LAYOUT_PENDING' || (project.layoutUploaded && project.totalPlots === 0)) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
          backgroundColor: 'rgba(217, 119, 6, 0.08)', border: '1px solid rgba(217, 119, 6, 0.25)',
          borderRadius: '6px'
        }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            backgroundColor: 'rgba(217, 119, 6, 0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            fontSize: '14px'
          }}>
            ⏳
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d97706' }}>
              Master Layout Processing Pending
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
              The master layout blueprint file ({project.layoutSource?.fileName || 'layout_master.pdf'}) has been uploaded and queued. Automated vector plot boundary extraction and GIS map alignment will be performed by the LandOS layout engine in a future step.
            </div>
          </div>
        </div>
      )}

      {project.status === 'DRAFT' && !project.layoutUploaded && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
          backgroundColor: 'rgba(100, 116, 139, 0.08)', border: '1px solid rgba(100, 116, 139, 0.25)',
          borderRadius: '6px'
        }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            backgroundColor: 'rgba(100, 116, 139, 0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            fontSize: '14px'
          }}>
            📝
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>
              Project Saved as Draft — Layout Blueprint Pending
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
              This project has been created in DRAFT state without a master layout blueprint. Upload a layout file in Settings or Layout Map to initiate automatic plot parsing.
            </div>
          </div>
        </div>
      )}

      {/* Responsive KPI Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '1px',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'var(--df-card-border)'
      }}>
        {loading ? (
          <div style={{ padding: '16px 20px', fontSize: '0.75rem', color: 'var(--df-text-muted)', background: 'var(--df-card-bg)' }}>Loading stats…</div>
        ) : kpis.map((k) => (
          <div key={k.label} style={{ padding: '12px 14px', background: 'var(--df-card-bg)' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--df-text-muted)', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: k.color || 'var(--df-text)', fontFamily: k.mono ? 'var(--font-mono, monospace)' : 'inherit', lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Row 2: Progress + Activity | Project Info */}
      <div className="responsive-grid-2" style={{ gap: '14px', alignItems: 'start' }}>

        {/* Left: Progress + Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Sales Progress */}
          <div style={cardStyle} className="mobile-card-compact">
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>Sales Progress</div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--df-accent)' }}>{soldPct}% Sold</span>
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ height: '8px', borderRadius: '4px', background: 'var(--df-bg)', overflow: 'hidden', border: '1px solid var(--df-border)' }}>
                <div style={{ height: '100%', width: `${soldPct}%`, background: 'var(--df-accent)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginTop: '8px', fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>
                {stats && Object.entries({ Sold: stats.sold, Reserved: stats.reserved, Available: stats.available, Blocked: stats.blocked }).map(([s, n]) => (
                  <span key={s}><span style={{ color: statusColor[s]?.color }}>{n}</span> {s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={cardStyle} className="mobile-card-compact">
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>Recent Activity</div>
              <span style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock style={{ width: '10px', height: '10px' }} /> Last 30 days
              </span>
            </div>
            <div className="table-responsive-container">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Customer', 'Plot', 'Type', 'Amount', 'Status'].map((h, i) => (
                      <th key={h} style={{ ...thStyle, textAlign: i > 2 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.length > 0 ? recentPayments.map(pay => (
                    <tr key={pay.id}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={tdStyle}><span style={{ fontSize: '0.77rem', fontWeight: 600, color: 'var(--df-text)' }}>{pay.customerId}</span></td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.72rem' }}>{pay.plotId}</td>
                      <td style={{ ...tdStyle, fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>{pay.type}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem' }}>₹{Number(pay.amount).toLocaleString('en-IN')}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', background: pay.status === 'Completed' ? 'rgba(21,128,61,0.1)' : 'rgba(217,119,6,0.1)', color: pay.status === 'Completed' ? 'var(--df-success)' : '#d97706' }}>{pay.status}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--df-text-muted)', padding: '20px' }}>No recent payments.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Project Info */}
        <div style={cardStyle} className="mobile-card-compact">
          <div style={cardHeaderStyle}>
            <div style={cardTitleStyle}>Project Details</div>
          </div>
          <div style={{ padding: '2px 0' }}>
            {[
              { label: 'Developer',   value: project.developer,            icon: Building2 },
              { label: 'Location',    value: project.location,             icon: MapPin },
              { label: 'Type',        value: project.type },
              { label: 'Total Area',  value: project.totalArea || '—' },
              { label: 'Price Range', value: project.priceRange || '—' },
              { label: 'Start Date',  value: formatDate(project.startDate), icon: Calendar },
              { label: 'Completion',  value: formatDate(project.expectedCompletion) },
              { label: 'RERA No.',    value: project.reraNo || '—' },
              { label: 'Status',      value: project.status, pill: true },
              { label: 'Layout',      value: project.layoutUploaded ? 'Uploaded ✓' : 'Not uploaded' },
            ].map(({ label, value, icon: Icon, pill }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--df-border)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span style={{ fontSize: '0.7rem', color: 'var(--df-text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {Icon && <Icon style={{ width: '11px', height: '11px' }} />}
                  {label}
                </span>
                {pill ? (
                  <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'rgba(122,30,58,0.1)', color: 'var(--df-accent)' }}>{value}</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--df-text)', textAlign: 'right', maxWidth: '140px' }}>{value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {!project.layoutUploaded && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: '6px' }}>
          <AlertTriangle style={{ width: '14px', height: '14px', color: '#d97706', flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Layout map not uploaded.</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>Upload in Project Settings to enable the Layout Map view.</span>
        </div>
      )}
    </div>
  );
}
