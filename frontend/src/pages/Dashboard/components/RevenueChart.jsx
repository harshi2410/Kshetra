import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { cardStyle, cardHeaderStyle, cardTitleStyle, cardBodyStyle } from './dCardStyles';

const fmtL = (v) => v >= 10000000 ? `₹${(v/10000000).toFixed(1)}Cr` : `₹${(v/100000).toFixed(0)}L`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: 'var(--df-card-bg)', border: '1px solid var(--df-border)',
      borderRadius: '6px', padding: '8px 10px', fontSize: '11px',
      boxShadow: 'var(--df-shadow-md)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--df-text)' }}>{label}</p>
      {payload.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--df-text-soft)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: e.color, display: 'inline-block' }} />
          {e.name}: <strong style={{ color: 'var(--df-text)' }}>{fmtL(e.value)}</strong>
        </div>
      ))}
    </div>
  );
};

export default function RevenueChart({ data }) {
  const chartData = data || [
    { month: 'Jan', revenue: 8500000, target: 9000000 },
    { month: 'Feb', revenue: 11200000, target: 10000000 },
    { month: 'Mar', revenue: 9800000, target: 10000000 },
    { month: 'Apr', revenue: 13400000, target: 12000000 },
    { month: 'May', revenue: 12100000, target: 12000000 },
    { month: 'Jun', revenue: 15600000, target: 14000000 },
    { month: 'Jul', revenue: 14200000, target: 14000000 },
  ];

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div>
          <div style={cardTitleStyle}>Monthly Revenue Performance</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>
            Actual collections vs planned targets (2025)
          </div>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '2px 8px',
          borderRadius: '9999px', backgroundColor: 'var(--df-accent-soft)',
          color: 'var(--df-accent)', letterSpacing: '0.04em',
        }}>MONTHLY</span>
      </div>
      <div style={{ ...cardBodyStyle, paddingTop: '12px' }}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#7A1E3A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7A1E3A" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#C9A87C" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#C9A87C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--df-border)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--df-text-muted)" fontSize={10} tickLine={false} axisLine={false} dy={4} />
            <YAxis stroke="var(--df-text-muted)" fontSize={10} tickFormatter={fmtL} tickLine={false} axisLine={false} width={52} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" iconSize={8} />
            <Area type="monotone" dataKey="revenue" name="Actual Revenue" stroke="#7A1E3A" strokeWidth={2} fill="url(#rGrad)" />
            <Area type="monotone" dataKey="target"  name="Target Revenue" stroke="#C9A87C" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#tGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
