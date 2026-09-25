import React, { useState, useMemo } from 'react';
import { CreditCard, Plus, Eye, Download, X, CheckCircle2, ShieldCheck, User } from 'lucide-react';
import initialPayments from '../../../../data/payments.json';
import customersData from '../../../../data/customers.json';
import { formatCurrency, formatDate } from '../../../../utils/formatters';

const PAYMENTS_STORAGE_KEY = 'landos_payments_vault';

const statusColor = (s) => s === 'Completed' 
  ? { color: 'var(--df-success)', bg: 'var(--df-success-soft)', border: '1px solid rgba(22,163,74,0.3)' } 
  : { color: '#d97706', bg: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.3)' };

export default function ProjectPayments({ project }) {
  const [payments, setPayments] = useState(() => {
    try {
      const saved = localStorage.getItem(PAYMENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialPayments;
  });

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Form State
  const [form, setForm] = useState({
    customerId: customersData[0]?.id || 'cust_001',
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

  const projectPayments = useMemo(() => {
    const list = payments.filter(p => p.projectId === project.id);
    if (list.length > 0) return list;
    // If newly created project, provide demo transactions linked to project
    return [
      {
        id: `pay_proj_${project.id}_1`,
        customerId: 'cust_001',
        customerName: 'Rajesh Sharma',
        projectId: project.id,
        plotId: 'P-01',
        plotNo: 'P-01',
        amount: 1200000,
        type: 'Down Payment (50%)',
        method: 'RTGS / NEFT',
        status: 'Completed',
        dueDate: '2024-02-15',
        paidDate: '2024-02-14',
        receipt: 'REC-2024-001',
        bankName: 'HDFC Bank',
        transactionRef: 'HDFC0098421948',
        notes: 'Token and initial down payment received'
      },
      {
        id: `pay_proj_${project.id}_2`,
        customerId: 'cust_002',
        customerName: 'Priya Mehta',
        projectId: project.id,
        plotId: 'P-02',
        plotNo: 'P-02',
        amount: 1800000,
        type: 'Agreement Stage (75%)',
        method: 'Bank Transfer',
        status: 'Completed',
        dueDate: '2024-03-20',
        paidDate: '2024-03-18',
        receipt: 'REC-2024-002',
        bankName: 'ICICI Bank',
        transactionRef: 'ICIC884729104',
        notes: 'Agreement to sale executed with 75% consideration'
      },
      {
        id: `pay_proj_${project.id}_3`,
        customerId: 'cust_004',
        customerName: 'Vikram Singhania',
        projectId: project.id,
        plotId: 'P-05',
        plotNo: 'P-05',
        amount: 1500000,
        type: 'Token & Down Payment',
        method: 'UPI / Net Banking',
        status: 'Completed',
        dueDate: '2024-08-10',
        paidDate: '2024-08-05',
        receipt: 'REC-2024-003',
        bankName: 'Axis Bank',
        transactionRef: 'UPI/4281948291/IND',
        notes: 'Reservation advance confirmed'
      },
      {
        id: `pay_proj_${project.id}_4`,
        customerId: 'cust_002',
        customerName: 'Priya Mehta',
        projectId: project.id,
        plotId: 'P-02',
        plotNo: 'P-02',
        amount: 600000,
        type: 'Final Registry Balance',
        method: 'Cheque',
        status: 'Pending',
        dueDate: '2025-05-15',
        paidDate: null,
        receipt: 'REC-2025-014',
        bankName: 'Kotak Mahindra Bank',
        transactionRef: 'CHQ-883921',
        notes: 'Post-dated cheque for final registry'
      }
    ];
  }, [payments, project.id]);

  const total   = projectPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const paid    = projectPayments.filter(p => p.status === 'Completed').reduce((s, p) => s + Number(p.amount || 0), 0);
  const pending = projectPayments.filter(p => p.status === 'Pending').reduce((s, p) => s + Number(p.amount || 0), 0);

  const getName = (id, fallback) => {
    if (fallback) return fallback;
    return customersData.find(c => c.id === id)?.name || id || 'Rajesh Sharma';
  };

  const handleRecordPayment = (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const c = customersData.find(x => x.id === form.customerId);
    const receiptNo = `REC-${new Date().getFullYear()}-${String(payments.length + 1).padStart(3, '0')}`;
    const newEntry = {
      id: `pay_${Date.now()}`,
      customerId: form.customerId,
      customerName: c?.name || 'Rajesh Sharma',
      projectId: project.id,
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
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Header & Quick stats */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
        padding: '12px 16px', background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)', borderRadius: '8px'
      }}>
        <div>
          <div style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--df-text)' }}>
            Project Payment Ledger — {project.name}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
            Consolidated collection schedule, stage milestones, and verified bank receipts.
          </div>
        </div>

        <button
          onClick={() => setIsRecordModalOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
            borderRadius: '6px', background: 'var(--df-accent)', color: '#ffffff', border: 'none',
            fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(159,18,57,0.3)'
          }}
        >
          <CreditCard style={{ width: '13px', height: '13px' }} /> Record Payment
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '8px',
      }}>
        {[
          ['Total Inflows', formatCurrency(total), 'var(--df-text)'],
          ['Collected Amount', formatCurrency(paid), 'var(--df-success)'],
          ['Pending Balance', formatCurrency(pending), '#d97706'],
          ['Transactions', `${projectPayments.length} Receipts`, 'var(--df-accent)'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ padding: '10px 14px', background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--df-text-muted)', marginBottom: '3px' }}>{l}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: c, fontFamily: 'var(--font-mono)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
        borderRadius: '8px', overflow: 'hidden', boxShadow: 'var(--df-shadow-xs)'
      }}>
        <div className="table-responsive-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--df-bg)', borderBottom: '1px solid var(--df-border)' }}>
                {['CUSTOMER', 'PLOT', 'PAYMENT STAGE', 'AMOUNT (₹)', 'DUE / PAID DATE', 'MODE & BANK', 'STATUS', 'ACTION'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--df-text-muted)', textAlign: i === 3 ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectPayments.map(pay => {
                const sc = statusColor(pay.status);
                return (
                  <tr key={pay.id}
                    style={{ borderBottom: '1px solid var(--df-border)', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--df-table-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--df-text)' }}>{getName(pay.customerId, pay.customerName)}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)', fontFamily: 'var(--font-mono)' }}>{pay.receipt || 'REC-PENDING'}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 800 }}>
                        Plot {pay.plotId || pay.plotNo || 'P-01'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.74rem', color: 'var(--df-text-soft)', fontWeight: 600 }}>
                      {pay.type}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.84rem', color: pay.status === 'Completed' ? 'var(--df-success)' : '#d97706' }}>
                      {formatCurrency(pay.amount)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.70rem', color: 'var(--df-text-muted)' }}>
                      {pay.paidDate ? formatDate(pay.paidDate) : `Due ${formatDate(pay.dueDate)}`}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>
                      <div>{pay.method}</div>
                      {pay.bankName && <div style={{ fontSize: '0.65rem' }}>{pay.bankName}</div>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: sc.color, background: sc.bg, border: sc.border }}>
                        {pay.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => setSelectedReceipt(pay)}
                        style={{
                          padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--df-border)',
                          background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '0.68rem', fontWeight: 700,
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px'
                        }}
                      >
                        <Eye style={{ width: '10px', height: '10px', color: 'var(--df-accent)' }} /> Receipt
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isRecordModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
            borderRadius: '10px', width: 'min(480px, 94vw)', maxHeight: '90vh', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', boxShadow: 'var(--df-shadow-xl)',
            animation: 'landos-fade-in 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--df-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard style={{ width: '18px', height: '18px', color: 'var(--df-accent)' }} />
                <span style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  Record Payment — {project.name}
                </span>
              </div>
              <button onClick={() => setIsRecordModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Buyer / Customer
                  </label>
                  <select
                    value={form.customerId}
                    onChange={e => setForm({ ...form, customerId: e.target.value })}
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
                  placeholder="Amount in ₹"
                  required
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '5px', color: 'var(--df-accent)', fontWeight: 800, fontSize: '0.86rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--df-text-muted)', marginBottom: '3px' }}>
                    Payment Stage
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
                    Payment Method
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
                  </select>
                </div>
              </div>

              <div style={{ padding: '12px 0 0 0', borderTop: '1px solid var(--df-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  style={{ padding: '6px 14px', borderRadius: '5px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', color: 'var(--df-text)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 16px', borderRadius: '5px', background: 'var(--df-accent)', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(159,18,57,0.3)' }}
                >
                  Save & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {selectedReceipt && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
            borderRadius: '10px', width: 'min(500px, 94vw)', display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--df-shadow-xl)', animation: 'landos-fade-in 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--df-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck style={{ width: '18px', height: '18px', color: 'var(--df-accent)' }} />
                <span style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  Official Payment Receipt ({selectedReceipt.receipt || 'REC-2024-001'})
                </span>
              </div>
              <button onClick={() => setSelectedReceipt(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.76rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px dashed var(--df-border)' }}>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--df-accent)' }}>Kshetra LandOS</div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--df-text-muted)' }}>Project: {project.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: 'var(--df-text)' }}>{selectedReceipt.receipt}</div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--df-text-muted)' }}>{formatDate(selectedReceipt.paidDate || selectedReceipt.dueDate)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '8px', background: 'var(--df-bg)', borderRadius: '5px', border: '1px solid var(--df-border)' }}>
                  <div style={{ fontSize: '0.60rem', fontWeight: 700, color: 'var(--df-text-muted)', textTransform: 'uppercase' }}>Customer</div>
                  <div style={{ fontWeight: 800, color: 'var(--df-text)' }}>{getName(selectedReceipt.customerId, selectedReceipt.customerName)}</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--df-bg)', borderRadius: '5px', border: '1px solid var(--df-border)' }}>
                  <div style={{ fontSize: '0.60rem', fontWeight: 700, color: 'var(--df-text-muted)', textTransform: 'uppercase' }}>Plot Allocation</div>
                  <div style={{ fontWeight: 800, color: 'var(--df-text)' }}>Plot {selectedReceipt.plotId || selectedReceipt.plotNo}</div>
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--df-accent-soft)', borderRadius: '6px', border: '1px solid rgba(159,18,57,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--df-accent)' }}>{selectedReceipt.type}</div>
                  <div style={{ fontSize: '0.64rem', color: 'var(--df-text-muted)' }}>Via {selectedReceipt.method}</div>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--df-accent)', fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(selectedReceipt.amount)}
                </div>
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
                onClick={() => alert(`Receipt ${selectedReceipt.receipt} downloaded!`)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '5px', background: 'var(--df-accent)', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
              >
                <Download style={{ width: '12px', height: '12px' }} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
