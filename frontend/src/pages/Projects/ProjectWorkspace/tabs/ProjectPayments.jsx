import React from 'react';
import paymentsData from '../../../../data/payments.json';
import customersData from '../../../../data/customers.json';
import { formatCurrency } from '../../../../utils/formatters';
import { cardStyle, cardHeaderStyle, cardTitleStyle, thStyle, tdStyle } from '../../components/dCardStyles';

const statusColor = (s) => s === 'Completed' ? { color: 'var(--df-success)', bg: 'rgba(21,128,61,0.08)' } : { color: '#d97706', bg: 'rgba(217,119,6,0.08)' };

export default function ProjectPayments({ project }) {
  const payments = paymentsData.filter(p => p.projectId === project.id);
  const total   = payments.reduce((s, p) => s + p.amount, 0);
  const paid    = payments.filter(p => p.status === 'Completed').reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);

  const getName = (id) => customersData.find(c => c.id === id)?.name || id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Quick stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '1px',
        border: '1px solid var(--df-card-border)',
        borderRadius: '6px',
        overflow: 'hidden',
        background: 'var(--df-border)',
      }}>
        {[['Total Payments', payments.length, 'var(--df-text)'], ['Total Amount', formatCurrency(total), 'var(--df-text)'], ['Collected', formatCurrency(paid), 'var(--df-success)'], ['Pending', formatCurrency(pending), '#d97706']].map(([l, v, c]) => (
          <div key={l} style={{ padding: '12px 14px', background: 'var(--df-card-bg)' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--df-text-muted)', marginBottom: '4px' }}>{l}</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: c, fontFamily: 'monospace', lineHeight: 1 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={cardStyle} className="mobile-card-compact">
        <div style={cardHeaderStyle}>
          <div style={cardTitleStyle}>Payment Records</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>{payments.length} records</div>
        </div>
        <div className="table-responsive-container">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Customer', 'Plot', 'Type', 'Amount', 'Due Date', 'Paid Date', 'Mode', 'Status'].map((h, i) => (
                  <th key={h} style={{ ...thStyle, textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--df-text-muted)', padding: '28px' }}>No payments recorded for this project.</td></tr>
              ) : payments.map(pay => {
                const sc = statusColor(pay.status);
                return (
                  <tr key={pay.id}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={tdStyle}><div style={{ fontWeight: 600, fontSize: '0.77rem', color: 'var(--df-text)' }}>{getName(pay.customerId)}</div></td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--df-accent)', fontWeight: 700 }}>{pay.plotId}</td>
                    <td style={{ ...tdStyle, fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>{pay.type}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.8rem', color: 'var(--df-text)' }}>₹{Number(pay.amount).toLocaleString('en-IN')}</td>
                    <td style={{ ...tdStyle, fontSize: '0.68rem', color: 'var(--df-text-muted)', fontFamily: 'monospace' }}>{pay.dueDate || '—'}</td>
                    <td style={{ ...tdStyle, fontSize: '0.68rem', color: 'var(--df-text-muted)', fontFamily: 'monospace' }}>{pay.paidDate || '—'}</td>
                    <td style={{ ...tdStyle, fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>{pay.method || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: sc.color, background: sc.bg }}>{pay.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
