import React from 'react';
import { Plus, LayoutGrid, List } from 'lucide-react';

export default function ProjectToolbar({ onOpenCreateModal, totalProjectsCount = 0, viewMode = 'grid', setViewMode }) {
  return (
    <div className="page-header-container responsive-stack" style={{
      padding: '16px 20px',
      backgroundColor: 'var(--df-card-bg)',
      border: '1px solid var(--df-card-border)',
      borderRadius: '12px',
      boxShadow: 'var(--df-shadow-sm)',
      marginBottom: '12px'
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{
            fontSize: '1.5rem', fontWeight: 800, color: 'var(--df-text)',
            letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2,
            fontFamily: 'var(--font-sans)',
          }}>
            Land Developments & Projects
          </h1>
          <span style={{
            fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px',
            borderRadius: '999px', background: 'var(--df-accent-soft)',
            color: 'var(--df-accent)', border: '1px solid var(--df-accent-medium)'
          }}>
            {totalProjectsCount} Active Sites
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--df-text-muted)', marginTop: '4px', margin: 0 }}>
          Manage intelligent land parcels, automated vector layouts, plot schedules, and sales portfolios.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Grid vs Table View Switcher */}
        {setViewMode && (
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--df-bg)', padding: '3px',
            borderRadius: '8px', border: '1px solid var(--df-border)'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 12px', borderRadius: '6px',
                border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 700,
                background: viewMode === 'grid' ? 'var(--df-accent)' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : 'var(--df-text-muted)',
                transition: 'all 0.15s ease'
              }}
              title="Grid Card View"
            >
              <LayoutGrid style={{ width: '14px', height: '14px' }} /> Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 12px', borderRadius: '6px',
                border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 700,
                background: viewMode === 'table' ? 'var(--df-accent)' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : 'var(--df-text-muted)',
                transition: 'all 0.15s ease'
              }}
              title="Table View"
            >
              <List style={{ width: '14px', height: '14px' }} /> Table
            </button>
          </div>
        )}

        <button
          onClick={onOpenCreateModal}
          className="w-full-on-mobile"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            height: '38px', padding: '0 20px', borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--df-accent) 0%, var(--color-primary-dark, #881337) 100%)',
            color: '#ffffff', border: 'none',
            fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
            boxShadow: 'var(--df-shadow-glow)',
            transition: 'all 0.2s ease',
          }}
        >
          <Plus style={{ width: '16px', height: '16px' }} /> Create New Project
        </button>
      </div>
    </div>
  );
}
