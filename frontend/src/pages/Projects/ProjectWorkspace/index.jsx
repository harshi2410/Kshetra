import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { MapPin, Building2, LayoutGrid, Map, TableProperties, Users, Award, CreditCard, FileText, PieChart, Settings } from 'lucide-react';
import projectService from '../../../services/projectService';
import { Badge, Loader, Button } from '../../../components/ui';

// Lazy-import tabs to keep bundle small
import Overview        from './tabs/Overview';
import LayoutMap       from './tabs/LayoutMap';
import PlotsTable      from './tabs/PlotsTable';
import ProjectCustomers from './tabs/ProjectCustomers';
import ProjectBrokers  from './tabs/ProjectBrokers';
import ProjectPayments from './tabs/ProjectPayments';
import ProjectDocuments from './tabs/ProjectDocuments';
import ProjectAnalytics from './tabs/ProjectAnalytics';
import ProjectSettings from './tabs/ProjectSettings';

const TABS = [
  { id: 'overview',   label: 'Overview',   path: '',           icon: LayoutGrid },
  { id: 'layout',     label: 'Layout Map', path: '/layout',    icon: Map },
  { id: 'plots',      label: 'Plots',      path: '/plots',     icon: TableProperties },
  { id: 'customers',  label: 'Customers',  path: '/customers', icon: Users },
  { id: 'brokers',    label: 'Brokers',    path: '/brokers',   icon: Award },
  { id: 'payments',   label: 'Payments',   path: '/payments',  icon: CreditCard },
  { id: 'documents',  label: 'Documents',  path: '/documents', icon: FileText },
  { id: 'analytics',  label: 'Analytics',  path: '/analytics', icon: PieChart },
  { id: 'settings',   label: 'Settings',   path: '/settings',  icon: Settings },
];

const STATUS_BADGE = {
  Active:    'success',
  Upcoming:  'info',
  Completed: 'default',
  'On Hold': 'warning',
};

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const navigate      = useNavigate();
  const location      = useLocation();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await projectService.getProjectById(projectId);
      setProject(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProject(); }, [projectId]);

  // Determine active tab from URL suffix
  const suffix = location.pathname.replace(`/projects/${projectId}`, '') || '';
  const activeTab = TABS.find(t => t.path === suffix && t.path !== '') || TABS[0];

  const handleOpenPlot = (plot) => navigate(`/projects/${projectId}/plots`);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
      <Loader size="lg" text="Loading project…" />
    </div>
  );

  if (!project) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--df-text)', marginBottom: '8px' }}>Project not found</div>
      <Button variant="primary" size="sm" onClick={() => navigate('/projects')}>← Back to Projects</Button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', animation: 'landos-fade-in 0.2s ease-out' }}>

      {/* Clean Header Banner */}
      <div className="page-header-container responsive-stack" style={{
        padding: '14px 18px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        boxShadow: 'var(--df-shadow-xs)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--df-text)', margin: 0, lineHeight: 1.2 }}>
              {project.name}
            </h1>
            <Badge variant={STATUS_BADGE[project.status] || 'default'}>{project.status}</Badge>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--df-text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <MapPin style={{ width: '12px', height: '12px', color: 'var(--df-accent)' }} /> {project.location}
            </span>
            <span>•</span>
            <span>{project.type}</span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Building2 style={{ width: '12px', height: '12px' }} /> {project.developer || 'LandOS Developers'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--df-accent)', background: 'var(--df-accent-soft)', padding: '5px 12px', borderRadius: '5px', border: '1px solid rgba(122,30,58,0.15)' }}>
            {activeTab.label} View
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable Tabs Bar for Fast Navigation */}
      <div className="horizontal-scroll-tabs" style={{
        padding: '6px',
        background: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
      }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.id === activeTab.id;
          return (
            <Link
              key={t.id}
              to={`/projects/${projectId}${t.path}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '5px',
                fontSize: '0.75rem',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? '#ffffff' : 'var(--df-text-soft)',
                backgroundColor: isActive ? 'var(--df-accent)' : 'transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon style={{ width: '13px', height: '13px' }} />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Active Tab Content Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab.id === 'overview'   && <Overview         project={project} />}
        {activeTab.id === 'layout'     && <LayoutMap         project={project} onOpenPlot={handleOpenPlot} />}
        {activeTab.id === 'plots'      && <PlotsTable        project={project} />}
        {activeTab.id === 'customers'  && <ProjectCustomers  project={project} />}
        {activeTab.id === 'brokers'    && <ProjectBrokers    project={project} />}
        {activeTab.id === 'payments'   && <ProjectPayments   project={project} />}
        {activeTab.id === 'documents'  && <ProjectDocuments  project={project} />}
        {activeTab.id === 'analytics'  && <ProjectAnalytics  project={project} />}
        {activeTab.id === 'settings'   && <ProjectSettings   project={project} onUpdated={loadProject} />}
      </div>
    </div>
  );
}
