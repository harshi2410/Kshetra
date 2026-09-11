import React, { useState, useMemo } from 'react';
import { Search, Users, UserPlus, Phone, Mail, MapPin, IndianRupee, CreditCard, Filter, ArrowUpRight } from 'lucide-react';
import customersData from '../../data/customers.json';
import projectsData from '../../data/projects.json';
import { formatCurrency } from '../../utils/formatters';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');

  const filtered = useMemo(() => {
    return customersData.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
      const matchProject = projectFilter === 'ALL' || c.projectId === projectFilter;
      return matchSearch && matchProject;
    });
  }, [search, projectFilter]);

  const totalInvested = customersData.reduce((s, c) => s + (c.totalInvested || 0), 0);
  const totalPlots = customersData.reduce((s, c) => s + (c.assignedPlots?.length || 0), 0);

  const getProjectName = (pid) => {
    const p = projectsData.find(x => x.id === pid);
    return p ? p.name : 'Sunrise Valley';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'landos-fade-in 0.2s ease-out' }}>
      
      {/* ── Page Header ── */}
      <div className="page-header-container responsive-stack" style={{
        padding: '16px 20px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '10px',
        boxShadow: 'var(--df-shadow-xs)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--df-text)', margin: 0, lineHeight: 1.2 }}>
              Customer Registry & Buyers
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)', border: '1px solid var(--df-accent-medium)' }}>
              {customersData.length} Registered Buyers
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--df-text-muted)', marginTop: '4px', margin: 0 }}>
            Track property allotments, KYC compliance, customer investments, and contact schedules.
          </p>
        </div>

        <button
          className="w-full-on-mobile"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            height: '38px', padding: '0 18px', borderRadius: '8px',
            background: 'var(--df-accent)', color: '#ffffff', border: 'none',
            fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            boxShadow: 'var(--df-shadow-glow)'
          }}
        >
          <UserPlus style={{ width: '15px', height: '15px' }} /> Add Customer
        </button>
      </div>

      {/* ── KPI Counter Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
      }}>
        {[
          { label: 'Total Customers', value: customersData.length, color: 'var(--df-text)' },
          { label: 'Total Invested', value: formatCurrency(totalInvested), color: 'var(--df-success)' },
          { label: 'Allotted Plots', value: `${totalPlots} Plots`, color: 'var(--df-accent)' },
          { label: 'KYC Verified', value: '100% Verified', color: '#3b82f6' },
        ].map((k, i) => (
          <div
            key={i}
            style={{
              padding: '14px 18px',
              backgroundColor: 'var(--df-card-bg)',
              border: '1px solid var(--df-card-border)',
              borderRadius: '8px',
              boxShadow: 'var(--df-shadow-xs)'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', letterSpacing: '0.05em', marginBottom: '6px' }}>
              {k.label}
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: k.color, fontFamily: 'var(--font-mono, monospace)' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Controls ── */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 240px', minWidth: '200px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--df-text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: '36px', padding: '0 12px 0 32px',
              backgroundColor: 'var(--df-input-bg)', border: '1px solid var(--df-border-input)',
              borderRadius: '6px', fontSize: '13px', color: 'var(--df-text)', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            style={{
              height: '36px', padding: '0 12px', fontSize: '12.5px',
              backgroundColor: 'var(--df-input-bg)', border: '1px solid var(--df-border-input)',
              borderRadius: '6px', color: 'var(--df-text)', outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="ALL">All Projects</option>
            {projectsData.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Customers Table ── */}
      <div style={{
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        boxShadow: 'var(--df-shadow-xs)',
        overflow: 'hidden'
      }}>
        <div className="table-responsive-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--df-bg)', borderBottom: '1px solid var(--df-border)' }}>
                {['CUSTOMER', 'CONTACT', 'CITY / ADDRESS', 'ASSIGNED PROJECT & PLOTS', 'TOTAL INVESTED', 'KYC STATUS'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', letterSpacing: '0.04em', textAlign: i === 4 ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: '1px solid var(--df-border)', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--df-text)', fontSize: '13px' }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--df-text-muted)' }}>PAN: {c.pan}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--df-text-soft)' }}>
                      <Phone style={{ width: '12px', height: '12px', color: 'var(--df-accent)' }} /> {c.phone}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--df-text-muted)', marginTop: '2px' }}>
                      <Mail style={{ width: '11px', height: '11px' }} /> {c.email}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--df-text-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin style={{ width: '12px', height: '12px', color: '#ef4444' }} /> {c.address}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--df-text)' }}>{getProjectName(c.projectId)}</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {c.assignedPlots?.map(p => (
                        <span key={p} style={{ fontSize: '10.5px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)' }}>
                          {p.replace('plot_', 'Plot ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '13.5px', color: 'var(--df-success)' }}>
                    {formatCurrency(c.totalInvested)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', background: 'var(--df-success-soft)', color: 'var(--df-success)', border: '1px solid rgba(22,163,74,0.25)' }}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
