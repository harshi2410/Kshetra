import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trash2, MapPin, Building2 } from 'lucide-react';
import { thStyle, tdStyle } from '../Dashboard/components/dCardStyles';
import { formatCurrency } from '../../utils/formatters';

export default function ProjectTable({ projects = [], onDelete }) {
  const navigate = useNavigate();

  const getBadgeStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return { background: 'var(--df-success-soft, rgba(22,163,74,0.12))', color: 'var(--df-success, #16a34a)', border: '1px solid rgba(22,163,74,0.25)' };
      case 'completed':
        return { background: 'var(--df-info-soft, rgba(37,99,235,0.12))', color: 'var(--df-info, #3b82f6)', border: '1px solid rgba(37,99,235,0.25)' };
      case 'upcoming':
      case 'planning':
        return { background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' };
      default:
        return { background: 'var(--df-bg)', color: 'var(--df-text-muted)', border: '1px solid var(--df-border)' };
    }
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr>
            <th style={thStyle}>STATUS</th>
            <th style={thStyle}>PROJECT NAME</th>
            <th style={thStyle}>TYPE & LOCATION</th>
            <th style={thStyle}>DEVELOPER</th>
            <th style={thStyle}>TOTAL PLOTS & AREA</th>
            <th style={thStyle}>REVENUE</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const badge = getBadgeStyle(project.status);
            return (
              <tr
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--df-border)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--df-table-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {/* Status */}
                <td style={tdStyle}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '3px 9px',
                      borderRadius: '6px',
                      display: 'inline-block',
                      ...badge,
                    }}
                  >
                    {project.status || 'Active'}
                  </span>
                </td>

                {/* Project Name */}
                <td style={tdStyle}>
                  <div style={{ fontWeight: 700, color: 'var(--df-text)', fontSize: '0.92rem' }}>
                    {project.name}
                  </div>
                </td>

                {/* Type & Location */}
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--df-text)' }}>{project.type || 'Residential'}</span>
                    <span style={{ color: 'var(--df-text-muted)' }}>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--df-text-muted)' }}>
                      <MapPin style={{ width: '13px', height: '13px', color: '#ef4444' }} />
                      {project.location}
                    </span>
                  </div>
                </td>

                {/* Developer */}
                <td style={tdStyle}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: 'var(--df-text-muted)' }}>
                    <Building2 style={{ width: '13px', height: '13px' }} />
                    <span>{project.developer || 'LandOS Developers'}</span>
                  </div>
                </td>

                {/* Total Plots & Area */}
                <td style={tdStyle}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--df-text)' }}>
                    {project.totalPlots > 0
                      ? `${project.totalPlots} Plots`
                      : project.layoutUploaded || project.status === 'LAYOUT_PENDING'
                      ? 'Pending Extraction'
                      : 'Layout Pending'}
                    {project.totalArea ? ` • ${project.totalArea}` : ''}
                  </div>
                </td>

                {/* Revenue */}
                <td style={tdStyle}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--df-text)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {formatCurrency(project.revenue)}
                  </div>
                </td>

                {/* Actions */}
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(project)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--df-border)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: 'var(--df-text-muted)',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Delete Project"
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${project.id}`)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        height: '32px',
                        padding: '0 12px',
                        borderRadius: '6px',
                        background: 'var(--df-accent)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'opacity 0.15s ease'
                      }}
                    >
                      Open <ArrowRight style={{ width: '13px', height: '13px' }} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
