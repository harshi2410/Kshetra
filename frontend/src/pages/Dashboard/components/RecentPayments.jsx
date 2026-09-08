import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cardStyle, cardHeaderStyle, cardTitleStyle, thStyle, tdStyle, linkBtnStyle } from './dCardStyles';

const statusColor = (s) => {
  if (s === 'Completed') return { color: 'var(--df-success)', bg: 'var(--df-success-soft)' };
  if (s === 'Pending')   return { color: '#d97706',           bg: 'rgba(217,119,6,0.08)' };
  if (s === 'Overdue')   return { color: 'var(--df-danger)',  bg: 'var(--df-danger-soft, rgba(185,28,28,0.08))' };
  return                        { color: 'var(--df-text-muted)', bg: 'var(--df-bg)' };
};

const fmtINR = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

export default function RecentPayments({ payments, customers, projects }) {
  const navigate = useNavigate();

  const getName = (arr, id, field) => arr?.find(x => x.id === id)?.[field] || id;

  const rows = payments?.slice(0, 5) || [];

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div>
          <div style={cardTitleStyle}>Recent Transactions</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>
            Latest customer installments & down payments
          </div>
        </div>
        <button style={linkBtnStyle} onClick={() => navigate('/payments')}>View All →</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Customer', 'Project', 'Amount', 'Date', 'Status'].map((h, i) => (
                <th key={i} style={{ ...thStyle, textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map((pay) => {
              const sc = statusColor(pay.status);
              return (
                <tr key={pay.id}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--df-text)' }}>
                      {getName(customers, pay.customerId, 'name')}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>
                      {pay.type} · {pay.plotId}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.72rem', color: 'var(--df-text-soft)', maxWidth: '120px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getName(projects, pay.projectId, 'name')}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem', color: 'var(--df-text)', whiteSpace: 'nowrap' }}>
                    {fmtINR(pay.amount)}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.68rem', color: 'var(--df-text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {pay.paidDate || pay.dueDate}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <span style={{
                      padding: '2px 7px', borderRadius: '4px',
                      fontSize: '0.6rem', fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      color: sc.color, backgroundColor: sc.bg, whiteSpace: 'nowrap',
                    }}>{pay.status}</span>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--df-text-muted)', padding: '20px' }}>No payments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
