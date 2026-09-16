import React, { useEffect, useState, useMemo } from 'react';
import {
  Search, Filter, X, Download, RefreshCw, ArrowUpDown,
  Compass, Layers, CheckCircle2, Tag, Eye, FileSpreadsheet,
  SlidersHorizontal, Check, MapPin, Building2, Award, User
} from 'lucide-react';
import plotService, { normalizePlot } from '../../../../services/plotService';
import projectService from '../../../../services/projectService';
import PlotDrawer from '../components/PlotDrawer';
import { formatCurrency } from '../../../../utils/formatters';
import { cardStyle, cardHeaderStyle, cardTitleStyle, thStyle, tdStyle, linkBtnStyle } from '../../components/dCardStyles';

const STATUS_COLORS = {
  Available: { color: 'var(--df-success)', bg: 'rgba(21,128,61,0.08)', border: 'rgba(21,128,61,0.25)' },
  Reserved:  { color: '#d97706',           bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.25)' },
  Sold:      { color: 'var(--df-accent)',  bg: 'rgba(122,30,58,0.08)',   border: 'rgba(122,30,58,0.25)' },
  Blocked:   { color: '#64748b',           bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)' },
};

export default function PlotsTable({ project }) {
  const [plots, setPlots]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('ALL');
  const [facingFilter, setFacing]     = useState('ALL');
  const [cornerFilter, setCorner]     = useState('ALL');
  const [sortBy, setSortBy]           = useState('plotNo_asc');
  const [drawerPlot, setDrawer]       = useState(null);

  const reload = async () => {
    setIsRefreshing(true);
    try {
      const p = await plotService.getPlotsByProject(project.id);
      setPlots(p || []);
    } catch (err) {
      console.warn('Error reloading plots:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    reload();
  }, [project.id]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    const total = plots.length;
    const totalSqft = plots.reduce((s, p) => s + (p.areaSqft || p.area || 0), 0);
    const totalSqm = plots.reduce((s, p) => s + (p.areaSqm || 0), 0);
    const totalValue = plots.reduce((s, p) => s + (p.price || 0), 0);
    const avgSqft = total > 0 ? Math.round(totalSqft / total) : 0;
    const avgSqm = total > 0 ? (totalSqm / total).toFixed(1) : 0;
    const cornerCount = plots.filter(p => p.isCorner).length;
    const availableCount = plots.filter(p => p.status === 'Available').length;
    const reservedCount = plots.filter(p => p.status === 'Reserved').length;
    const soldCount = plots.filter(p => p.status === 'Sold').length;
    const blockedCount = plots.filter(p => p.status === 'Blocked').length;
    const soldRevenue = plots.filter(p => p.status === 'Sold').reduce((s, p) => s + (p.price || 0), 0);

    return {
      total,
      totalSqft,
      totalSqm: totalSqm || Number((totalSqft * 0.092903).toFixed(1)),
      totalValue,
      avgSqft,
      avgSqm,
      cornerCount,
      availableCount,
      reservedCount,
      soldCount,
      blockedCount,
      soldRevenue
    };
  }, [plots]);

  // Unique Facings list for filter
  const facings = useMemo(() => {
    const set = new Set(plots.map(p => p.facing).filter(Boolean));
    return Array.from(set);
  }, [plots]);

  // Filtering & Sorting
  const filtered = useMemo(() => {
    return plots.filter(p => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q
        || p.plotNo.toLowerCase().includes(q)
        || (p.dimensions && p.dimensions.toLowerCase().includes(q))
        || (p.roadName && p.roadName.toLowerCase().includes(q))
        || (p.facing && p.facing.toLowerCase().includes(q))
        || (plotService.getCustomerName(p.customerId) && plotService.getCustomerName(p.customerId).toLowerCase().includes(q))
        || (plotService.getBrokerName(p.brokerId) && plotService.getBrokerName(p.brokerId).toLowerCase().includes(q));

      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchFacing = facingFilter === 'ALL' || p.facing === facingFilter;
      const matchCorner = cornerFilter === 'ALL'
        || (cornerFilter === 'CORNER' && p.isCorner)
        || (cornerFilter === 'REGULAR' && !p.isCorner);

      return matchSearch && matchStatus && matchFacing && matchCorner;
    }).sort((a, b) => {
      if (sortBy === 'plotNo_asc') {
        return a.plotNo.localeCompare(b.plotNo, undefined, { numeric: true, sensitivity: 'base' });
      }
      if (sortBy === 'plotNo_desc') {
        return b.plotNo.localeCompare(a.plotNo, undefined, { numeric: true, sensitivity: 'base' });
      }
      if (sortBy === 'area_desc') {
        return (b.areaSqft || b.area || 0) - (a.areaSqft || a.area || 0);
      }
      if (sortBy === 'area_asc') {
        return (a.areaSqft || a.area || 0) - (b.areaSqft || b.area || 0);
      }
      if (sortBy === 'price_desc') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortBy === 'price_asc') {
        return (a.price || 0) - (b.price || 0);
      }
      return 0;
    });
  }, [plots, search, statusFilter, facingFilter, cornerFilter, sortBy]);

  const handleSave = async (plotId, updates) => {
    await plotService.updatePlot(plotId, updates, project.id);
    await reload();
    setDrawer(null);
  };

  const handleExportCSV = () => {
    if (!plots || plots.length === 0) return;
    const headers = [
      'Plot No',
      'Area (Sq.Ft)',
      'Area (Sq.M)',
      'Dimensions',
      'Facing Direction',
      'Road / Access Frontage',
      'Is Corner Plot',
      'Estimated Price (INR)',
      'Rate (INR/Sq.Ft)',
      'Status',
      'Assigned Customer',
      'Assigned Broker',
      'Notes'
    ];
    const rows = plots.map(p => [
      `"${p.plotNo}"`,
      p.areaSqft || p.area,
      p.areaSqm,
      `"${p.dimensions}"`,
      `"${p.facing}"`,
      `"${p.roadName}"`,
      p.isCorner ? 'CORNER' : 'REGULAR',
      p.price,
      p.ratePerSqft || (p.areaSqft ? Math.round(p.price / p.areaSqft) : 0),
      `"${p.status}"`,
      `"${plotService.getCustomerName(p.customerId) || ''}"`,
      `"${plotService.getBrokerName(p.brokerId) || ''}"`,
      `"${p.notes || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(project.name || 'Layout').replace(/\s+/g, '_')}_Plot_Inventory.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* KPI Stat Cards Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px'
      }}>
        <div style={{
          background: 'var(--df-card-bg)',
          border: '1px solid var(--df-card-border)',
          borderRadius: '8px',
          padding: '12px 14px',
          boxShadow: 'var(--df-shadow-xs)'
        }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--df-text-muted)', marginBottom: '4px' }}>
            Total Plots Generated
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--df-text)' }}>
              {stats.total}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--df-success)', fontWeight: 700 }}>
              {stats.availableCount} Available
            </span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', marginTop: '4px' }}>
            {stats.reservedCount} reserved • {stats.soldCount} sold
          </div>
        </div>

        <div style={{
          background: 'var(--df-card-bg)',
          border: '1px solid var(--df-card-border)',
          borderRadius: '8px',
          padding: '12px 14px',
          boxShadow: 'var(--df-shadow-xs)'
        }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--df-text-muted)', marginBottom: '4px' }}>
            Total Saleable Area
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--df-text)' }}>
              {stats.totalSqft.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--df-text-muted)', fontWeight: 600 }}>
              sq.ft
            </span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', marginTop: '4px' }}>
            {stats.totalSqm.toLocaleString()} m² layout parcel
          </div>
        </div>

        <div style={{
          background: 'var(--df-card-bg)',
          border: '1px solid var(--df-card-border)',
          borderRadius: '8px',
          padding: '12px 14px',
          boxShadow: 'var(--df-shadow-xs)'
        }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--df-text-muted)', marginBottom: '4px' }}>
            Average Plot Size
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--df-text)' }}>
              {stats.avgSqft.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--df-text-muted)', fontWeight: 600 }}>
              sq.ft ({stats.avgSqm} m²)
            </span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', marginTop: '4px' }}>
            Standard civil residential dimensioning
          </div>
        </div>

        <div style={{
          background: 'var(--df-card-bg)',
          border: '1px solid var(--df-card-border)',
          borderRadius: '8px',
          padding: '12px 14px',
          boxShadow: 'var(--df-shadow-xs)'
        }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--df-text-muted)', marginBottom: '4px' }}>
            Estimated Valuation
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--df-accent)' }}>
              {formatCurrency(stats.totalValue)}
            </span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', marginTop: '4px' }}>
            {stats.cornerCount} corner plots with premium frontage
          </div>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        background: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        padding: '10px 14px'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
          <Search style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            width: '14px', height: '14px', color: 'var(--df-text-muted)', pointerEvents: 'none'
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Plot No (e.g. P-01), Road, Facing, Dimensions…"
            style={{
              width: '100%', height: '34px', paddingLeft: '32px', paddingRight: search ? '30px' : '10px',
              background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px',
              fontSize: '0.78rem', color: 'var(--df-text)', outline: 'none', boxSizing: 'border-box'
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)', padding: 0
              }}
            >
              <X style={{ width: '13px', height: '13px' }} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="horizontal-scroll-tabs" style={{ flexWrap: 'nowrap', padding: '2px 0' }}>
          {['ALL', 'Available', 'Reserved', 'Sold', 'Blocked'].map(s => {
            const count = s === 'ALL' ? stats.total
              : s === 'Available' ? stats.availableCount
              : s === 'Reserved' ? stats.reservedCount
              : s === 'Sold' ? stats.soldCount
              : stats.blockedCount;
            const isAct = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: isAct ? '1px solid var(--df-accent)' : '1px solid var(--df-border)',
                  background: isAct ? 'var(--df-accent)' : 'var(--df-bg)',
                  color: isAct ? '#ffffff' : 'var(--df-text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                {s === 'ALL' ? `All (${stats.total})` : `${s} (${count})`}
              </button>
            );
          })}
        </div>

        {/* Facing Filter */}
        {facings.length > 0 && (
          <select
            value={facingFilter}
            onChange={e => setFacing(e.target.value)}
            style={{
              height: '32px',
              padding: '0 8px',
              borderRadius: '6px',
              border: '1px solid var(--df-border)',
              background: 'var(--df-bg)',
              color: 'var(--df-text)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="ALL">All Facings</option>
            {facings.map(f => (
              <option key={f} value={f}>{f} Facing</option>
            ))}
          </select>
        )}

        {/* Corner Filter */}
        <select
          value={cornerFilter}
          onChange={e => setCorner(e.target.value)}
          style={{
            height: '32px',
            padding: '0 8px',
            borderRadius: '6px',
            border: '1px solid var(--df-border)',
            background: 'var(--df-bg)',
            color: 'var(--df-text)',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="ALL">All Plot Types</option>
          <option value="CORNER">Corner Plots Only ({stats.cornerCount})</option>
          <option value="REGULAR">Standard Plots Only ({stats.total - stats.cornerCount})</option>
        </select>

        {/* Sort selector */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            height: '32px',
            padding: '0 8px',
            borderRadius: '6px',
            border: '1px solid var(--df-border)',
            background: 'var(--df-bg)',
            color: 'var(--df-text)',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="plotNo_asc">Sort: Plot No (P-01 → P-99)</option>
          <option value="plotNo_desc">Sort: Plot No (Descending)</option>
          <option value="area_desc">Sort: Area (Largest First)</option>
          <option value="area_asc">Sort: Area (Smallest First)</option>
          <option value="price_desc">Sort: Price (Highest First)</option>
          <option value="price_asc">Sort: Price (Lowest First)</option>
        </select>

        {/* Right side buttons: Reload & Export CSV */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={reload}
            disabled={isRefreshing}
            title="Refresh plot inventory from backend database"
            style={{
              height: '32px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid var(--df-border)',
              background: 'var(--df-bg)',
              color: 'var(--df-text)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw style={{ width: '12px', height: '12px', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span className="hide-on-mobile">Sync</span>
          </button>

          <button
            onClick={handleExportCSV}
            title="Download full plot schedule as CSV"
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              border: '1px solid rgba(122,30,58,0.2)',
              background: 'var(--df-accent-soft)',
              color: 'var(--df-accent)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Download style={{ width: '12px', height: '12px' }} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Plots Data Table */}
      <div style={cardStyle} className="mobile-card-compact">
        <div style={{ ...cardHeaderStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={cardTitleStyle}>
              Layout Plot Inventory — {project.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
              Showing {filtered.length} of {plots.length} layout plots with full dimensional & valuation attributes
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'rgba(21,128,61,0.08)',
              color: 'var(--df-success)',
              border: '1px solid rgba(21,128,61,0.2)'
            }}>
              <CheckCircle2 style={{ width: '12px', height: '12px' }} /> Live DB Sync
            </span>
          </div>
        </div>

        <div className="table-responsive-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--df-bg)' }}>
                <th style={{ ...thStyle, width: '110px' }}>Plot No</th>
                <th style={thStyle}>Dimensions</th>
                <th style={thStyle}>Plot Size (Area)</th>
                <th style={thStyle}>Facing Direction</th>
                <th style={thStyle}>Access Road Frontage</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Valuation / Price</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                <th style={thStyle}>Customer / Booking</th>
                <th style={thStyle}>Channel Partner</th>
                <th style={{ ...thStyle, textAlign: 'right', width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: 'var(--df-text-muted)', padding: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                      <span>Loading layout plots from database…</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: 'var(--df-text-muted)', padding: '36px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--df-text)' }}>No plots match the selected criteria</div>
                    <div style={{ fontSize: '0.72rem', marginTop: '4px' }}>Try resetting your filters or search terms.</div>
                  </td>
                </tr>
              ) : (
                filtered.map((plot) => {
                  const sc = STATUS_COLORS[plot.status] || STATUS_COLORS.Available;
                  const customer = plotService.getCustomerName(plot.customerId);
                  const broker = plotService.getBrokerName(plot.brokerId);

                  return (
                    <tr
                      key={plot.id}
                      onClick={() => setDrawer(plot)}
                      style={{
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--df-border)',
                        transition: 'background-color 0.12s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Plot No & Corner Badge */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.86rem',
                            color: 'var(--df-text)',
                            background: 'var(--df-card-bg)',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            border: '1px solid var(--df-border)'
                          }}>
                            {plot.plotNo}
                          </span>
                          {plot.isCorner && (
                            <span style={{
                              fontSize: '0.58rem',
                              padding: '1px 5px',
                              background: 'rgba(122,30,58,0.1)',
                              color: 'var(--df-accent)',
                              border: '1px solid rgba(122,30,58,0.25)',
                              borderRadius: '3px',
                              fontWeight: 800,
                              letterSpacing: '0.03em'
                            }}>
                              CORNER
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Dimensions: Full Value */}
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--df-text)', fontFamily: 'monospace' }}>
                          {plot.dimensions}
                        </div>
                        <div style={{ fontSize: '0.67rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>
                          Standard Civil Parcel
                        </div>
                      </td>

                      {/* Plot Size (Area): Full Value dual units */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--df-text)', fontFamily: 'monospace' }}>
                            {plot.areaSqft ? plot.areaSqft.toLocaleString() : plot.area}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--df-text-muted)', fontWeight: 600 }}>
                            sq.ft
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 600, marginTop: '1px' }}>
                          {plot.areaSqm ? `${plot.areaSqm} m²` : `${Math.round((plot.areaSqft || plot.area) * 0.0929)} m²`}
                        </div>
                      </td>

                      {/* Facing Direction */}
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: 'var(--df-bg)',
                          border: '1px solid var(--df-border)',
                          color: 'var(--df-text)'
                        }}>
                          <Compass style={{ width: '12px', height: '12px', color: 'var(--df-accent)' }} />
                          {plot.facing}
                        </span>
                      </td>

                      {/* Road / Access Frontage */}
                      <td style={tdStyle}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--df-text)' }}>
                          {plot.roadName}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>
                          Maharashtra UDCPR Compliant
                        </div>
                      </td>

                      {/* Valuation / Price & Rate */}
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--df-text)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          {formatCurrency(plot.price)}
                        </div>
                        <div style={{ fontSize: '0.67rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>
                          ₹{(plot.ratePerSqft || (plot.areaSqft ? Math.round(plot.price / plot.areaSqft) : 2500)).toLocaleString()}/sq.ft
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: sc.color,
                          background: sc.bg,
                          border: `1px solid ${sc.border}`,
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}>
                          {plot.status}
                        </span>
                      </td>

                      {/* Customer */}
                      <td style={tdStyle}>
                        {customer ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--df-text)' }}>
                            <User style={{ width: '12px', height: '12px', color: 'var(--df-accent)' }} />
                            <span>{customer}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>— Unassigned —</span>
                        )}
                      </td>

                      {/* Broker */}
                      <td style={tdStyle}>
                        {broker ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--df-text)' }}>
                            <Award style={{ width: '12px', height: '12px', color: '#d97706' }} />
                            <span>{broker}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawer(plot);
                          }}
                          style={{
                            ...linkBtnStyle,
                            padding: '4px 8px',
                            background: 'var(--df-bg)',
                            border: '1px solid var(--df-border)',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700
                          }}
                        >
                          Details →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderTop: '1px solid var(--df-border)',
          background: 'var(--df-card-bg)',
          fontSize: '0.72rem',
          color: 'var(--df-text-muted)',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            Showing <strong>{filtered.length}</strong> of <strong>{plots.length}</strong> plots in master inventory
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>Available: <strong style={{ color: 'var(--df-success)' }}>{stats.availableCount}</strong></span>
            <span>Reserved: <strong style={{ color: '#d97706' }}>{stats.reservedCount}</strong></span>
            <span>Sold: <strong style={{ color: 'var(--df-accent)' }}>{stats.soldCount}</strong></span>
            <span>Blocked: <strong>{stats.blockedCount}</strong></span>
          </div>
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
