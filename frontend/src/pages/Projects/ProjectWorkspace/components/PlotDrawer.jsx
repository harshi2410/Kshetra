import React, { useState } from 'react';
import { X, Save, User, Award, Plus, Check } from 'lucide-react';
import plotService from '../../../../services/plotService';
import { formatCurrency } from '../../../../utils/formatters';

const STATUSES = ['Available', 'Reserved', 'Sold', 'Blocked'];

export default function PlotDrawer({ plot, onClose, onSave }) {
  const [form, setForm] = useState({
    price:         plot.price,
    status:        plot.status || 'Available',
    customerId:    plot.customerId || '',
    customerName:  plot.customerName || (plot.customerId ? plotService.getCustomerName(plot.customerId) : '') || '',
    customerPhone: plot.customerPhone || '',
    customerEmail: plot.customerEmail || '',
    brokerId:      plot.brokerId  || '',
    notes:         plot.notes     || '',
  });
  const [saving, setSaving] = useState(false);

  // Dynamic customer and broker lists
  const [customers, setCustomers] = useState(() => plotService.getAllCustomers());
  const [brokers, setBrokers] = useState(() => plotService.getAllBrokers());

  // Inline Creation Form states
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', city: '' });
  const [custErr, setCustErr] = useState('');

  const [showAddBroker, setShowAddBroker] = useState(false);
  const [newBrok, setNewBrok] = useState({ name: '', phone: '', agency: '', commission: '2' });
  const [brokErr, setBrokErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreateCustomer = (e) => {
    e.preventDefault();
    if (!newCust.name.trim()) {
      setCustErr('Customer name is required');
      return;
    }
    if (!newCust.phone.trim()) {
      setCustErr('Phone number is required');
      return;
    }

    const created = plotService.addCustomer(newCust);
    const updatedList = plotService.getAllCustomers();
    setCustomers(updatedList);
    set('customerId', created.id);
    set('customerName', created.name);
    set('customerPhone', created.phone);
    set('customerEmail', created.email || '');
    setShowAddCustomer(false);
    setNewCust({ name: '', phone: '', email: '', city: '' });
    setCustErr('');
  };

  const handleCreateBroker = (e) => {
    e.preventDefault();
    if (!newBrok.name.trim()) {
      setBrokErr('Broker name is required');
      return;
    }
    if (!newBrok.phone.trim()) {
      setBrokErr('Phone number is required');
      return;
    }

    const created = plotService.addBroker(newBrok);
    const updatedList = plotService.getAllBrokers();
    setBrokers(updatedList);
    set('brokerId', created.id);
    setShowAddBroker(false);
    setNewBrok({ name: '', phone: '', agency: '', commission: '2' });
    setBrokErr('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(plot.id, {
        price:         Number(form.price),
        status:        form.status,
        customerId:    form.customerId || null,
        customerName:  form.customerName || null,
        customerPhone: form.customerPhone || null,
        customerEmail: form.customerEmail || null,
        brokerId:      form.brokerId  || null,
        notes:         form.notes,
      });
    } finally {
      setSaving(false);
    }
  };

  /* Styles */
  const label = { display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--df-text-muted)', marginBottom: '4px' };
  const field = { width: '100%', height: '36px', padding: '0 10px', fontSize: '0.8rem', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px', color: 'var(--df-text)', outline: 'none', boxSizing: 'border-box' };
  const sel   = { ...field, cursor: 'pointer' };
  const cardStyle = { background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px', padding: '10px', marginTop: '6px' };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999 }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: '400px',
        background: 'var(--df-card-bg)', borderLeft: '1px solid var(--df-border)',
        zIndex: 1000, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--df-border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--df-text)', fontFamily: 'monospace' }}>Plot {plot.plotNo}</span>
              {plot.isCorner && (
                <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(122,30,58,0.1)', color: 'var(--df-accent)', border: '1px solid rgba(122,30,58,0.25)', borderRadius: '3px', fontWeight: 800 }}>
                  CORNER
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
              {plot.areaSqft || plot.area} sq.ft ({plot.areaSqm || Math.round((plot.areaSqft || plot.area) * 0.0929)} m²) · {plot.facing} facing
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)', padding: '4px' }}>
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Plot Info strip (read-only) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              ['Dimensions', plot.dimensions],
              ['Plot Area', `${(plot.areaSqft || plot.area).toLocaleString()} sq.ft (${plot.areaSqm || Math.round((plot.areaSqft || plot.area) * 0.0929)} m²)`],
              ['Facing Direction', plot.facing],
              ['Road Frontage', plot.roadName || 'Internal Road'],
              ['Plot Type', plot.isCorner ? 'Corner Plot (Dual Frontage)' : 'Standard Parcel'],
              ['Base Rate', `₹${(plot.ratePerSqft || Math.round(plot.price / (plot.areaSqft || plot.area || 1))).toLocaleString()} / sq.ft`],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '8px 10px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--df-text-muted)', marginBottom: '2px' }}>{k}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--df-text)', wordBreak: 'break-word' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Price */}
          <div>
            <label style={label}>Sale Price (₹)</label>
            <input type="number" style={field} value={form.price} onChange={e => set('price', e.target.value)} />
          </div>

          {/* Status (2-Color System: Green for Available, Red for Sold) */}
          <div>
            <label style={label}>Availability Status</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => set('status', 'Available')}
                style={{
                  height: '38px', borderRadius: '6px',
                  border: form.status === 'Available' ? '2px solid #22c55e' : '1px solid #16a34a40',
                  background: form.status === 'Available' ? '#15803d' : 'rgba(34, 197, 94, 0.08)',
                  color: form.status === 'Available' ? '#ffffff' : '#22c55e',
                  fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  boxShadow: form.status === 'Available' ? '0 0 12px rgba(34,197,94,0.3)' : 'none'
                }}
              >
                <span>🟢</span> Available
              </button>
              <button
                type="button"
                onClick={() => set('status', 'Sold')}
                style={{
                  height: '38px', borderRadius: '6px',
                  border: form.status === 'Sold' ? '2px solid #ef4444' : '1px solid #dc262640',
                  background: form.status === 'Sold' ? '#b91c1c' : 'rgba(239, 68, 68, 0.08)',
                  color: form.status === 'Sold' ? '#ffffff' : '#ef4444',
                  fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  boxShadow: form.status === 'Sold' ? '0 0 12px rgba(239,68,68,0.3)' : 'none'
                }}
              >
                <span>🔴</span> Sold
              </button>
            </div>
            {/* Secondary statuses */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
              {['Reserved', 'Blocked'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  style={{
                    height: '26px', borderRadius: '4px', border: '1px solid var(--df-border)',
                    background: form.status === s ? 'var(--df-card-bg)' : 'transparent',
                    color: form.status === s ? 'var(--df-text)' : 'var(--df-text-muted)',
                    fontSize: '0.66rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ ...label, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <User style={{ width: '11px', height: '11px' }} /> Customer Details
              </label>
              <button
                type="button"
                onClick={() => setShowAddCustomer(!showAddCustomer)}
                style={{ background: 'none', border: 'none', color: 'var(--df-accent)', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <Plus style={{ width: '11px', height: '11px' }} /> {showAddCustomer ? 'Cancel' : 'New Customer'}
              </button>
            </div>

            {/* Direct Customer Inputs or Selector */}
            {showAddCustomer ? (
              <div style={cardStyle}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--df-text)', marginBottom: '8px' }}>Create Customer Profile</div>
                {custErr && <div style={{ fontSize: '0.65rem', color: 'var(--df-danger)', marginBottom: '6px', fontWeight: 600 }}>{custErr}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input placeholder="Full Name *" style={{ ...field, height: '30px', fontSize: '0.75rem' }} value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} />
                  <input placeholder="Phone Number *" style={{ ...field, height: '30px', fontSize: '0.75rem' }} value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} />
                  <input placeholder="Email Address" style={{ ...field, height: '30px', fontSize: '0.75rem' }} value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} />
                  <input placeholder="City" style={{ ...field, height: '30px', fontSize: '0.75rem' }} value={newCust.city} onChange={e => setNewCust({ ...newCust, city: e.target.value })} />
                  <button type="button" onClick={handleCreateCustomer} style={{ height: '30px', borderRadius: '4px', border: 'none', background: 'var(--df-accent)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', marginTop: '2px' }}>
                    Save & Select Customer
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  placeholder="Customer Name (e.g. Ramesh Patil)"
                  style={{ ...field, height: '32px', fontSize: '0.76rem' }}
                  value={form.customerName}
                  onChange={e => set('customerName', e.target.value)}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <input
                    placeholder="Phone Number"
                    style={{ ...field, height: '32px', fontSize: '0.74rem' }}
                    value={form.customerPhone}
                    onChange={e => set('customerPhone', e.target.value)}
                  />
                  <input
                    placeholder="Email Address"
                    style={{ ...field, height: '32px', fontSize: '0.74rem' }}
                    value={form.customerEmail}
                    onChange={e => set('customerEmail', e.target.value)}
                  />
                </div>
                {customers.length > 0 && (
                  <select
                    style={{ ...sel, height: '30px', fontSize: '0.72rem', color: 'var(--df-text-muted)' }}
                    value={form.customerId}
                    onChange={e => {
                      const cid = e.target.value;
                      set('customerId', cid);
                      if (cid) {
                        const c = customers.find(item => item.id === cid);
                        if (c) {
                          set('customerName', c.name || '');
                          set('customerPhone', c.phone || '');
                          set('customerEmail', c.email || '');
                        }
                      }
                    }}
                  >
                    <option value="">— Or choose from existing customers —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Assign Broker */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ ...label, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Award style={{ width: '11px', height: '11px' }} /> Broker / Channel Partner
              </label>
              <button
                type="button"
                onClick={() => setShowAddBroker(!showAddBroker)}
                style={{ background: 'none', border: 'none', color: 'var(--df-accent)', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <Plus style={{ width: '11px', height: '11px' }} /> {showAddBroker ? 'Cancel' : 'New Broker'}
              </button>
            </div>

            {/* Inline Broker Form */}
            {showAddBroker ? (
              <div style={cardStyle}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--df-text)', marginBottom: '8px' }}>Create Broker Profile</div>
                {brokErr && <div style={{ fontSize: '0.65rem', color: 'var(--df-danger)', marginBottom: '6px', fontWeight: 600 }}>{brokErr}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input placeholder="Broker Name *" style={{ ...field, height: '30px', fontSize: '0.75rem' }} value={newBrok.name} onChange={e => setNewBrok({ ...newBrok, name: e.target.value })} />
                  <input placeholder="Phone Number *" style={{ ...field, height: '30px', fontSize: '0.75rem' }} value={newBrok.phone} onChange={e => setNewBrok({ ...newBrok, phone: e.target.value })} />
                  <input placeholder="Agency / Firm Name" style={{ ...field, height: '30px', fontSize: '0.75rem' }} value={newBrok.agency} onChange={e => setNewBrok({ ...newBrok, agency: e.target.value })} />
                  <input placeholder="Commission % (e.g. 2)" style={{ ...field, height: '30px', fontSize: '0.75rem' }} value={newBrok.commission} onChange={e => setNewBrok({ ...newBrok, commission: e.target.value })} />
                  <button type="button" onClick={handleCreateBroker} style={{ height: '30px', borderRadius: '4px', border: 'none', background: 'var(--df-accent)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', marginTop: '2px' }}>
                    Save & Select Broker
                  </button>
                </div>
              </div>
            ) : (
              <select style={sel} value={form.brokerId} onChange={e => set('brokerId', e.target.value)}>
                <option value="">— Not Assigned —</option>
                {brokers.map(b => <option key={b.id} value={b.id}>{b.name} · {b.commission}% comm.</option>)}
              </select>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={label}>Notes</label>
            <textarea
              style={{ ...field, height: '72px', padding: '8px 10px', resize: 'vertical', lineHeight: 1.5 }}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any notes about this plot…"
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--df-border)', display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{ flex: 1, height: '38px', borderRadius: '6px', border: '1px solid var(--df-border)', background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, height: '38px', borderRadius: '6px', border: 'none', background: 'var(--df-accent)', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: saving ? 0.7 : 1 }}>
            <Save style={{ width: '13px', height: '13px' }} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  );
}

