import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  ArrowRight, 
  Pencil, 
  Trash2,
  TrendingUp,
  Layers
} from 'lucide-react';
import { Button, Badge } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';

export default function ProjectCard({ project, onEdit, onDelete }) {
  const navigate = useNavigate();

  const totalPlots = project.totalPlots || 0;
  const soldPlots = project.soldPlots || 0;
  const availablePlots = project.availablePlots ?? Math.max(0, totalPlots - soldPlots);
  const progressPercent = totalPlots > 0 ? Math.min(100, Math.round((soldPlots / totalPlots) * 100)) : 0;

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'completed':
        return 'info';
      case 'upcoming':
      case 'planning':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group animate-landos-fade"
      style={{
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '12px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        minHeight: '270px',
        boxShadow: 'var(--df-shadow-sm)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--df-accent)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--df-shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--df-card-border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--df-shadow-sm)';
      }}
    >
      <div>
        {/* Top Header Row: Status Badge & Project Type */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
          <Badge variant={getStatusVariant(project.status)}>
            {project.status || 'Active'}
          </Badge>
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
            backgroundColor: 'var(--df-bg)', border: '1px solid var(--df-border)', color: 'var(--df-text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.04em'
          }}>
            {project.type || 'Residential'}
          </span>
        </div>

        {/* Project Title */}
        <h3 style={{
          fontSize: '1.05rem', fontWeight: 800, color: 'var(--df-text)',
          marginBottom: '6px', lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {project.name}
        </h3>

        {/* Location & Developer Metadata */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--df-text-muted)', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <MapPin style={{ width: '13px', height: '13px', color: '#ef4444', flexShrink: 0 }} />
            <span>{project.location}</span>
          </span>
          {project.developer && (
            <>
              <span style={{ opacity: 0.4 }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Building2 style={{ width: '13px', height: '13px', flexShrink: 0 }} />
                <span>{project.developer}</span>
              </span>
            </>
          )}
        </div>

        {/* Portfolio Stats Strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
          padding: '10px 12px', marginBottom: '14px', borderRadius: '8px',
          backgroundColor: 'var(--df-bg)', border: '1px solid var(--df-border)'
        }}>
          <div>
            <div style={{ fontSize: '10px', uppercase: true, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--df-text-muted)', textTransform: 'uppercase' }}>
              Revenue
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--df-text)', marginTop: '2px', fontFamily: 'var(--font-mono, monospace)' }}>
              {formatCurrency(project.revenue)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', uppercase: true, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--df-text-muted)', textTransform: 'uppercase' }}>
              Plots Available
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--df-text)', marginTop: '2px' }}>
              {totalPlots > 0 ? (
                <>{availablePlots} <span style={{ fontWeight: 500, color: 'var(--df-text-muted)', fontSize: '11px' }}>/ {totalPlots}</span></>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--df-accent)', fontWeight: 700 }}>
                  {project.layoutUploaded || project.status === 'LAYOUT_PENDING' ? 'Processing' : 'Pending Upload'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Plot Sales Progress Bar */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--df-text-muted)', fontWeight: 600 }}>Sales Progress</span>
            <span style={{ fontWeight: 800, color: 'var(--df-text)' }}>
              {totalPlots > 0 ? `${soldPlots}/${totalPlots} (${progressPercent}%)` : (project.layoutUploaded || project.status === 'LAYOUT_PENDING' ? 'AI Processing' : 'Blueprint Pending')}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', borderRadius: '999px', backgroundColor: 'var(--df-border)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: '999px',
                transition: 'width 0.5s ease',
                width: `${totalPlots > 0 ? progressPercent : 0}%`,
                background: progressPercent === 100 ? '#10B981' : 'linear-gradient(90deg, var(--df-accent), #f43f5e)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer: Quick Spec & Actions */}
      <div style={{ paddingTop: '12px', borderTop: '1px solid var(--df-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: 'auto' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--df-text-muted)' }}>
          {project.totalArea || 'Acres'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(project)}
              style={{
                padding: '6px', borderRadius: '6px', background: 'transparent',
                border: '1px solid var(--df-border)', cursor: 'pointer', color: 'var(--df-text-muted)'
              }}
              title="Delete Project"
            >
              <Trash2 style={{ width: '14px', height: '14px' }} />
            </button>
          )}
          <Button
            size="sm"
            variant="primary"
            onClick={handleCardClick}
            rightIcon={<ArrowRight style={{ width: '12px', height: '12px' }} />}
            style={{ fontSize: '12px', fontWeight: 700, padding: '5px 14px', borderRadius: '6px' }}
          >
            Open Workspace
          </Button>
        </div>
      </div>
    </div>
  );
}
