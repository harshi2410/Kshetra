import React, { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import plotService from '../../../../services/plotService';
import paymentsData from '../../../../data/payments.json';
import brokersData from '../../../../data/brokers.json';
import { formatCurrency } from '../../../../utils/formatters';
import { cardStyle, cardHeaderStyle, cardTitleStyle } from '../../components/dCardStyles';

const COLORS = ['#7A1E3A', '#15803d', '#d97706', '#64748b'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ProjectAnalytics({ project }) {
  const [plots, setPlots] = useState([]);
  useEffect(() => { plotService.getPlotsByProject(project.id).then(setPlots); }, [project.id]);

  const payments = paymentsData.filter(p => p.projectId === project.id);

  // Monthly revenue from payments
  const monthlyRevenue = MONTHS.map((m, i) => ({
    month: m,
    collected: payments.filter(p => p.paidDate && new Date(p.paidDate).getMonth() === i && p.status === 'Completed').reduce((s, p) => s + p.amount, 0) / 100000,
  })).filter(m => m.collected > 0);

  // Plot status distribution
  const statusDist = ['Sold', 'Reserved', 'Available', 'Blocked'].map((s, i) => ({
    name: s, value: plots.filter(p => p.status === s).length, fill: COLORS[i],
  })).filter(s => s.value > 0);

  // Broker performance
  const brokerPerf = brokersData.map(b => ({
    name: b.name.split(' ')[0],
    deals: plots.filter(p => p.brokerId === b.id && p.status === 'Sold').length,
    revenue: plots.filter(p => p.brokerId === b.id && p.status === 'Sold').reduce((s, p) => s + p.price, 0) / 100000,
  })).filter(b => b.deals > 0);

  const totalRevenue = plots.filter(p => p.status === 'Sold').reduce((s, p) => s + p.price, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Quick stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1px',
        border: '1px solid var(--df-card-border)',
        borderRadius: '6px',
        overflow: 'hidden',
        background: 'var(--df-border)',
      }}>
        {[
          ['Total Revenue', formatCurrency(totalRevenue)],
          ['Plots Sold', plots.filter(p => p.status === 'Sold').length],
          ['Avg Plot Price', formatCurrency(plots.length ? plots.reduce((s, p) => s + p.price, 0) / plots.length : 0)],
          ['Payments Made', payments.filter(p => p.status === 'Completed').length],
        ].map(([l, v]) => (
          <div key={l} style={{ padding: '12px 14px', background: 'var(--df-card-bg)' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--df-text-muted)', marginBottom: '4px' }}>{l}</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--df-text)', fontFamily: 'monospace', lineHeight: 1 }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="responsive-grid-2" style={{ gap: '14px' }}>
        {/* Monthly Collections */}
        <div style={cardStyle} className="mobile-card-compact">
          <div style={cardHeaderStyle}><div style={cardTitleStyle}>Monthly Collections</div></div>
          <div style={{ padding: '10px 4px', height: '200px' }}>
            {monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue}>
                  <defs><linearGradient id="col" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7A1E3A" stopOpacity={0.15} /><stop offset="95%" stopColor="#7A1E3A" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${v}L`} axisLine={false} tickLine={false} width={45} />
                  <Tooltip formatter={v => [`₹${v.toFixed(1)}L`, 'Collected']} />
                  <Area type="monotone" dataKey="collected" stroke="#7A1E3A" strokeWidth={2} fill="url(#col)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--df-text-muted)', fontSize: '0.75rem' }}>No payment data yet</div>}
          </div>
        </div>

        {/* Plot Status Distribution */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}><div style={cardTitleStyle}>Plot Status</div></div>
          <div style={{ padding: '10px', height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="140">
                <PieChart>
                  <Pie data={statusDist} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                    {statusDist.map((s, i) => <Cell key={i} fill={s.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              {statusDist.map(s => <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.fill }} /><span style={{ color: 'var(--df-text-muted)' }}>{s.name} ({s.value})</span></div>)}
            </div>
          </div>
        </div>
      </div>

      {/* Broker Performance */}
      {brokerPerf.length > 0 && (
        <div style={cardStyle}>
          <div style={cardHeaderStyle}><div style={cardTitleStyle}>Broker Performance</div></div>
          <div style={{ padding: '10px 4px', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brokerPerf} barSize={24}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}L`} axisLine={false} tickLine={false} width={35} />
                <Tooltip formatter={v => [`₹${v.toFixed(1)}L`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#7A1E3A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
