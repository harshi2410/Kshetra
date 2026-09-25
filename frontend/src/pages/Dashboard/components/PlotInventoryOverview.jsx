import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, MapPin, ArrowRight, CheckCircle2, Grid3x3 } from 'lucide-react';
import { cardStyle, cardHeaderStyle, cardTitleStyle, linkBtnStyle } from './dCardStyles';

export default function PlotInventoryOverview({ projects }) {
  const navigate = useNavigate();
  const rows = projects?.slice(0, 4) || [];

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div>
          <div style={cardTitleStyle}>Plot Inventory & Development</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>
            Live plot allocation & 2D layout status across projects
          </div>
        </div>
        <button style={linkBtnStyle} onClick={() => navigate('/projects')}>View All Projects →</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rows.length > 0 ? rows.map((p) => {
          const total = p.totalPlots || 100;
          const sold = p.soldPlots || 0;
          const available = Math.max(0, total - sold);
          const percentSold = Math.round((sold / total) * 100) || 0;

          return (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}/layout`)}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--df-bg)',
                border: '1px solid var(--df-border)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--df-accent)';
                e.currentTarget.style.background = 'var(--df-accent-soft)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--df-border)';
                e.currentTarget.style.background = 'var(--df-bg)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--df-text)' }}>
                    {p.name}
                  </span>
                  <span style={{
                    fontSize: '0.6rem',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'var(--df-accent-soft)',
                    color: 'var(--df-accent)',
                    fontWeight: 700,
                  }}>
                    {p.type || 'Residential'}
                  </span>
                </div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--df-text)', fontFamily: 'var(--font-mono)' }}>
                  {sold}/{total} Sold ({percentSold}%)
                </span>
              </div>

              {/* Progress Bar with Two-Color Theme (Red Sold, Green Available) */}
              <div style={{
                height: '6px',
                width: '100%',
                borderRadius: '3px',
                background: 'rgba(34, 197, 94, 0.25)',
                overflow: 'hidden',
                display: 'flex',
                marginBottom: '6px'
              }}>
                <div style={{
                  width: `${percentSold}%`,
                  height: '100%',
                  background: '#ef4444',
                  borderRadius: '3px 0 0 3px',
                  transition: 'width 0.3s ease'
                }} />
                <div style={{
                  width: `${100 - percentSold}%`,
                  height: '100%',
                  background: '#22c55e',
                  borderRadius: '0 3px 3px 0',
                  transition: 'width 0.3s ease'
                }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--df-text-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin style={{ width: '10px', height: '10px' }} /> {p.location}
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>● {available} Available</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>● {sold} Sold</span>
                </div>
              </div>
            </div>
          );
        }) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--df-text-muted)', fontSize: '0.75rem' }}>
            No project data available.
          </div>
        )}
      </div>
    </div>
  );
}
