import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, Users, UserCheck, CreditCard,
  Files, BarChart3, Settings, Menu, X, Search, Bell,
  Sun, Moon, ChevronDown, User, LogOut, ChevronRight,
  ArrowLeft, TableProperties, Award, FileText, PieChart, LayoutGrid,
  Building2, MapPin, Layers, ShieldCheck
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import useAuth from '../auth/useAuth';
import projectService from '../services/projectService';

/* ─── Global Nav structure ─── */
const GLOBAL_NAV_SECTIONS = [
  {
    heading: 'Management',
    items: [
      { name: 'Overview',   path: '/dashboard',  icon: LayoutDashboard },
      { name: 'Projects',   path: '/projects',   icon: Map },
      { name: 'Customers',  path: '/customers',  icon: Users },
      { name: 'Brokers',    path: '/brokers',    icon: UserCheck },
      { name: 'Payments',   path: '/payments',   icon: CreditCard },
      { name: 'Documents',  path: '/documents',  icon: Files },
    ],
  },
  {
    heading: 'Analytics',
    items: [
      { name: 'Analytics',  path: '/analytics',  icon: BarChart3 },
    ],
  },
  {
    heading: 'System',
    items: [
      { name: 'Settings',   path: '/settings',   icon: Settings },
    ],
  },
];

/* ─── Create Project Navigation Sections ─── */
const CREATE_PROJECT_NAV_SECTIONS = [
  {
    heading: 'Setup Wizard Steps',
    items: [
      { name: '1. Identity & Type',   path: '/projects/new?step=0', stepIndex: 0, icon: Building2 },
      { name: '2. Location & Survey', path: '/projects/new?step=1', stepIndex: 1, icon: MapPin },
      { name: '3. Land & Commercial', path: '/projects/new?step=2', stepIndex: 2, icon: Layers },
      { name: '4. Master Layout',     path: '/projects/new?step=3', stepIndex: 3, icon: FileText },
      { name: '5. Review & Create',   path: '/projects/new?step=4', stepIndex: 4, icon: ShieldCheck },
    ],
  },
];

const ALL_ITEMS = GLOBAL_NAV_SECTIONS.flatMap(s => s.items);

