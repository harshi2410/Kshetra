import React from 'react';
import { CreditCard, FileUp, BookmarkCheck, UserPlus } from 'lucide-react';
import { cardStyle, cardHeaderStyle, cardTitleStyle } from './dCardStyles';

const ACTIVITIES = [
  {
    id: 'act_1', icon: CreditCard,
    title: 'Payment Received',
    desc: '₹5,00,000 down payment — Plot A12, Sunrise Valley',
    time: '25 min ago',
    dot: 'var(--df-success)',
  },
  {
    id: 'act_2', icon: FileUp,
    title: 'Document Uploaded',
    desc: 'Sale Agreement signed by Rajesh Sharma (PDF 2.4 MB)',
    time: '1 hr ago',
    dot: 'var(--df-accent)',
  },
  {
    id: 'act_3', icon: BookmarkCheck,
    title: 'Plot Reserved',
    desc: 'Plot C08 in Sunrise Valley reserved for Priya Mehta',
    time: '3 hr ago',
    dot: '#d97706',
  },
  {
    id: 'act_4', icon: UserPlus,
    title: 'Customer Registered',
    desc: 'Amit Patel registered for Green Meadows Township',
    time: '5 hr ago',
    dot: 'var(--df-info, #1d4ed8)',
  },
  {
    id: 'act_5', icon: CreditCard,
    title: 'Installment Cleared',
    desc: '₹2,50,000 installment — Plot B07, Green Meadows',
    time: '7 hr ago',
    dot: 'var(--df-success)',
  },
];

export default function ActivityTimeline() {
  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div>
          <div style={cardTitleStyle}>Live Activity</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)', marginTop: '1px' }}>
            Recent updates across payments, plots &amp; customers
          </div>
        </div>
        <span style={{
          fontSize: '0.58rem', fontWeight: 800, padding: '2px 7px',
          borderRadius: '9999px', letterSpacing: '0.06em', textTransform: 'uppercase',
          backgroundColor: 'rgba(21,128,61,0.1)', color: 'var(--df-success)',
        }}>● LIVE</span>
      </div>

      <div style={{ padding: '4px 0' }}>
        {ACTIVITIES.map((act, i) => {
          const Icon = act.icon;
          return (
            <div key={act.id} style={{ position: 'relative', display: 'flex', gap: '10px', padding: '8px 12px' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {/* Vertical line */}
              {i < ACTIVITIES.length - 1 && (
                <div style={{
                  position: 'absolute', left: '19px', top: '28px', bottom: '-4px',
                  width: '1px', backgroundColor: 'var(--df-border)',
                }} />
              )}

              {/* Icon dot */}
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: act.dot, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0, marginTop: '2px',
                zIndex: 1,
              }}>
                <Icon style={{ width: '9px', height: '9px', color: '#fff', strokeWidth: 2.5 }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.77rem', fontWeight: 600, color: 'var(--df-text)' }}>
                    {act.title}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--df-text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {act.time}
                  </span>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--df-text-muted)', marginTop: '1px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {act.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
