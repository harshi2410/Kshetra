import React, { useState, useMemo } from 'react';
import { Search, CreditCard, Plus, Filter, Calendar, CheckCircle2, Clock, FileText, ArrowDownRight } from 'lucide-react';
import paymentsData from '../../data/payments.json';
import customersData from '../../data/customers.json';
import projectsData from '../../data/projects.json';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function Payments() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const getCustomerName = (cid) => {
    const c = customersData.find(x => x.id === cid);
    return c ? c.name : 'Unknown Customer';
  };

  const getProjectName = (pid) => {
    const p = projectsData.find(x => x.id === pid);
    return p ? p.name : 'Sunrise Valley';
  };

  const filtered = useMemo(() => {
    return paymentsData.filter((p) => {
      const q = search.toLowerCase();
      const custName = getCustomerName(p.customerId).toLowerCase();
      const matchSearch = !q || custName.includes(q) || p.receipt?.toLowerCase().includes(q) || p.type.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const totalCollected = paymentsData.filter(p => p.status === 'Completed').reduce((s, p) => s + p.amount, 0);
  const totalPending = paymentsData.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);

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
              Payment Ledger & Collections
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)', border: '1px solid var(--df-accent-medium)' }}>
              {paymentsData.length} Transactions
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--df-text-muted)', marginTop: '4px', margin: 0 }}>
            Monitor cash inflows, down payments, bank transfers, overdue installments, and receipts.
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
          <CreditCard style={{ width: '15px', height: '15px' }} /> Record Payment
        </button>
      </div>

      {/* ── KPI Counter Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
      }}>
        {[
          { label: 'Total Collections', value: formatCurrency(totalCollected), color: 'var(--df-success)' },
          { label: 'Pending Due Inflows', value: formatCurrency(totalPending), color: '#d97706' },
          { label: 'Completed Transactions', value: paymentsData.filter(p => p.status === 'Completed').length, color: 'var(--df-text)' },
          { label: 'Collection Efficiency', value: `${Math.round((totalCollected / (totalCollected + totalPending || 1)) * 100)}%`, color: 'var(--df-accent)' },
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

      {/* ── Search & Filter Controls ── */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 240px', minWidth: '200px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--df-text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by customer, receipt number, payment type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: '36px', padding: '0 12px 0 32px',
              backgroundColor: 'var(--df-input-bg)', border: '1px solid var(--df-border-input)',
              borderRadius: '6px', fontSize: '13px', color: 'var(--df-text)', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'Completed', 'Pending'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                height: '34px', padding: '0 12px', borderRadius: '6px',
                border: '1px solid var(--df-border)',
                background: statusFilter === st ? 'var(--df-accent)' : 'var(--df-bg)',
                color: statusFilter === st ? '#ffffff' : 'var(--df-text)',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Payments Table ── */}
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
                {['RECEIPT & CUSTOMER', 'PROJECT & PLOT', 'PAYMENT TYPE', 'METHOD', 'AMOUNT', 'DATE / DUE', 'STATUS'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', letterSpacing: '0.04em', textAlign: i === 4 ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: '1px solid var(--df-border)', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--df-text)', fontSize: '13px' }}>{getCustomerName(p.customerId)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--df-text-muted)', fontFamily: 'var(--font-mono)' }}>{p.receipt || 'Pending Generation'}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--df-text)' }}>{getProjectName(p.projectId)}</div>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)' }}>
                      {p.plotId ? p.plotId.replace('plot_', 'Plot ') : 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12.5px', color: 'var(--df-text-soft)', fontWeight: 600 }}>
                    {p.type}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--df-text-muted)' }}>
                    {p.method}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '14px', color: p.status === 'Completed' ? 'var(--df-success)' : '#d97706' }}>
                    {formatCurrency(p.amount)}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--df-text-soft)' }}>
                    {p.paidDate ? formatDate(p.paidDate) : `Due ${formatDate(p.dueDate)}`}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase',
                      background: p.status === 'Completed' ? 'var(--df-success-soft)' : 'rgba(217,119,6,0.1)',
                      color: p.status === 'Completed' ? 'var(--df-success)' : '#d97706',
                      border: p.status === 'Completed' ? '1px solid rgba(22,163,74,0.25)' : '1px solid rgba(217,119,6,0.25)'
                    }}>
                      {p.status}
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
