import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cardStyle, cardHeaderStyle, cardTitleStyle, thStyle, tdStyle, linkBtnStyle } from './dCardStyles';

const rankStyle = (i) => i === 0
  ? { backgroundColor: 'var(--df-accent)', color: '#fff', fontWeight: 800 }
  : i === 1
  ? { backgroundColor: 'rgba(122,30,58,0.12)', color: 'var(--df-accent)', fontWeight: 700 }
  : { backgroundColor: 'var(--df-bg)', color: 'var(--df-text-muted)', fontWeight: 600, border: '1px solid var(--df-border)' };

export default function BrokerLeaderboard({ brokers }) {
  const navigate = useNavigate();
  const rows = brokers?.slice(0, 5) || [];

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div>
          <div style={cardTitleStyle}>Broker Performance</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>
            Partner channel leaderboard by deals closed
          </div>
        </div>
        <button style={linkBtnStyle} onClick={() => navigate('/brokers')}>View All →</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Rank', 'Broker', 'Deals', 'Commission', 'Status'].map((h, i) => (
                <th key={i} style={{ ...thStyle, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map((broker, i) => (
              <tr key={broker.id}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {/* Rank */}
                <td style={{ ...tdStyle, width: '48px' }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontFamily: 'var(--font-mono)',
                    ...rankStyle(i),
                  }}>
                    #{i + 1}
                  </div>
                </td>

                {/* Broker info */}
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--df-text)' }}>
                    {broker.name}
                    {i === 0 && (
                      <span style={{
                        marginLeft: '6px', padding: '1px 5px', borderRadius: '3px',
                        fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.06em',
                        textTransform: 'uppercase', backgroundColor: 'var(--df-accent-soft)',
                        color: 'var(--df-accent)',
                      }}>TOP</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>
                    {broker.contactPerson} · {broker.reraId}
                  </div>
                </td>

                {/* Deals */}
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--df-text)' }}>
                  {broker.totalDeals}
                </td>

                {/* Commission */}
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--df-success)' }}>
                    ₹{((broker.totalEarned || 500000) / 100000).toFixed(1)}L
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--df-text-muted)' }}>{broker.commission}%</div>
                </td>

                {/* Status */}
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <span style={{
                    padding: '2px 7px', borderRadius: '4px',
                    fontSize: '0.6rem', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    color: broker.status === 'Active' ? 'var(--df-success)' : 'var(--df-text-muted)',
                    backgroundColor: broker.status === 'Active' ? 'var(--df-success-soft)' : 'var(--df-bg)',
                  }}>{broker.status || 'Active'}</span>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--df-text-muted)', padding: '20px' }}>No broker data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
