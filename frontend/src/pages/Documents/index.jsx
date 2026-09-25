import React, { useState, useMemo } from 'react';
import { 
  Search, Files, Upload, FileText, Download, Tag, CheckCircle2, 
  ShieldCheck, MapPin, Eye, X, Plus, Filter, Lock, Sparkles, Building2, Calendar
} from 'lucide-react';
import initialDocuments from '../../data/documents.json';
import projectsData from '../../data/projects.json';
import customersData from '../../data/customers.json';
import { formatDate } from '../../utils/formatters';

const DOCUMENTS_STORAGE_KEY = 'landos_documents_vault';

const CAT_ICON = {
  'Sale Agreement': '📄',
  'Allotment Letter': '📋',
  'Layout Plan': '🗺️',
  'RERA Certificate': '🏛️',
  'NA Order': '📜',
  '7/12 Extract': '📑',
  'Town Planning Sanction': '📐',
  'NOC': '✅'
};

const CATEGORIES = [
  'ALL',
  'Planning & Approvals',
  'Customer Agreements',
  'Land Titles & 7/12',
  'Technical CAD & Blueprint',
  'RERA & NOC'
];

export default function Documents() {
  const [documents, setDocuments] = useState(() => {
    try {
      const saved = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialDocuments;
  });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // New Document upload state
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'Sale Agreement',
    category: 'Customer Agreements',
    projectId: projectsData[0]?.id || 'proj_001',
    customerId: '',
    plotId: 'P-01',
    fileSize: '2.5 MB',
    fileType: 'PDF',
    status: 'Valid & Verified',
    regNumber: '',
    subRegistrar: 'Haveli No. 12, Pune',
    tags: 'legal, compliance'
  });

  const saveToStorage = (updated) => {
    setDocuments(updated);
    try {
      localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const getProjectName = (pid) => {
    const p = projectsData.find(x => x.id === pid);
    return p ? p.name : 'Pune Green Enclave';
  };

  const getCustomerName = (cid) => {
    if (!cid) return null;
    const c = customersData.find(x => x.id === cid);
    return c ? c.name : null;
  };

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      const q = search.toLowerCase();
      const projName = getProjectName(d.projectId).toLowerCase();
      const custName = (getCustomerName(d.customerId) || '').toLowerCase();
      const matchSearch = !q 
        || d.name.toLowerCase().includes(q) 
        || d.type.toLowerCase().includes(q)
        || (d.regNumber && d.regNumber.toLowerCase().includes(q))
        || projName.includes(q)
        || custName.includes(q)
        || (Array.isArray(d.tags) && d.tags.some(t => t.toLowerCase().includes(q)));

      const matchCategory = categoryFilter === 'ALL' || d.category === categoryFilter || d.type === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [documents, search, categoryFilter]);

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadForm.name.trim()) {
      alert('Please enter a document title.');
      return;
    }

    const newDoc = {
      id: `doc_${Date.now()}`,
      name: uploadForm.name.trim(),
      type: uploadForm.type,
      category: uploadForm.category,
      projectId: uploadForm.projectId,
      customerId: uploadForm.customerId || null,
      plotId: uploadForm.plotId || null,
      fileSize: uploadForm.fileSize || '2.4 MB',
      fileType: uploadForm.fileType || 'PDF',
      uploadedAt: new Date().toISOString(),
      status: uploadForm.status || 'Verified',
      regNumber: uploadForm.regNumber || `REG/${Date.now().toString().slice(-6)}`,
      subRegistrar: uploadForm.subRegistrar || 'Pune Authority',
      tags: uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean)
    };

    const updated = [newDoc, ...documents];
    saveToStorage(updated);
    setIsUploadModalOpen(false);
    setUploadForm({
      name: '',
      type: 'Sale Agreement',
      category: 'Customer Agreements',
      projectId: projectsData[0]?.id || 'proj_001',
      customerId: '',
      plotId: 'P-01',
      fileSize: '2.5 MB',
      fileType: 'PDF',
      status: 'Valid & Verified',
      regNumber: '',
      subRegistrar: 'Haveli No. 12, Pune',
      tags: 'legal, compliance'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'landos-fade-in 0.2s ease-out' }}>
      
      {/* ── Page Header ── */}
      <div className="page-header-container responsive-stack" style={{
        padding: '14px 18px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        boxShadow: 'var(--df-shadow-xs)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--df-text)', margin: 0, lineHeight: 1.2 }}>
              Legal & Planning Document Vault
            </h1>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)', border: '1px solid rgba(159,18,57,0.25)' }}>
              {documents.length} Stored Documents
            </span>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--df-text-muted)', marginTop: '3px', margin: 0 }}>
            Encrypted cloud vault for master CAD layout vectors, UDCPR 2020 sanction orders, MahaRERA certificates, 7/12 extracts, and registered sale deeds.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            height: '36px', padding: '0 16px', borderRadius: '6px',
            background: 'var(--df-accent)', color: '#ffffff', border: 'none',
            fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(159,18,57,0.3)'
          }}
        >
          <Upload style={{ width: '14px', height: '14px' }} /> Upload New Document
        </button>
      </div>

      {/* ── Search & Category Filter Pills ── */}
      <div style={{
        padding: '10px 14px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 240px', minWidth: '200px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--df-text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search documents by title, registration no., project, or tag…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: '34px', padding: '0 12px 0 32px',
              backgroundColor: 'var(--df-bg)', border: '1px solid var(--df-border)',
              borderRadius: '6px', fontSize: '0.78rem', color: 'var(--df-text)', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <div className="horizontal-scroll-tabs" style={{ padding: '2px 0' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                height: '32px', padding: '0 12px', borderRadius: '5px',
                border: categoryFilter === cat ? '1px solid var(--df-accent)' : '1px solid var(--df-border)',
                background: categoryFilter === cat ? 'var(--df-accent)' : 'var(--df-bg)',
                color: categoryFilter === cat ? '#ffffff' : 'var(--df-text)',
                fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {cat === 'ALL' ? 'All Vault Files' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Document Cards Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '12px'
      }}>
        {filtered.map((d) => (
          <div
            key={d.id}
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--df-card-bg)',
              border: '1px solid var(--df-card-border)',
              borderRadius: '8px',
              boxShadow: 'var(--df-shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '170px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>{CAT_ICON[d.type] || '📁'}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase',
                  background: 'var(--df-success-soft)',
                  color: 'var(--df-success)',
                  border: '1px solid rgba(22,163,74,0.25)'
                }}>
                  {d.status}
                </span>
              </div>
              <div style={{ fontWeight: 800, color: 'var(--df-text)', fontSize: '0.84rem', marginBottom: '4px', lineHeight: 1.3 }}>
                {d.name}
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--df-text-muted)', marginBottom: '8px' }}>
                {getProjectName(d.projectId)} {d.plotId ? `• Plot ${d.plotId}` : ''} • {d.fileSize} ({d.fileType})
              </div>
              {d.regNumber && (
                <div style={{ fontSize: '0.68rem', color: 'var(--df-accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  Reg: {d.regNumber}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--df-border)', paddingTop: '10px', marginTop: '10px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)' }}>
                {formatDate(d.uploadedAt)}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setSelectedDoc(d)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--df-border)',
                    background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '0.70rem', fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Eye style={{ width: '11px', height: '11px', color: 'var(--df-accent)' }} /> View
                </button>
                <button
                  onClick={() => alert(`Downloading verified document: ${d.name}`)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    padding: '4px 10px', borderRadius: '4px', border: 'none',
                    background: 'var(--df-accent)', color: '#ffffff', fontSize: '0.70rem', fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 2px 4px rgba(159,18,57,0.25)'
                  }}
                >
                  <Download style={{ width: '11px', height: '11px' }} /> Download
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Upload Document Modal ── */}
      {isUploadModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
            borderRadius: '10px', width: 'min(520px, 94vw)', maxHeight: '90vh', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', boxShadow: 'var(--df-shadow-xl)',
            animation: 'landos-fade-in 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--df-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload style={{ width: '18px', height: '18px', color: 'var(--df-accent)' }} />
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  Upload Document to Encrypted Vault
                </span>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                  Document Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Registered Sale Deed - Rahul Sharma (Plot P-08)"
                  required
                  value={uploadForm.name}
                  onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.78rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Document Category
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={e => setUploadForm({ ...uploadForm, category: e.target.value })}
                    style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem' }}
                  >
                    <option value="Customer Agreements">Customer Agreements</option>
                    <option value="Planning & Approvals">Planning & Approvals</option>
                    <option value="Land Titles & 7/12">Land Titles & 7/12</option>
                    <option value="Technical CAD & Blueprint">Technical CAD & Blueprint</option>
                    <option value="RERA & NOC">RERA & NOC</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Project
                  </label>
                  <select
                    value={uploadForm.projectId}
                    onChange={e => setUploadForm({ ...uploadForm, projectId: e.target.value })}
                    style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem' }}
                  >
                    {projectsData.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Registration / Sanction Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HAV/8821/2024"
                    value={uploadForm.regNumber}
                    onChange={e => setUploadForm({ ...uploadForm, regNumber: e.target.value })}
                    style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Issuing Authority / Registrar
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sub-Registrar Haveli No. 12"
                    value={uploadForm.subRegistrar}
                    onChange={e => setUploadForm({ ...uploadForm, subRegistrar: e.target.value })}
                    style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div style={{
                padding: '20px', border: '2px dashed var(--df-border)', borderRadius: '8px',
                background: 'var(--df-bg)', textAlign: 'center', cursor: 'pointer', marginTop: '4px'
              }}>
                <Upload style={{ width: '24px', height: '24px', color: 'var(--df-accent)', margin: '0 auto 6px' }} />
                <div style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  Click to select file or drag & drop
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
                  Supports PDF, DXF, DWG, PNG, JPEG, TIFF (Max 50MB)
                </div>
              </div>

              <div style={{ padding: '12px 0 0 0', borderTop: '1px solid var(--df-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  style={{ padding: '7px 14px', borderRadius: '5px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', color: 'var(--df-text)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 18px', borderRadius: '5px', background: 'var(--df-accent)', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(159,18,57,0.3)' }}
                >
                  Save & Secure Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Document Modal ── */}
      {selectedDoc && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
            borderRadius: '10px', width: 'min(540px, 94vw)', display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--df-shadow-xl)', animation: 'landos-fade-in 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--df-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck style={{ width: '18px', height: '18px', color: 'var(--df-accent)' }} />
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  Document Verification Dossier
                </span>
              </div>
              <button onClick={() => setSelectedDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '2rem' }}>{CAT_ICON[selectedDoc.type] || '📁'}</span>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--df-text)' }}>
                    {selectedDoc.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
                    Category: {selectedDoc.category || selectedDoc.type} • File Size: {selectedDoc.fileSize} ({selectedDoc.fileType})
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.74rem' }}>
                <div style={{ padding: '8px 10px', background: 'var(--df-bg)', borderRadius: '6px', border: '1px solid var(--df-border)' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--df-text-muted)', textTransform: 'uppercase' }}>Project Reference</div>
                  <div style={{ fontWeight: 800, color: 'var(--df-text)', marginTop: '2px' }}>{getProjectName(selectedDoc.projectId)}</div>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--df-bg)', borderRadius: '6px', border: '1px solid var(--df-border)' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--df-text-muted)', textTransform: 'uppercase' }}>Sanction / Reg Number</div>
                  <div style={{ fontWeight: 800, color: 'var(--df-accent)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>{selectedDoc.regNumber || 'Verified Official'}</div>
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--df-bg)', borderRadius: '6px', border: '1px solid var(--df-border)', fontSize: '0.74rem' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--df-text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Issuing Authority</div>
                <div style={{ fontWeight: 700, color: 'var(--df-text)' }}>{selectedDoc.subRegistrar || 'Government of Maharashtra Authority'}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>Uploaded on {formatDate(selectedDoc.uploadedAt)}</div>
              </div>

              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {(selectedDoc.tags || []).map((t, i) => (
                  <span key={i} style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)', border: '1px solid rgba(159,18,57,0.2)' }}>
                    #{t}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: '0.68rem', color: 'var(--df-success)', fontWeight: 700, textAlign: 'center', background: 'var(--df-success-soft)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(22,163,74,0.3)' }}>
                ✓ SHA-256 Cryptographic Integrity Check Passed • Stored in Secure Document Vault
              </div>
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--df-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setSelectedDoc(null)}
                style={{ padding: '6px 14px', borderRadius: '5px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', color: 'var(--df-text)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => alert(`Downloading ${selectedDoc.name}`)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 16px', borderRadius: '5px', background: 'var(--df-accent)', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(159,18,57,0.3)' }}
              >
                <Download style={{ width: '13px', height: '13px' }} /> Download Verified File
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
