import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { cardStyle, cardHeaderStyle, cardTitleStyle } from './dCardStyles';

const COLORS = { Sold: '#7A1E3A', Available: '#15803d', Blocked: '#b91c1c', Reserved: '#d97706' };

export default function PlotDistributionChart({ data }) {
  const plotData = data || [
    { status: 'Sold',      count: 132, percentage: 43.7 },
    { status: 'Available', count: 148, percentage: 49.0 },
    { status: 'Blocked',   count: 12,  percentage: 4.0  },
    { status: 'Reserved',  count: 10,  percentage: 3.3  },
  ];
  const total = plotData.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
      <div style={cardHeaderStyle}>
        <div>
          <div style={cardTitleStyle}>Plot Inventory</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>
            {total} plots across active sites
          </div>
        </div>
      </div>

      {/* Donut */}
      <div style={{ position: 'relative', padding: '12px' }}>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={plotData} cx="50%" cy="50%" innerRadius={45} outerRadius={68}
              paddingAngle={3} dataKey="count">
              {plotData.map((e, i) => (
                <Cell key={i} fill={COLORS[e.status] || '#888'} stroke="var(--df-card-bg)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div style={{ backgroundColor: 'var(--df-card-bg)', border: '1px solid var(--df-border)', borderRadius: '6px', padding: '6px 10px', fontSize: '11px' }}>
                    <strong style={{ color: 'var(--df-text)' }}>{d.status}</strong>
                    <div style={{ color: 'var(--df-text-muted)' }}>{d.count} plots ({d.percentage}%)</div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--df-text)', fontFamily: 'var(--font-mono)' }}>{total}</div>
          <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--df-text-muted)' }}>Total</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: '0 12px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
        {plotData.map((item) => (
          <div key={item.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', borderRadius: '4px', backgroundColor: 'var(--df-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[item.status], display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--df-text-soft)' }}>{item.status}</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--df-text)', fontFamily: 'var(--font-mono)' }}>{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
