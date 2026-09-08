import React from 'react';
import documentsData from '../../../../data/documents.json';
import { cardStyle, cardHeaderStyle, cardTitleStyle, thStyle, tdStyle, linkBtnStyle } from '../../components/dCardStyles';

const CAT_ICON = { 'Sale Agreement': '📄', 'Allotment Letter': '📋', 'Layout Plan': '🗺️', 'RERA Certificate': '🏛️', 'NOC': '✅' };
const statusColor = (s) => {
  if (s === 'Signed' || s === 'Approved' || s === 'Valid') return { color: 'var(--df-success)', bg: 'rgba(21,128,61,0.08)' };
  if (s === 'Issued' || s === 'Verified')                  return { color: '#1d4ed8',           bg: 'rgba(29,78,216,0.08)' };
  return { color: 'var(--df-text-muted)', bg: 'var(--df-bg)' };
};

export default function ProjectDocuments({ project }) {
  const docs = documentsData.filter(d => d.projectId === project.id);
  return (
    <div style={cardStyle} className="mobile-card-compact">
      <div style={cardHeaderStyle}>
        <div style={cardTitleStyle}>Documents — {project.name}</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>{docs.length} files</div>
      </div>
      <div className="table-responsive-container">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Title', 'Type', 'Size', 'Uploaded', 'Status', ''].map((h, i) => (
                <th key={h} style={{ ...thStyle, textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 ? (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--df-text-muted)', padding: '28px' }}>No documents uploaded for this project.</td></tr>
            ) : docs.map(doc => {
              const sc = statusColor(doc.status);
              return (
                <tr key={doc.id}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={tdStyle}><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '13px' }}>{CAT_ICON[doc.type] || '📎'}</span><span style={{ fontWeight: 600, fontSize: '0.77rem', color: 'var(--df-text)' }}>{doc.name}</span></div></td>
                  <td style={{ ...tdStyle, fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>{doc.type}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.68rem', color: 'var(--df-text-muted)' }}>{doc.fileSize || '—'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.68rem', color: 'var(--df-text-muted)' }}>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={tdStyle}><span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: sc.color, background: sc.bg }}>{doc.status}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}><button style={linkBtnStyle}>Download</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
