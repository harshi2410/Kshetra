import React, { useEffect, useState } from 'react';
import plotService from '../../../../services/plotService';
import customersData from '../../../../data/customers.json';
import paymentsData from '../../../../data/payments.json';
import { formatCurrency } from '../../../../utils/formatters';
import { cardStyle, cardHeaderStyle, cardTitleStyle, thStyle, tdStyle } from '../../components/dCardStyles';

export default function ProjectCustomers({ project }) {
  const [plots, setPlots] = useState([]);

  useEffect(() => { plotService.getPlotsByProject(project.id).then(setPlots); }, [project.id]);

  const customerIds = [...new Set(plots.map(p => p.customerId).filter(Boolean))];
  const customers = customersData.filter(c => customerIds.includes(c.id));

  const getPaid = (custId) => paymentsData.filter(p => p.customerId === custId && p.projectId === project.id && p.status === 'Completed').reduce((s, p) => s + p.amount, 0);
  const getOutstanding = (custId) => paymentsData.filter(p => p.customerId === custId && p.projectId === project.id && p.status === 'Pending').reduce((s, p) => s + p.amount, 0);
  const getPlot = (custId) => plots.find(p => p.customerId === custId);

  return (
    <div style={cardStyle} className="mobile-card-compact">
      <div style={cardHeaderStyle}>
        <div style={cardTitleStyle}>Customers — {project.name}</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>{customers.length} customers in this project</div>
      </div>
      <div className="table-responsive-container">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Customer', 'Phone', 'City', 'Plot', 'Total Paid', 'Outstanding'].map((h, i) => (
                <th key={h} style={{ ...thStyle, textAlign: i >= 4 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--df-text-muted)', padding: '28px' }}>No customers assigned to plots in this project yet.</td></tr>
            ) : customers.map(c => {
              const plot = getPlot(c.id);
              return (
                <tr key={c.id}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={tdStyle}><div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--df-text)' }}>{c.name}</div><div style={{ fontSize: '0.62rem', color: 'var(--df-text-muted)' }}>{c.email}</div></td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.72rem' }}>{c.phone}</td>
                  <td style={{ ...tdStyle, fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>{c.city}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', color: 'var(--df-accent)' }}>{plot?.plotNo || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', color: 'var(--df-success)' }}>{formatCurrency(getPaid(c.id))}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.78rem', color: '#d97706' }}>{formatCurrency(getOutstanding(c.id))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
