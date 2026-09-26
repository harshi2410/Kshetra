import React, { useState, useMemo } from 'react';
import { Files, Upload, Download, Eye, X, ShieldCheck, FileText, CheckCircle2, Tag, FileCode, Map, Award, FileSpreadsheet } from 'lucide-react';
import initialDocuments from '../../../../data/documents.json';
import { formatDate } from '../../../../utils/formatters';

const DOCUMENTS_STORAGE_KEY = 'landos_documents_vault';

export default function ProjectDocuments({ project }) {
  const [documents, setDocuments] = useState(() => {
    try {
      const saved = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialDocuments;
  });

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Form State
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'Sale Agreement',
    category: 'Customer Agreements',
    plotId: 'P-01',
    regNumber: '',
    subRegistrar: 'Haveli No. 12, Pune',
    fileSize: '2.5 MB',
    fileType: 'PDF',
    status: 'Valid & Verified'
  });

  const saveToStorage = (updated) => {
    setDocuments(updated);
    try {
      localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const projectDocs = useMemo(() => {
    const list = documents.filter(d => d.projectId === project.id);
    if (list.length > 0) return list;
    return [
      {
        id: `doc_proj_${project.id}_1`,
        name: `Master CAD Vector Layout Plan (UDCPR Sanctioned) — ${project.name}`,
        type: 'Layout Plan',
        category: 'Technical CAD & Blueprint',
        projectId: project.id,
        fileSize: '16.4 MB',
        fileType: 'DXF / DWG',
        uploadedAt: '2024-01-12T08:00:00Z',
        status: 'Approved & Locked',
        regNumber: 'PMC/BP/2024/0918',
        subRegistrar: 'Town Planning Dept, Pune',
        tags: ['autocad', 'udcpr compliant', 'sanctioned layout']
      },
      {
        id: `doc_proj_${project.id}_2`,
        name: `MahaRERA Project Registration Certificate — ${project.name}`,
        type: 'RERA Certificate',
        category: 'Planning & Approvals',
        projectId: project.id,
        fileSize: '1.4 MB',
        fileType: 'PDF',
        uploadedAt: '2024-01-10T08:00:00Z',
        status: 'Valid',
        regNumber: 'P52100049281',
        subRegistrar: 'MahaRERA Authority',
        tags: ['maharera', 'legal sanction']
      },
      {
        id: `doc_proj_${project.id}_3`,
        name: `Non-Agricultural (NA 44) Sub-Division Order — ${project.name}`,
        type: 'NA Order',
        category: 'Land Titles & 7/12',
        projectId: project.id,
        fileSize: '4.1 MB',
        fileType: 'PDF',
        uploadedAt: '2023-11-20T11:00:00Z',
        status: 'Approved',
        regNumber: 'REV/NA44/PUN/2023/1842',
        subRegistrar: 'District Collector Office',
        tags: ['na order', 'collectorate sanction']
      },
      {
        id: `doc_proj_${project.id}_4`,
        name: `Consolidated 7/12 Extract (Satbara Utara) & Title Search`,
        type: '7/12 Extract',
        category: 'Land Titles & 7/12',
        projectId: project.id,
        fileSize: '2.8 MB',
        fileType: 'PDF',
        uploadedAt: '2024-01-05T09:00:00Z',
        status: 'Verified',
        regNumber: 'GUT-104/1B/PUN',
        subRegistrar: 'Talathi Office / Mahabhulekh',
        tags: ['7/12', 'satbara', 'clear title']
      },
      {
        id: `doc_proj_${project.id}_5`,
        name: `Registered Sale Deed — Rajesh Sharma (Plot P-01)`,
        type: 'Sale Agreement',
        category: 'Customer Agreements',
        projectId: project.id,
        plotId: 'P-01',
        fileSize: '3.8 MB',
        fileType: 'PDF',
        uploadedAt: '2024-02-14T10:00:00Z',
        status: 'Signed & Registered',
        regNumber: 'HAV/4920/2024',
        subRegistrar: 'Haveli No. 12, Pune',
        tags: ['sale deed', 'registered', 'allottee copy']
      }
    ];
  }, [documents, project.id, project.name]);

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
      projectId: project.id,
      plotId: uploadForm.plotId || null,
      fileSize: uploadForm.fileSize || '2.4 MB',
      fileType: uploadForm.fileType || 'PDF',
      uploadedAt: new Date().toISOString(),
      status: uploadForm.status || 'Verified',
      regNumber: uploadForm.regNumber || `REG/${Date.now().toString().slice(-6)}`,
      subRegistrar: uploadForm.subRegistrar || 'Pune Authority',
      tags: ['uploaded', 'verified']
    };

    const updated = [newDoc, ...documents];
    saveToStorage(updated);
    setIsUploadModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
        padding: '12px 16px', background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)', borderRadius: '8px'
      }}>
        <div>
          <div style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--df-text)' }}>
            Document Vault — {project.name}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
            Encrypted repository of UDCPR sanction blueprints, MahaRERA certificates, NA conversion orders, and customer sale deeds.
          </div>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
            borderRadius: '6px', background: 'var(--df-accent)', color: '#ffffff', border: 'none',
            fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(159,18,57,0.3)'
          }}
        >
          <Upload style={{ width: '13px', height: '13px' }} /> Upload Document
        </button>
      </div>

      {/* Documents Table */}
      <div style={{
        backgroundColor: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
        borderRadius: '8px', overflow: 'hidden', boxShadow: 'var(--df-shadow-xs)'
      }}>
        <div className="table-responsive-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--df-bg)', borderBottom: '1px solid var(--df-border)' }}>
                {['DOCUMENT TITLE', 'CATEGORY / TYPE', 'FILE SIZE', 'UPLOADED', 'STATUS', 'ACTION'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--df-text-muted)', textAlign: i === 5 ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectDocs.map(doc => (
                <tr key={doc.id}
                  style={{ borderBottom: '1px solid var(--df-border)', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText style={{ width: '16px', height: '16px', color: 'var(--df-accent)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--df-text)' }}>{doc.name}</div>
                        {doc.regNumber && (
                          <div style={{ fontSize: '0.66rem', color: 'var(--df-accent)', fontFamily: 'var(--font-mono)' }}>
                            Reg: {doc.regNumber} {doc.plotId ? `• Plot ${doc.plotId}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '0.74rem', color: 'var(--df-text-soft)', fontWeight: 600 }}>
                    {doc.type}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.70rem', color: 'var(--df-text-muted)' }}>
                    {doc.fileSize || '2.4 MB'} ({doc.fileType || 'PDF'})
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '0.70rem', color: 'var(--df-text-muted)' }}>
                    {formatDate(doc.uploadedAt)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      padding: '2px 7px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase',
                      color: 'var(--df-success)', background: 'var(--df-success-soft)', border: '1px solid rgba(22,163,74,0.3)'
                    }}>
                      {doc.status || 'Verified'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        style={{
                          padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--df-border)',
                          background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '0.68rem', fontWeight: 700,
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px'
                        }}
                      >
                        <Eye style={{ width: '10px', height: '10px', color: 'var(--df-accent)' }} /> View
                      </button>
                      <button
                        onClick={() => alert(`Downloading document: ${doc.name}`)}
                        style={{
                          padding: '4px 10px', borderRadius: '4px', border: 'none',
                          background: 'var(--df-accent)', color: '#ffffff', fontSize: '0.68rem', fontWeight: 700,
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px',
                          boxShadow: '0 2px 4px rgba(159,18,57,0.25)'
                        }}
                      >
                        <Download style={{ width: '10px', height: '10px' }} /> Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
            borderRadius: '10px', width: 'min(480px, 94vw)', maxHeight: '90vh', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', boxShadow: 'var(--df-shadow-xl)',
            animation: 'landos-fade-in 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--df-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload style={{ width: '18px', height: '18px', color: 'var(--df-accent)' }} />
                <span style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  Upload Document — {project.name}
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
                  placeholder="e.g. Registered Sale Deed - Plot P-01"
                  required
                  value={uploadForm.name}
                  onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Document Type
                  </label>
                  <select
                    value={uploadForm.type}
                    onChange={e => setUploadForm({ ...uploadForm, type: e.target.value })}
                    style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem' }}
                  >
                    <option value="Sale Agreement">Sale Agreement</option>
                    <option value="Allotment Letter">Allotment Letter</option>
                    <option value="Layout Plan">Layout Plan (CAD/PDF)</option>
                    <option value="RERA Certificate">RERA Certificate</option>
                    <option value="NA Order">NA Order (Revenue 44)</option>
                    <option value="7/12 Extract">7/12 Extract (Satbara)</option>
                    <option value="NOC">NOC (Fire / Environment)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Plot Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. P-01"
                    value={uploadForm.plotId}
                    onChange={e => setUploadForm({ ...uploadForm, plotId: e.target.value })}
                    style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                  Registration / Sanction Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. PMC/BP/2024/0918"
                  value={uploadForm.regNumber}
                  onChange={e => setUploadForm({ ...uploadForm, regNumber: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ padding: '12px 0 0 0', borderTop: '1px solid var(--df-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  style={{ padding: '6px 14px', borderRadius: '5px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', color: 'var(--df-text)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 16px', borderRadius: '5px', background: 'var(--df-accent)', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(159,18,57,0.3)' }}
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Document Modal */}
      {selectedDoc && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
            borderRadius: '10px', width: 'min(500px, 94vw)', display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--df-shadow-xl)', animation: 'landos-fade-in 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--df-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck style={{ width: '18px', height: '18px', color: 'var(--df-accent)' }} />
                <span style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  Document Verification Dossier
                </span>
              </div>
              <button onClick={() => setSelectedDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.76rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '1.8rem' }}>{CAT_ICON[selectedDoc.type] || '📁'}</span>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--df-text)' }}>{selectedDoc.name}</div>
                  <div style={{ fontSize: '0.70rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
                    Type: {selectedDoc.type} • {selectedDoc.fileSize} ({selectedDoc.fileType})
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '8px', background: 'var(--df-bg)', borderRadius: '5px', border: '1px solid var(--df-border)' }}>
                  <div style={{ fontSize: '0.60rem', fontWeight: 700, color: 'var(--df-text-muted)', textTransform: 'uppercase' }}>Registration Number</div>
                  <div style={{ fontWeight: 800, color: 'var(--df-accent)', fontFamily: 'var(--font-mono)' }}>{selectedDoc.regNumber || 'Verified Official'}</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--df-bg)', borderRadius: '5px', border: '1px solid var(--df-border)' }}>
                  <div style={{ fontSize: '0.60rem', fontWeight: 700, color: 'var(--df-text-muted)', textTransform: 'uppercase' }}>Uploaded Date</div>
                  <div style={{ fontWeight: 800, color: 'var(--df-text)' }}>{formatDate(selectedDoc.uploadedAt)}</div>
                </div>
              </div>

              <div style={{ fontSize: '0.68rem', color: 'var(--df-success)', fontWeight: 700, textAlign: 'center', background: 'var(--df-success-soft)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(22,163,74,0.3)' }}>
                ✓ Official Certified Document Recorded in Project Vault
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '5px', background: 'var(--df-accent)', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
              >
                <Download style={{ width: '12px', height: '12px' }} /> Download File
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
