import React, { useEffect, useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import plotService from '../../../../services/plotService';
import PlotDrawer from '../components/PlotDrawer';
import { formatCurrency } from '../../../../utils/formatters';
import { cardStyle, cardHeaderStyle, cardTitleStyle, thStyle, tdStyle, linkBtnStyle } from '../../components/dCardStyles';

const STATUS_COLORS = {
  Available: { color: 'var(--df-success)', bg: 'rgba(21,128,61,0.08)' },
  Reserved:  { color: '#d97706',           bg: 'rgba(217,119,6,0.08)' },
  Sold:      { color: 'var(--df-accent)',  bg: 'rgba(122,30,58,0.08)' },
  Blocked:   { color: '#64748b',           bg: 'rgba(100,116,139,0.08)' },
};

export default function PlotsTable({ project }) {
  const [plots, setPlots]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('ALL');
  const [drawerPlot, setDrawer]   = useState(null);

  const reload = () => plotService.getPlotsByProject(project.id).then(p => { setPlots(p); setLoading(false); });

  useEffect(() => { reload(); }, [project.id]);

  const filtered = plots.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.plotNo.toLowerCase().includes(q)
      || plotService.getCustomerName(p.customerId)?.toLowerCase().includes(q)
      || plotService.getBrokerName(p.brokerId)?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async (plotId, updates) => {
    await plotService.updatePlot(plotId, updates);
    await reload();
    setDrawer(null);
  };

  const counts = plots.reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {});

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
          <Search style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: 'var(--df-text-muted)', pointerEvents: 'none' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search plot no., customer, broker…"
            style={{ width: '100%', height: '34px', paddingLeft: '30px', paddingRight: search ? '30px' : '10px', background: 'var(--df-card-bg)', border: '1px solid var(--df-border)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--df-text)', outline: 'none', boxSizing: 'border-box' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)', padding: 0 }}><X style={{ width: '12px', height: '12px' }} /></button>}
        </div>

        {/* Status filters */}
        <div className="horizontal-scroll-tabs" style={{ flexWrap: 'nowrap', padding: '2px 0' }}>
          {['ALL', 'Available', 'Reserved', 'Sold', 'Blocked'].map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{
              height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid var(--df-border)',
              background: statusFilter === s ? 'var(--df-accent)' : 'var(--df-card-bg)',
              color: statusFilter === s ? '#fff' : 'var(--df-text-muted)',
              fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
            }}>
              {s === 'ALL' ? 'All' : `${s} (${counts[s] || 0})`}
            </button>
          ))}
        </div>

        <div className="hide-on-mobile" style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--df-text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} of {plots.length} plots
        </div>
      </div>

      {/* Table */}
      <div style={cardStyle} className="mobile-card-compact">
        <div style={cardHeaderStyle}>
          <div style={cardTitleStyle}>All Plots — {project.name}</div>
          <span className="show-on-mobile" style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>
            {filtered.length}/{plots.length} plots
          </span>
        </div>
        <div className="table-responsive-container">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Plot No', 'Area', 'Facing', 'Price', 'Status', 'Customer', 'Broker', 'Corner', ''].map((h, i) => (
                  <th key={h} style={{ ...thStyle, textAlign: [3, 4, 7, 8].includes(i) ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: 'var(--df-text-muted)', padding: '28px' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: 'var(--df-text-muted)', padding: '28px' }}>No plots match your filters.</td></tr>
              ) : filtered.map(plot => {
                const sc = STATUS_COLORS[plot.status] || STATUS_COLORS.Available;
                const customer = plotService.getCustomerName(plot.customerId);
                const broker   = plotService.getBrokerName(plot.brokerId);
                return (
                  <tr key={plot.id}
                    onClick={() => setDrawer(plot)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.8rem', color: 'var(--df-text)' }}>{plot.plotNo}</span>{plot.isCorner && <span style={{ marginLeft: '5px', fontSize: '0.55rem', padding: '1px 4px', background: 'rgba(122,30,58,0.08)', color: 'var(--df-accent)', borderRadius: '3px', fontWeight: 700 }}>CORNER</span>}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--df-text-soft)' }}>{plot.area} sq.ft</td>
                    <td style={{ ...tdStyle, fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>{plot.facing}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: 'var(--df-text)', whiteSpace: 'nowrap' }}>{formatCurrency(plot.price)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: sc.color, background: sc.bg, whiteSpace: 'nowrap' }}>{plot.status}</span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: '0.75rem', color: customer ? 'var(--df-text)' : 'var(--df-text-muted)' }}>{customer || '—'}</td>
                    <td style={{ ...tdStyle, fontSize: '0.75rem', color: broker ? 'var(--df-text)' : 'var(--df-text-muted)' }}>{broker || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontSize: '0.7rem', color: 'var(--df-text-muted)' }}>{plot.isCorner ? '✓' : ''}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button onClick={e => { e.stopPropagation(); setDrawer(plot); }} style={linkBtnStyle}>Edit →</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plot Drawer */}
      {drawerPlot && (
        <PlotDrawer
          plot={drawerPlot}
          onClose={() => setDrawer(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
