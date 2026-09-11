import React, { useState, useMemo } from 'react';
import { Search, UserCheck, Award, Phone, Mail, FileBadge, IndianRupee, TrendingUp, CheckCircle } from 'lucide-react';
import brokersData from '../../data/brokers.json';
import { formatCurrency } from '../../utils/formatters';

export default function Brokers() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return brokersData.filter((b) => {
      const q = search.toLowerCase();
      return !q || b.name.toLowerCase().includes(q) || b.contactPerson.toLowerCase().includes(q) || b.reraId.toLowerCase().includes(q) || b.phone.includes(q);
    });
  }, [search]);

  const totalDeals = brokersData.reduce((s, b) => s + (b.totalDeals || 0), 0);
  const totalEarned = brokersData.reduce((s, b) => s + (b.totalEarned || 0), 0);
  const pendingPayouts = brokersData.reduce((s, b) => s + (b.pendingPayout || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'landos-fade-in 0.2s ease-out' }}>
      
      {/* ── Page Header ── */}
      <div className="page-header-container responsive-stack" style={{
        padding: '16px 20px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '10px',
        boxShadow: 'var(--df-shadow-xs)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--df-text)', margin: 0, lineHeight: 1.2 }}>
              Channel Partners & Broker Network
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)', border: '1px solid var(--df-accent-medium)' }}>
              {brokersData.length} Certified Agencies
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--df-text-muted)', marginTop: '4px', margin: 0 }}>
            Manage RERA registrations, deal commissions, sales incentives, and payout reconciliation.
          </p>
        </div>

        <button
          className="w-full-on-mobile"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            height: '38px', padding: '0 18px', borderRadius: '8px',
            background: 'var(--df-accent)', color: '#ffffff', border: 'none',
            fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            boxShadow: 'var(--df-shadow-glow)'
          }}
        >
          <Award style={{ width: '15px', height: '15px' }} /> Onboard Broker
        </button>
      </div>

      {/* ── KPI Counter Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
      }}>
        {[
          { label: 'Active Brokers', value: brokersData.length, color: 'var(--df-text)' },
          { label: 'Total Deals Closed', value: `${totalDeals} Deals`, color: '#3b82f6' },
          { label: 'Commission Disbursed', value: formatCurrency(totalEarned), color: 'var(--df-success)' },
          { label: 'Pending Payouts', value: formatCurrency(pendingPayouts), color: '#d97706' },
        ].map((k, i) => (
          <div
            key={i}
            style={{
              padding: '14px 18px',
              backgroundColor: 'var(--df-card-bg)',
              border: '1px solid var(--df-card-border)',
              borderRadius: '8px',
              boxShadow: 'var(--df-shadow-xs)'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', letterSpacing: '0.05em', marginBottom: '6px' }}>
              {k.label}
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: k.color, fontFamily: 'var(--font-mono, monospace)' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Search Bar ── */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--df-text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by agency, contact person, RERA ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: '36px', padding: '0 12px 0 32px',
              backgroundColor: 'var(--df-input-bg)', border: '1px solid var(--df-border-input)',
              borderRadius: '6px', fontSize: '13px', color: 'var(--df-text)', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* ── Brokers Table ── */}
      <div style={{
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        boxShadow: 'var(--df-shadow-xs)',
        overflow: 'hidden'
      }}>
        <div className="table-responsive-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--df-bg)', borderBottom: '1px solid var(--df-border)' }}>
                {['AGENCY / BROKER', 'RERA REGISTRATION', 'CONTACT INFO', 'COMMISSION RATE', 'DEALS CLOSED', 'TOTAL PAID', 'PENDING PAYOUT', 'STATUS'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', letterSpacing: '0.04em', textAlign: [4, 5, 6].includes(i) ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  style={{ borderBottom: '1px solid var(--df-border)', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--df-text)', fontSize: '13px' }}>{b.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--df-text-muted)' }}>Rep: {b.contactPerson}</div>
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--df-text-soft)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px', borderRadius: '4px', background: 'var(--df-bg)', border: '1px solid var(--df-border)' }}>
                      <FileBadge style={{ width: '11px', height: '11px', color: 'var(--df-accent)' }} /> {b.reraId}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--df-text-soft)' }}>
                      <Phone style={{ width: '12px', height: '12px', color: 'var(--df-accent)' }} /> {b.phone}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--df-text-muted)', marginTop: '2px' }}>
                      <Mail style={{ width: '11px', height: '11px' }} /> {b.email}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--df-accent)' }}>
                      {b.commission}% per deal
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '13.5px', color: 'var(--df-text)' }}>
                    {b.totalDeals}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '13px', color: 'var(--df-success)' }}>
                    {formatCurrency(b.totalEarned)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12.5px', color: b.pendingPayout > 0 ? '#d97706' : 'var(--df-text-muted)' }}>
                    {b.pendingPayout > 0 ? formatCurrency(b.pendingPayout) : 'Cleared'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', background: 'var(--df-success-soft)', color: 'var(--df-success)', border: '1px solid rgba(22,163,74,0.25)' }}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
