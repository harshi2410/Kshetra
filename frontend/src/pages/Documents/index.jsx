import React, { useState, useMemo } from 'react';
import { Search, Files, Upload, FileText, Download, Tag, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';
import documentsData from '../../data/documents.json';
import projectsData from '../../data/projects.json';
import { formatDate } from '../../utils/formatters';

const CAT_ICON = {
  'Sale Agreement': '📄',
  'Allotment Letter': '📋',
  'Layout Plan': '🗺️',
  'RERA Certificate': '🏛️',
  'NOC': '✅'
};

export default function Documents() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const getProjectName = (pid) => {
    const p = projectsData.find(x => x.id === pid);
    return p ? p.name : 'Sunrise Valley';
  };

  const filtered = useMemo(() => {
    return documentsData.filter((d) => {
      const q = search.toLowerCase();
      const matchSearch = !q || d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q);
      const matchType = typeFilter === 'ALL' || d.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [search, typeFilter]);

  const uniqueTypes = Array.from(new Set(documentsData.map(d => d.type)));

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
              Legal Document Vault
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)', border: '1px solid var(--df-accent-medium)' }}>
              {documentsData.length} Stored Files
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--df-text-muted)', marginTop: '4px', margin: 0 }}>
            Encrypted storage for master layout CAD files, RERA sanctions, NA conversion orders, and customer agreements.
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
          <Upload style={{ width: '15px', height: '15px' }} /> Upload Document
        </button>
      </div>

      {/* ── Search & Category Filters ── */}
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
            placeholder="Search documents by title, tags, or category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: '36px', padding: '0 12px 0 32px',
              backgroundColor: 'var(--df-input-bg)', border: '1px solid var(--df-border-input)',
              borderRadius: '6px', fontSize: '13px', color: 'var(--df-text)', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <div className="horizontal-scroll-tabs" style={{ padding: '2px 0' }}>
          <button
            onClick={() => setTypeFilter('ALL')}
            style={{
              height: '34px', padding: '0 12px', borderRadius: '6px',
              border: '1px solid var(--df-border)',
              background: typeFilter === 'ALL' ? 'var(--df-accent)' : 'var(--df-bg)',
              color: typeFilter === 'ALL' ? '#ffffff' : 'var(--df-text)',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            All Types
          </button>
          {uniqueTypes.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                height: '34px', padding: '0 12px', borderRadius: '6px',
                border: '1px solid var(--df-border)',
                background: typeFilter === t ? 'var(--df-accent)' : 'var(--df-bg)',
                color: typeFilter === t ? '#ffffff' : 'var(--df-text)',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Document Cards Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '14px'
      }}>
        {filtered.map((d) => (
          <div
            key={d.id}
            style={{
              padding: '16px 18px',
              backgroundColor: 'var(--df-card-bg)',
              border: '1px solid var(--df-card-border)',
              borderRadius: '10px',
              boxShadow: 'var(--df-shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '170px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>{CAT_ICON[d.type] || '📁'}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase',
                  background: d.status === 'Signed' || d.status === 'Approved' || d.status === 'Valid' ? 'var(--df-success-soft)' : 'rgba(37,99,235,0.1)',
                  color: d.status === 'Signed' || d.status === 'Approved' || d.status === 'Valid' ? 'var(--df-success)' : '#2563eb',
                  border: '1px solid rgba(22,163,74,0.2)'
                }}>
                  {d.status}
                </span>
              </div>
              <div style={{ fontWeight: 800, color: 'var(--df-text)', fontSize: '14px', marginBottom: '4px', lineHeight: 1.3 }}>
                {d.name}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--df-text-muted)', marginBottom: '10px' }}>
                Project: {getProjectName(d.projectId)} • {d.fileSize} ({d.fileType})
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--df-border)', paddingTop: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--df-text-muted)' }}>
                {formatDate(d.uploadedAt)}
              </span>
              <button
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '5px 10px', borderRadius: '5px', border: '1px solid var(--df-border)',
                  background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '11.5px', fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Download style={{ width: '12px', height: '12px' }} /> Download
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
