import React, { useState, useMemo } from 'react';
import { 
  Search, CreditCard, Plus, Filter, Calendar, CheckCircle2, 
  Clock, FileText, ArrowDownRight, Download, Eye, X, Check, Building2, User, ShieldCheck
} from 'lucide-react';
import initialPayments from '../../data/payments.json';
import customersData from '../../data/customers.json';
import projectsData from '../../data/projects.json';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PAYMENTS_STORAGE_KEY = 'landos_payments_vault';

export default function Payments() {
  const [payments, setPayments] = useState(() => {
    try {
      const saved = localStorage.getItem(PAYMENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialPayments;
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // New Payment Form state
  const [form, setForm] = useState({
    customerId: customersData[0]?.id || 'cust_001',
    customerName: customersData[0]?.name || 'Rajesh Sharma',
    projectId: projectsData[0]?.id || 'proj_001',
    plotId: 'P-01',
    amount: '',
    type: 'Down Payment (50%)',
    method: 'RTGS / NEFT',
    status: 'Completed',
    dueDate: new Date().toISOString().split('T')[0],
    paidDate: new Date().toISOString().split('T')[0],
    bankName: 'HDFC Bank',
    transactionRef: '',
    notes: ''
  });

  const saveToStorage = (updated) => {
    setPayments(updated);
    try {
      localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const getCustomerName = (cid, fallbackName) => {
    if (fallbackName) return fallbackName;
    const c = customersData.find(x => x.id === cid);
    return c ? c.name : 'Rajesh Sharma';
  };

  const getProjectName = (pid) => {
    const p = projectsData.find(x => x.id === pid);
    return p ? p.name : 'Pune Green Enclave';
  };

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const q = search.toLowerCase();
      const custName = getCustomerName(p.customerId, p.customerName).toLowerCase();
      const projName = getProjectName(p.projectId).toLowerCase();
      const matchSearch = !q || custName.includes(q) || projName.includes(q) || p.receipt?.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.plotId?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, search, statusFilter]);

  const totalCollected = payments.filter(p => p.status === 'Completed').reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status === 'Pending').reduce((s, p) => s + Number(p.amount || 0), 0);

  const handleRecordPayment = (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const receiptNo = `REC-${new Date().getFullYear()}-${String(payments.length + 1).padStart(3, '0')}`;
    const newEntry = {
      id: `pay_${Date.now()}`,
      customerId: form.customerId,
      customerName: getCustomerName(form.customerId, form.customerName),
      projectId: form.projectId,
      plotId: form.plotId || 'P-01',
      plotNo: form.plotId || 'P-01',
      amount: Number(form.amount),
      type: form.type,
      method: form.method,
      status: form.status,
      dueDate: form.dueDate,
      paidDate: form.status === 'Completed' ? (form.paidDate || new Date().toISOString().split('T')[0]) : null,
      receipt: receiptNo,
      transactionRef: form.transactionRef || `TXN${Date.now().toString().slice(-8)}`,
      bankName: form.bankName || 'HDFC Bank',
      notes: form.notes,
      createdAt: new Date().toISOString()
    };

    const updated = [newEntry, ...payments];
    saveToStorage(updated);
    setIsRecordModalOpen(false);
    setForm({
      customerId: customersData[0]?.id || 'cust_001',
      customerName: customersData[0]?.name || 'Rajesh Sharma',
      projectId: projectsData[0]?.id || 'proj_001',
      plotId: 'P-01',
      amount: '',
      type: 'Down Payment (50%)',
      method: 'RTGS / NEFT',
      status: 'Completed',
      dueDate: new Date().toISOString().split('T')[0],
      paidDate: new Date().toISOString().split('T')[0],
      bankName: 'HDFC Bank',
      transactionRef: '',
      notes: ''
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'landos-fade-in 0.2s ease-out' }}>
      
      {/* ── Page Header ── */}
      <div className="page-header-container responsive-stack" style={{
        padding: '14px 18px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        boxShadow: 'var(--df-shadow-xs)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--df-text)', margin: 0, lineHeight: 1.2 }}>
              Payment Ledger & Inflow Collections
            </h1>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)', border: '1px solid rgba(159,18,57,0.25)' }}>
              {payments.length} Transactions
            </span>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--df-text-muted)', marginTop: '3px', margin: 0 }}>
            Track real estate inflows, token advances, installment schedules, bank transactions, and instant receipt issuance.
          </p>
        </div>

        <button
          onClick={() => setIsRecordModalOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            height: '36px', padding: '0 16px', borderRadius: '6px',
            background: 'var(--df-accent)', color: '#ffffff', border: 'none',
            fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(159,18,57,0.3)'
          }}
        >
          <CreditCard style={{ width: '14px', height: '14px' }} /> Record New Payment
        </button>
      </div>

      {/* ── KPI Counter Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
      }}>
        {[
          { label: 'Total Collections', value: formatCurrency(totalCollected), color: 'var(--df-success)' },
          { label: 'Pending Due Inflows', value: formatCurrency(totalPending), color: '#d97706' },
          { label: 'Completed Transactions', value: `${payments.filter(p => p.status === 'Completed').length} Receipts`, color: 'var(--df-text)' },
          { label: 'Collection Efficiency', value: `${Math.round((totalCollected / (totalCollected + totalPending || 1)) * 100)}%`, color: 'var(--df-accent)' },
        ].map((k, i) => (
          <div
            key={i}
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--df-card-bg)',
              border: '1px solid var(--df-card-border)',
              borderRadius: '8px',
              boxShadow: 'var(--df-shadow-xs)'
            }}
          >
            <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {k.label}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: k.color, fontFamily: 'var(--font-mono, monospace)' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Controls ── */}
      <div style={{
        padding: '10px 14px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 240px', minWidth: '200px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--df-text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by customer, receipt number, project, or plot…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: '34px', padding: '0 12px 0 32px',
              backgroundColor: 'var(--df-bg)', border: '1px solid var(--df-border)',
              borderRadius: '6px', fontSize: '0.78rem', color: 'var(--df-text)', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'Completed', 'Pending'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                height: '32px', padding: '0 12px', borderRadius: '5px',
                border: statusFilter === st ? '1px solid var(--df-accent)' : '1px solid var(--df-border)',
                background: statusFilter === st ? 'var(--df-accent)' : 'var(--df-bg)',
                color: statusFilter === st ? '#ffffff' : 'var(--df-text)',
                fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
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
                {['RECEIPT & CUSTOMER', 'PROJECT & PLOT', 'STAGE / TYPE', 'METHOD & BANK', 'AMOUNT (₹)', 'DATE / DUE', 'STATUS', 'ACTION'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--df-text-muted)', letterSpacing: '0.04em', textAlign: i === 4 ? 'right' : 'left' }}>
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
                    <div style={{ fontWeight: 800, color: 'var(--df-text)', fontSize: '0.80rem' }}>{getCustomerName(p.customerId, p.customerName)}</div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--df-text-muted)', fontFamily: 'var(--font-mono)' }}>{p.receipt || 'REC-PENDING'}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--df-text)' }}>{getProjectName(p.projectId)}</div>
                    <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)' }}>
                      Plot {p.plotId || p.plotNo || 'P-01'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '0.76rem', color: 'var(--df-text-soft)', fontWeight: 600 }}>
                    {p.type}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>
                    <div>{p.method}</div>
                    {p.bankName && <div style={{ fontSize: '0.66rem', color: 'var(--df-text-muted)' }}>{p.bankName}</div>}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.86rem', color: p.status === 'Completed' ? 'var(--df-success)' : '#d97706' }}>
                    {formatCurrency(p.amount)}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '0.72rem', color: 'var(--df-text-soft)' }}>
                    {p.paidDate ? formatDate(p.paidDate) : `Due ${formatDate(p.dueDate)}`}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      padding: '2px 7px', borderRadius: '4px', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase',
                      background: p.status === 'Completed' ? 'var(--df-success-soft)' : 'rgba(217,119,6,0.1)',
                      color: p.status === 'Completed' ? 'var(--df-success)' : '#d97706',
                      border: p.status === 'Completed' ? '1px solid rgba(22,163,74,0.25)' : '1px solid rgba(217,119,6,0.25)'
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button
                      onClick={() => setSelectedReceipt(p)}
                      style={{
                        padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--df-border)',
                        background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '0.70rem', fontWeight: 700,
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px'
                      }}
                    >
                      <Eye style={{ width: '11px', height: '11px', color: 'var(--df-accent)' }} /> Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Record Payment Modal ── */}
      {isRecordModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
            borderRadius: '10px', width: 'min(500px, 94vw)', maxHeight: '90vh', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', boxShadow: 'var(--df-shadow-xl)',
            animation: 'landos-fade-in 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--df-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard style={{ width: '18px', height: '18px', color: 'var(--df-accent)' }} />
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  Record Payment Transaction
                </span>
              </div>
              <button onClick={() => setIsRecordModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                  Project
                </label>
                <select
                  value={form.projectId}
                  onChange={e => setForm({ ...form, projectId: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem' }}
                >
                  {projectsData.map(p => <option key={p.id} value={p.id}>{p.name} ({p.location})</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Customer / Buyer
                  </label>
                  <select
                    value={form.customerId}
                    onChange={e => {
                      const cid = e.target.value;
                      const c = customersData.find(x => x.id === cid);
                      setForm({ ...form, customerId: cid, customerName: c?.name || '' });
                    }}
                    style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem' }}
                  >
                    {customersData.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Plot Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. P-01"
                    value={form.plotId}
                    onChange={e => setForm({ ...form, plotId: e.target.value })}
                    style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  placeholder="Payment Amount in ₹"
                  required
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-accent)', fontWeight: 800, fontSize: '0.86rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Payment Stage / Type
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem' }}
                  >
                    <option value="Token Advance (10%)">Token Advance (10%)</option>
                    <option value="Down Payment (50%)">Down Payment (50%)</option>
                    <option value="Agreement Stage (75%)">Agreement Stage (75%)</option>
                    <option value="Final Registry Settlement">Final Registry Settlement</option>
                    <option value="Full Payment (100%)">Full Payment (100%)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Payment Mode
                  </label>
                  <select
                    value={form.method}
                    onChange={e => setForm({ ...form, method: e.target.value })}
                    style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem' }}
                  >
                    <option value="RTGS / NEFT">RTGS / NEFT</option>
                    <option value="UPI / Net Banking">UPI / Net Banking</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Demand Draft (DD)">Demand Draft (DD)</option>
                    <option value="Cash Deposit">Cash Deposit</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem' }}
                  >
                    <option value="Completed">Completed (Cleared)</option>
                    <option value="Pending">Pending (Due)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Bank Reference / UTR
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC9928104"
                    value={form.transactionRef}
                    onChange={e => setForm({ ...form, transactionRef: e.target.value })}
                    style={{ width: '100%', height: '34px', padding: '0 8px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-text)', fontSize: '0.76rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ padding: '12px 0 0 0', borderTop: '1px solid var(--df-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  style={{ padding: '7px 14px', borderRadius: '5px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', color: 'var(--df-text)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 18px', borderRadius: '5px', background: 'var(--df-accent)', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(159,18,57,0.3)' }}
                >
                  Save & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Receipt Modal ── */}
      {selectedReceipt && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
            borderRadius: '10px', width: 'min(520px, 94vw)', display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--df-shadow-xl)', animation: 'landos-fade-in 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--df-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck style={{ width: '18px', height: '18px', color: 'var(--df-accent)' }} />
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  Official Payment Receipt ({selectedReceipt.receipt || 'REC-2024-001'})
                </span>
              </div>
              <button onClick={() => setSelectedReceipt(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px dashed var(--df-border)' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--df-accent)' }}>
                    Kshetra LandOS
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)' }}>
                    Real Estate Operating System & Plotting Registry
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--df-text)' }}>{selectedReceipt.receipt}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)' }}>Date: {formatDate(selectedReceipt.paidDate || selectedReceipt.dueDate)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.76rem' }}>
                <div style={{ padding: '8px 10px', background: 'var(--df-bg)', borderRadius: '6px', border: '1px solid var(--df-border)' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--df-text-muted)', textTransform: 'uppercase' }}>Buyer / Customer</div>
                  <div style={{ fontWeight: 800, color: 'var(--df-text)', marginTop: '2px' }}>{getCustomerName(selectedReceipt.customerId, selectedReceipt.customerName)}</div>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--df-bg)', borderRadius: '6px', border: '1px solid var(--df-border)' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--df-text-muted)', textTransform: 'uppercase' }}>Project & Plot</div>
                  <div style={{ fontWeight: 800, color: 'var(--df-text)', marginTop: '2px' }}>{getProjectName(selectedReceipt.projectId)} (Plot {selectedReceipt.plotId || selectedReceipt.plotNo})</div>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'var(--df-accent-soft)', borderRadius: '6px', border: '1px solid rgba(159,18,57,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--df-accent)' }}>{selectedReceipt.type}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>Via {selectedReceipt.method} {selectedReceipt.transactionRef ? `• Ref: ${selectedReceipt.transactionRef}` : ''}</div>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--df-accent)', fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(selectedReceipt.amount)}
                </div>
              </div>

              <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)', textAlign: 'center', marginTop: '4px' }}>
                ✓ Digitally generated transaction record with bank settlement reference.
              </div>
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--df-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{ padding: '6px 14px', borderRadius: '5px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', color: 'var(--df-text)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => alert(`Receipt ${selectedReceipt.receipt} downloaded to local storage!`)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 16px', borderRadius: '5px', background: 'var(--df-accent)', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(159,18,57,0.3)' }}
              >
                <Download style={{ width: '13px', height: '13px' }} /> Download Receipt (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
