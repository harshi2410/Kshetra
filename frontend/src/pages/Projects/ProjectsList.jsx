import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, Inbox, Map, Grid3x3, TrendingUp, Clock, Percent, Building2 } from 'lucide-react';
import projectService from '../../services/projectService';
import ProjectToolbar from './ProjectToolbar';
import ProjectFilters from './ProjectFilters';
import ProjectTable from './ProjectTable';
import ProjectCard from './ProjectCard';
import ProjectForm from './ProjectForm';
import DeleteProjectModal from './DeleteProjectModal';
import { Loader, EmptyState, Toast, Button } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';

export default function ProjectsList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  const addToast = (variant, title, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, variant, title, message }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load projects on mount
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
      addToast('error', 'Error loading projects', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Extract unique cities list dynamically from projects data
  const citiesList = useMemo(() => {
    const set = new Set();
    projects.forEach((p) => {
      if (p.location) {
        const city = p.location.split(',')[0].trim();
        set.add(city);
      }
    });
    return Array.from(set).sort();
  }, [projects]);

  // Filter & Sort projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        // Search query filter (Name, Location, Developer)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = project.name?.toLowerCase().includes(q);
          const matchLoc = project.location?.toLowerCase().includes(q);
          const matchDev = project.developer?.toLowerCase().includes(q);
          if (!matchName && !matchLoc && !matchDev) return false;
        }

        // Status Filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'Upcoming') {
            if (project.status !== 'Upcoming' && project.status !== 'Planning') return false;
          } else if (project.status?.toLowerCase() !== statusFilter.toLowerCase()) {
            return false;
          }
        }

        // City Filter
        if (cityFilter !== 'ALL') {
          if (!project.location?.toLowerCase().includes(cityFilter.toLowerCase())) {
            return false;
          }
        }

        // Type Filter
        if (typeFilter !== 'ALL') {
          if (project.type?.toLowerCase() !== typeFilter.toLowerCase()) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        }
        if (sortBy === 'revenue') {
          return (b.revenue || 0) - (a.revenue || 0);
        }
        if (sortBy === 'alphabetical') {
          return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
      });
  }, [projects, searchQuery, statusFilter, cityFilter, typeFilter, sortBy]);

  // Handlers
  const handleOpenCreateWizard = () => {
    navigate('/projects/new');
  };

  const handleOpenEditModal = (project) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      setActionLoading(true);
      if (editingProject) {
        const updated = await projectService.updateProject(editingProject.id, formData);
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        addToast('success', 'Project Updated', `"${updated.name}" has been saved.`);
      } else {
        const created = await projectService.createProject(formData);
        setProjects((prev) => [created, ...prev]);
        addToast('success', 'Project Created', `"${created.name}" has been created.`);
      }
      setIsFormOpen(false);
      setEditingProject(null);
    } catch (err) {
      console.error(err);
      addToast('error', 'Action Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProject) return;
    try {
      setActionLoading(true);
      await projectService.deleteProject(deletingProject.id);
      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
      addToast('success', 'Project Deleted', `"${deletingProject.name}" has been removed.`);
      setDeletingProject(null);
    } catch (err) {
      console.error(err);
      addToast('error', 'Delete Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCityFilter('ALL');
    setTypeFilter('ALL');
    setSortBy('newest');
  };

  // Portfolio KPI metrics for KpiBanner
  const portfolioStats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'Active').length;
    const totalPlots = projects.reduce((s, p) => s + (p.totalPlots || 0), 0);
    const soldPlots = projects.reduce((s, p) => s + (p.soldPlots || 0), 0);
    const totalRevenue = projects.reduce((s, p) => s + (p.revenue || 0), 0);
    const occ = totalPlots > 0 ? ((soldPlots / totalPlots) * 100).toFixed(1) : 0;
    return { total, active, totalPlots, soldPlots, totalRevenue, occ };
  }, [projects]);

  const kpis = [
    { label: 'Total Projects', value: portfolioStats.total, icon: Map, color: 'var(--df-accent)' },
    { label: 'Active Sites', value: `${portfolioStats.active} Active`, icon: Clock, color: 'var(--df-success)' },
    { label: 'Plots Sold', value: `${portfolioStats.soldPlots} / ${portfolioStats.totalPlots}`, icon: Grid3x3, color: '#3b82f6' },
    { label: 'Total Revenue', value: formatCurrency(portfolioStats.totalRevenue), icon: TrendingUp, color: '#10b981' },
    { label: 'Occupancy Rate', value: `${portfolioStats.occ}%`, icon: Percent, color: '#f59e0b' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'landos-fade-in 0.2s ease-out' }}>
      
      {/* ── Page Toolbar / Heading ── */}
      <ProjectToolbar
        onOpenCreateModal={handleOpenCreateWizard}
        totalProjectsCount={projects.length}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* ── Row 1: KPI Luxury Metric Cards Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '12px',
      }}>
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div
              key={i}
              style={{
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: 'var(--df-card-bg)',
                border: '1px solid var(--df-card-border)',
                borderRadius: '10px',
                boxShadow: 'var(--df-shadow-xs)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--df-text-muted)',
                  whiteSpace: 'nowrap',
                }}>
                  {k.label}
                </span>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  backgroundColor: 'var(--df-bg)',
                  border: '1px solid var(--df-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon style={{ width: '14px', height: '14px', color: k.color }} />
                </div>
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: 'var(--df-text)',
                fontFamily: 'var(--font-mono, monospace)',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {k.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Row 2: Search & Filter Toolbar ── */}
      <div style={{
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: 'var(--df-shadow-xs)',
      }}>
        <ProjectFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          cityFilter={cityFilter}
          setCityFilter={setCityFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          citiesList={citiesList}
          onReset={handleResetFilters}
        />
      </div>

      {/* ── Row 3: Projects Content (Grid or Table) ── */}
      {loading ? (
        <div style={{
          backgroundColor: 'var(--df-card-bg)',
          border: '1px solid var(--df-card-border)',
          borderRadius: '10px',
          padding: '80px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Loader size="lg" text="Loading Real Estate Projects..." />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--df-card-bg)',
          border: '1px solid var(--df-card-border)',
          borderRadius: '10px',
          padding: '30px',
        }}>
          <EmptyState
            icon={<Inbox style={{ width: '36px', height: '36px', color: 'var(--df-text-muted)' }} />}
            title="No projects found"
            description={
              searchQuery || statusFilter !== 'ALL' || cityFilter !== 'ALL' || typeFilter !== 'ALL'
                ? 'No projects match your active search or filter criteria. Try adjusting or clearing your filters.'
                : 'You have not added any projects yet. Click below to create your first real estate project.'
            }
            action={
              searchQuery || statusFilter !== 'ALL' || cityFilter !== 'ALL' || typeFilter !== 'ALL' ? (
                <Button variant="secondary" onClick={handleResetFilters} size="sm">
                  Clear Filters
                </Button>
              ) : (
                <Button variant="primary" onClick={handleOpenCreateWizard} leftIcon={<FolderPlus style={{ width: '16px', height: '16px' }} />} size="sm">
                  Create First Project
                </Button>
              )
            }
            className="my-4 py-8"
          />
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
        }}>
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleOpenEditModal}
              onDelete={(p) => setDeletingProject(p)}
            />
          ))}
        </div>
      ) : (
        <div style={{
          backgroundColor: 'var(--df-card-bg)',
          border: '1px solid var(--df-card-border)',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: 'var(--df-shadow-xs)',
        }}>
          <ProjectTable
            projects={filteredProjects}
            onDelete={(p) => setDeletingProject(p)}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteProjectModal
        isOpen={Boolean(deletingProject)}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDeleteConfirm}
        project={deletingProject}
        loading={actionLoading}
      />

      {/* Toast Notifications */}
      <Toast.Container position="bottom-right">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            variant={toast.variant}
            title={toast.title}
            message={toast.message}
            onClose={removeToast}
          />
        ))}
      </Toast.Container>
    </div>
  );
}
