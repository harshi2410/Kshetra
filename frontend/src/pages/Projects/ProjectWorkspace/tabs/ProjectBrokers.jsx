import React, { useEffect, useState } from 'react';
import plotService from '../../../../services/plotService';
import brokersData from '../../../../data/brokers.json';
import paymentsData from '../../../../data/payments.json';
import { formatCurrency } from '../../../../utils/formatters';
import { cardStyle, cardHeaderStyle, cardTitleStyle, thStyle, tdStyle } from '../../components/dCardStyles';

export default function ProjectBrokers({ project }) {
  const [plots, setPlots] = useState([]);
  useEffect(() => { plotService.getPlotsByProject(project.id).then(setPlots); }, [project.id]);

  const brokerIds = [...new Set(plots.map(p => p.brokerId).filter(Boolean))];
  const brokers = brokersData.filter(b => brokerIds.includes(b.id));

  const getDeals = (bid) => plots.filter(p => p.brokerId === bid && p.status === 'Sold').length;
  const getRevenue = (bid) => plots.filter(p => p.brokerId === bid && p.status === 'Sold').reduce((s, p) => s + p.price, 0);
  const getCommission = (bid, rate) => getRevenue(bid) * (rate / 100);
  const getPaid = (bid) => paymentsData.filter(p => p.brokerId === bid && p.projectId === project.id && p.status === 'Completed').reduce((s, p) => s + p.amount, 0);

  return (
    <div style={cardStyle} className="mobile-card-compact">
      <div style={cardHeaderStyle}>
        <div style={cardTitleStyle}>Brokers — {project.name}</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>{brokers.length} brokers in this project</div>
      </div>
      <div className="table-responsive-container">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Broker', 'RERA ID', 'Deals', 'Revenue Generated', 'Commission', 'Paid', 'Status'].map((h, i) => (
                <th key={h} style={{ ...thStyle, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {brokers.length === 0 ? (
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--df-text-muted)', padding: '28px' }}>No brokers assigned to plots in this project yet.</td></tr>
            ) : brokers.map(b => {
              const comm = getCommission(b.id, b.commission);
              const paid = getPaid(b.id);
              const pending = Math.max(0, comm - paid);
              return (
                <tr key={b.id}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={tdStyle}><div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--df-text)' }}>{b.name}</div><div style={{ fontSize: '0.62rem', color: 'var(--df-text-muted)' }}>{b.contactPerson}</div></td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>{b.reraId}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.82rem', color: 'var(--df-text)' }}>{getDeals(b.id)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', color: 'var(--df-text)' }}>{formatCurrency(getRevenue(b.id))}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }}><div style={{ fontWeight: 700, color: 'var(--df-success)' }}>{formatCurrency(comm)}</div><div style={{ fontSize: '0.6rem', color: 'var(--df-text-muted)' }}>{b.commission}%</div></td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem', color: pending > 0 ? '#d97706' : 'var(--df-success)' }}>{pending > 0 ? `₹${(pending/100000).toFixed(1)}L pending` : 'Cleared'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', background: b.status === 'Active' ? 'rgba(21,128,61,0.08)' : 'rgba(100,116,139,0.08)', color: b.status === 'Active' ? 'var(--df-success)' : '#64748b' }}>{b.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
