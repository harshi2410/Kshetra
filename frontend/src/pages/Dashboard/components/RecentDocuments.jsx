import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ExternalLink } from 'lucide-react';
import { cardStyle, cardHeaderStyle, cardTitleStyle, thStyle, tdStyle, linkBtnStyle } from './dCardStyles';

const statusColor = (s) => {
  if (s === 'Signed' || s === 'Approved' || s === 'Valid')
    return { color: 'var(--df-success)', bg: 'var(--df-success-soft)' };
  if (s === 'Issued' || s === 'Verified')
    return { color: 'var(--df-info, #1d4ed8)', bg: 'var(--df-info-soft, rgba(29,78,216,0.08))' };
  return { color: 'var(--df-text-muted)', bg: 'var(--df-bg)' };
};

const typeIcon = { 'Sale Agreement': '📄', 'RERA Certificate': '🏛️', 'Site Map': '🗺️', 'NOC': '✅' };

export default function RecentDocuments({ documents }) {
  const navigate = useNavigate();
  const rows = documents?.slice(0, 5) || [];

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div>
          <div style={cardTitleStyle}>Recent Documents</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>
            Sale agreements, RERA certificates, site maps
          </div>
        </div>
        <button style={linkBtnStyle} onClick={() => navigate('/documents')}>View All →</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Title', 'Type', 'Uploaded', 'Status', ''].map((h, i) => (
                <th key={i} style={{ ...thStyle, textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map((doc) => {
              const sc = statusColor(doc.status);
              const icon = typeIcon[doc.type] || '📎';
              return (
                <tr key={doc.id}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ fontSize: '13px', flexShrink: 0 }}>{icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--df-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                          {doc.name}
                        </div>
                        {doc.fileSize && (
                          <div style={{ fontSize: '0.62rem', color: 'var(--df-text-muted)', marginTop: '1px', fontFamily: 'var(--font-mono)' }}>
                            {doc.fileSize}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.72rem', color: 'var(--df-text-soft)', whiteSpace: 'nowrap' }}>
                    {doc.type}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.68rem', color: 'var(--df-text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '2px 7px', borderRadius: '4px',
                      fontSize: '0.6rem', fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      color: sc.color, backgroundColor: sc.bg, whiteSpace: 'nowrap',
                    }}>{doc.status}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button
                      onClick={() => navigate('/documents')}
                      style={{ ...linkBtnStyle, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      Open <ExternalLink style={{ width: '10px', height: '10px' }} />
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--df-text-muted)', padding: '20px' }}>No documents found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
