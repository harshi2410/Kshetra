import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ExternalLink } from 'lucide-react';
import { cardStyle, cardHeaderStyle, cardTitleStyle, thStyle, tdStyle, linkBtnStyle } from './dCardStyles';

const statusColor = (s) => {
  if (s === 'Active')   return { color: 'var(--df-success)', bg: 'var(--df-success-soft)' };
  if (s === 'Planning') return { color: '#d97706',           bg: 'rgba(217,119,6,0.08)' };
  return                       { color: 'var(--df-text-muted)', bg: 'var(--df-bg)' };
};

export default function ActiveProjectsTable({ projects }) {
  const navigate = useNavigate();
  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div>
          <div style={cardTitleStyle}>Active Real Estate Projects</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>
            Layout development progress and plot sales status
          </div>
        </div>
        <button style={linkBtnStyle} onClick={() => navigate('/projects')}>View All →</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Project', 'Location', 'Sales Progress', 'Plots', 'Price Range', 'Status', ''].map((h, i) => (
                <th key={i} style={{ ...thStyle, textAlign: i === 6 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects?.length > 0 ? projects.map((p) => {
              const sold = p.soldPlots || 0;
              const total = p.totalPlots || 1;
              const pct = Math.round((sold / total) * 100);
              const sc = statusColor(p.status);
              return (
                <tr key={p.id}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: 'var(--df-text)', fontSize: '0.8rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>{p.type || 'Residential'}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--df-text-soft)' }}>
                      <MapPin style={{ width: '11px', height: '11px', flexShrink: 0, color: 'var(--df-text-muted)' }} />
                      <span style={{ fontSize: '0.75rem' }}>{p.location}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ width: '120px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                        <span>Progress</span>
                        <span style={{ fontWeight: 700, color: 'var(--df-text)', fontFamily: 'var(--font-mono)' }}>{pct}%</span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: 'var(--df-border)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: 'var(--df-accent)', borderRadius: '9999px', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    <span style={{ color: 'var(--df-accent)' }}>{sold}</span>
                    <span style={{ color: 'var(--df-text-muted)', fontWeight: 400 }}> / {total}</span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{p.priceRange}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '2px 7px', borderRadius: '4px',
                      fontSize: '0.6rem', fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      color: sc.color, backgroundColor: sc.bg,
                    }}>{p.status}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button
                      onClick={() => navigate(`/projects/${p.id}`)}
                      style={{ ...linkBtnStyle, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      Open <ExternalLink style={{ width: '11px', height: '11px' }} />
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--df-text-muted)', padding: '20px' }}>No projects found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