export default function ContentLayout() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeProject, setActiveProject] = useState(null);

  // Check if current URL is inside a specific project or create project wizard
  const isCreateProject = location.pathname.startsWith('/projects/new');
  const projectMatch = location.pathname.match(/^\/projects\/([^\/]+)/);
  const currentProjectId = projectMatch && projectMatch[1] !== 'new' ? projectMatch[1] : null;

  const queryStep = parseInt(new URLSearchParams(location.search).get('step') || '0', 10);
  const stepTitles = [
    'Identity & Type',
    'Location & Survey',
    'Land & Commercial',
    'Master Layout',
    'Review & Create'
  ];

  useEffect(() => {
    if (currentProjectId) {
      projectService.getProjectById(currentProjectId)
        .then(p => setActiveProject(p))
        .catch(() => setActiveProject(null));
    } else {
      setActiveProject(null);
    }
  }, [currentProjectId]);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return 'SA';
    const p = name.trim().split(' ');
    return p.length >= 2 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getFirstName = (name) => (name ? name.split(' ')[0] : 'Shivam');

  const currentPage = isCreateProject
    ? `Create Project: ${stepTitles[queryStep] || 'Identity & Type'}`
    : currentProjectId
    ? (activeProject?.name || 'Project Workspace')
    : (ALL_ITEMS.find(i => location.pathname.startsWith(i.path))?.name || 'Overview');

  /* ─── Project Navigation Sections ─── */
  const PROJECT_NAV_SECTIONS = currentProjectId ? [
    {
      heading: 'Management',
      items: [
        { name: 'Overview',   path: `/projects/${currentProjectId}`,          exact: true, icon: LayoutGrid },
        { name: 'Layout Map', path: `/projects/${currentProjectId}/layout`,     icon: Map },
        { name: 'Plots',      path: `/projects/${currentProjectId}/plots`,      icon: TableProperties },
      ],
    },
    {
      heading: 'Records',
      items: [
        { name: 'Customers',  path: `/projects/${currentProjectId}/customers`, icon: Users },
        { name: 'Brokers',    path: `/projects/${currentProjectId}/brokers`,   icon: Award },
        { name: 'Payments',   path: `/projects/${currentProjectId}/payments`,  icon: CreditCard },
        { name: 'Documents',  path: `/projects/${currentProjectId}/documents`, icon: FileText },
      ],
    },
    {
      heading: 'Insights',
      items: [
        { name: 'Analytics',  path: `/projects/${currentProjectId}/analytics`, icon: PieChart },
        { name: 'Settings',   path: `/projects/${currentProjectId}/settings`,  icon: Settings },
      ],
    },
  ] : [];

  /* ─── Sidebar inner content ─── */
  const SidebarNav = ({ onClose }) => {
    const navSections = isCreateProject
      ? CREATE_PROJECT_NAV_SECTIONS
      : currentProjectId
      ? PROJECT_NAV_SECTIONS
      : GLOBAL_NAV_SECTIONS;

    return (
      <nav style={{ padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 0, flex: 1, overflowY: 'auto' }}>
        
        {/* Create Project Header inside Sidebar */}
        {isCreateProject && (
          <div style={{
            padding: '8px 10px 12px',
            borderBottom: '1px solid var(--df-border)',
            marginBottom: '12px',
            background: 'var(--df-card-bg)',
            borderRadius: '6px',
            border: '1px solid var(--df-card-border)',
          }}>
            <Link
              to="/projects"
              onClick={onClose}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontSize: '11px', fontWeight: 600, color: 'var(--df-accent)',
                textDecoration: 'none', marginBottom: '6px',
              }}
            >
              <ArrowLeft style={{ width: '12px', height: '12px' }} /> All Projects
            </Link>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--df-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Create New Project
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--df-text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              5-Step Setup Wizard
            </div>
          </div>
        )}

        {/* Project Header inside Sidebar when inside a Project Workspace */}
        {currentProjectId && (
          <div style={{
            padding: '8px 10px 12px',
            borderBottom: '1px solid var(--df-border)',
            marginBottom: '12px',
            background: 'var(--df-card-bg)',
            borderRadius: '6px',
            border: '1px solid var(--df-card-border)',
          }}>
            <Link
              to="/projects"
              onClick={onClose}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontSize: '11px', fontWeight: 600, color: 'var(--df-accent)',
                textDecoration: 'none', marginBottom: '6px',
              }}
            >
              <ArrowLeft style={{ width: '12px', height: '12px' }} /> All Projects
            </Link>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--df-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeProject?.name || `Project Workspace`}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--df-text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeProject?.location || 'LandOS Workspace'}
            </div>
          </div>
        )}

        {navSections.map((section, si) => (
          <div key={si} style={{ marginBottom: si < navSections.length - 1 ? '16px' : 0 }}>
            {/* Section heading */}
            <div style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--df-text-muted)',
              opacity: 0.55, padding: '0 8px', marginBottom: '4px'
            }}>
              {section.heading}
            </div>

            {/* Nav items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isExactActive = isCreateProject
                  ? queryStep === item.stepIndex
                  : item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);

                const isCompleted = isCreateProject && item.stepIndex < queryStep;

                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={onClose}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: isExactActive ? 700 : 500,
                      color: isExactActive ? 'var(--df-accent)' : 'var(--df-text-soft)',
                      backgroundColor: isExactActive ? 'var(--df-accent-soft)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'background-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isExactActive) {
                        e.currentTarget.style.backgroundColor = 'var(--df-sidebar-hover)';
                        e.currentTarget.style.color = 'var(--df-strong)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = isExactActive ? 'var(--df-accent-soft)' : 'transparent';
                      e.currentTarget.style.color = isExactActive ? 'var(--df-accent)' : 'var(--df-text-soft)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon style={{ width: '14px', height: '14px', flexShrink: 0, strokeWidth: isExactActive ? 2.2 : 1.75 }} />
                      <span>{item.name}</span>
                    </div>
                    {isCompleted && (
                      <span style={{ 
                        width: '15px', height: '15px', borderRadius: '50%', 
                        backgroundColor: 'var(--df-success)', color: '#fff', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', fontWeight: 800, flexShrink: 0 
                      }}>
                        ✓
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* Divider between sections */}
            {si < navSections.length - 1 && (
              <div style={{ height: '1px', background: 'var(--df-border)', margin: '10px 8px 0' }} />
            )}
          </div>
        ))}
      </nav>
    );
  };

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--df-bg)', color: 'var(--df-text)', fontFamily: 'var(--font-sans)' }}>

      {/* TOP NAVBAR */}
      <header className="mobile-header-bar" style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 'var(--df-navbar-height)',
        backgroundColor: 'var(--df-nav-bg)',
        borderBottom: '1px solid var(--df-border)',
        zIndex: 'var(--z-header)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        gap: '10px',
      }}>

        {/* Mobile Hamburger Button */}
        <button
          className="hide-on-desktop"
          onClick={() => setIsMobileOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px', background: 'var(--df-bg)',
            border: '1px solid var(--df-border)', cursor: 'pointer', color: 'var(--df-text)',
            borderRadius: '6px', flexShrink: 0
          }}
          aria-label="Open Navigation Menu"
        >
          <Menu style={{ width: '18px', height: '18px' }} />
        </button>

        {/* Brand */}
        <Link
          to="/dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: '2px',
            textDecoration: 'none', flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--df-text)' }}>
            Land
          </span>
          <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--df-accent)' }}>
            OS
          </span>
        </Link>

        {/* Breadcrumb (Visible on Tablet/Desktop) */}
        <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--df-text-muted)', flexShrink: 0 }}>
          <span style={{ opacity: 0.4 }}>|</span>
          <Link to="/dashboard" style={{ color: 'var(--df-text-muted)', textDecoration: 'none' }}>Dashboard</Link>
          <ChevronRight style={{ width: '12px', height: '12px' }} />
          {currentProjectId && (
            <>
              <Link to="/projects" style={{ color: 'var(--df-text-muted)', textDecoration: 'none' }}>Projects</Link>
              <ChevronRight style={{ width: '12px', height: '12px' }} />
            </>
          )}
          <span style={{ color: 'var(--df-text)', fontWeight: 600, letterSpacing: '-0.01em', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentPage}
          </span>
        </div>

        {/* Search Bar */}
        <div className="hide-on-mobile mobile-search-bar" style={{ flex: 1, maxWidth: '320px', position: 'relative', marginLeft: '8px' }}>
          <Search style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            width: '13px', height: '13px', color: 'var(--df-text-muted)', pointerEvents: 'none'
          }} />
          <input
            type="text"
            placeholder="Search projects, plots…"
            style={{
              width: '100%', height: '34px',
              padding: '0 12px 0 30px',
              border: '1px solid var(--df-border-input)',
              borderRadius: '6px',
              fontSize: '12px',
              backgroundColor: 'var(--df-input-bg)',
              color: 'var(--df-text)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', borderRadius: '7px', cursor: 'pointer',
              color: 'var(--df-text-muted)',
            }}
            aria-label="Toggle Theme"
          >
            {theme === 'dark'
              ? <Sun style={{ width: '16px', height: '16px' }} />
              : <Moon style={{ width: '16px', height: '16px' }} />}
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setIsNotificationsOpen(v => !v); setIsProfileOpen(false); }}
              style={{
                width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', borderRadius: '7px', cursor: 'pointer',
                color: 'var(--df-text-muted)', position: 'relative',
              }}
              aria-label="Notifications"
            >
              <Bell style={{ width: '16px', height: '16px' }} />
              <span style={{
                position: 'absolute', top: '6px', right: '6px',
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: 'var(--df-accent)',
              }} />
            </button>

            {isNotificationsOpen && (
              <>
                <div onClick={() => setIsNotificationsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-overlay)' }} />
                <div style={{
                  position: 'absolute', right: 0, top: '38px',
                  width: '280px', backgroundColor: 'var(--df-card-bg)',
                  border: '1px solid var(--df-border)',
                  borderRadius: '10px', boxShadow: 'var(--df-shadow-md)',
                  zIndex: 'var(--z-modal)', overflow: 'hidden',
                  animation: 'landos-fade-in 0.15s ease-out',
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--df-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--df-text)' }}>Notifications</span>
                    <span style={{ fontSize: '11px', color: 'var(--df-accent)', cursor: 'pointer' }}>Mark all read</span>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--df-text)' }}>Layout variants generated</p>
                    <p style={{ fontSize: '11px', color: 'var(--df-text-muted)', marginTop: '2px' }}>4 design alternatives ready to review</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--df-border)', margin: '0 4px' }} />

          {/* Profile */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setIsProfileOpen(v => !v); setIsNotificationsOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '4px 6px',
                background: isProfileOpen ? 'var(--df-sidebar-hover)' : 'transparent',
                border: 'none', borderRadius: '7px', cursor: 'pointer',
              }}
            >
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                backgroundColor: 'var(--df-accent-medium, rgba(122,30,58,0.12))',
                color: 'var(--df-accent)', fontWeight: 700, fontSize: '11px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--df-accent)',
              }}>
                {getInitials(user?.name)}
              </div>
              <div className="hide-on-mobile" style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--df-text)', margin: 0 }}>{getFirstName(user?.name)}</p>
              </div>
              <ChevronDown style={{ width: '12px', height: '12px', color: 'var(--df-text-muted)' }} />
            </button>

            {isProfileOpen && (
              <>
                <div onClick={() => setIsProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-overlay)' }} />
                <div style={{
                  position: 'absolute', right: 0, top: '42px',
                  width: '200px', backgroundColor: 'var(--df-card-bg)',
                  border: '1px solid var(--df-border)',
                  borderRadius: '10px', boxShadow: 'var(--df-shadow-md)',
                  zIndex: 'var(--z-modal)', overflow: 'hidden',
                  animation: 'landos-fade-in 0.15s ease-out',
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--df-border)' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--df-text)', margin: 0 }}>{user?.name || 'Shivam Admin'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--df-text-muted)', margin: '2px 0 0' }}>{user?.email || 'admin@landos.com'}</p>
                  </div>
                  <div style={{ padding: '4px 0' }}>
                    <Link
                      to="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 14px', fontSize: '12.5px',
                        color: 'var(--df-text-soft)', textDecoration: 'none',
                      }}
                    >
                      <User style={{ width: '13px', height: '13px' }} />
                      Profile Settings
                    </Link>
                  </div>
                  <div style={{ borderTop: '1px solid var(--df-border)', padding: '4px 0' }}>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 14px', fontSize: '12.5px', fontWeight: 500,
                        color: 'var(--df-danger)', background: 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <LogOut style={{ width: '13px', height: '13px' }} />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* FIXED DESKTOP SIDEBAR */}
      <aside
        className="desktop-fixed-sidebar hide-on-mobile"
        style={{
          position: 'fixed',
          top: 'var(--df-navbar-height)',
          left: 0,
          bottom: 0,
          width: 'var(--df-sidebar-width)',
          backgroundColor: 'var(--df-sidebar-bg)',
          borderRight: '1px solid var(--df-border)',
          zIndex: 'var(--z-sidebar)',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
        }}
      >
        <SidebarNav onClose={() => {}} />
      </aside>

      {/* MOBILE SLIDE-OUT DRAWER */}
      {isMobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-overlay)', display: 'flex' }}>
          <div
            onClick={() => setIsMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          />
          <aside style={{
            position: 'relative', width: '260px', height: '100%',
            backgroundColor: 'var(--df-sidebar-bg)',
            borderRight: '1px solid var(--df-border)',
            boxShadow: 'var(--df-shadow-lg)',
            display: 'flex', flexDirection: 'column',
            animation: 'landos-drawer-left 0.22s var(--df-ease)',
            zIndex: 'var(--z-modal)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 14px', borderBottom: '1px solid var(--df-border)' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                <span style={{ color: 'var(--df-text)' }}>Land</span>
                <span style={{ color: 'var(--df-accent)' }}>OS</span>
              </span>
              <button
                onClick={() => setIsMobileOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)', padding: '6px' }}
                aria-label="Close Menu"
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
            <SidebarNav onClose={() => setIsMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* MAIN CONTENT AREA (Responsive Margins & Padding) */}
      <main
        className="app-main-layout"
        style={{
          marginLeft: 'var(--df-sidebar-width)',
          marginTop: 'var(--df-navbar-height)',
          minHeight: 'calc(100dvh - var(--df-navbar-height))',
          backgroundColor: 'var(--df-bg)',
          overflowY: 'auto',
          padding: '18px 24px 32px',
        }}
      >
        <Outlet />
      </main>

    </div>
  );
}
