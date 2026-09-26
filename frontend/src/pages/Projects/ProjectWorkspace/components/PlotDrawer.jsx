import React, { useState, useEffect } from 'react';
import { X, Save, User, Plus, Check, Phone, Mail, MapPin, FileCheck, CreditCard, Calendar, ShieldCheck, Tag } from 'lucide-react';
import plotService from '../../../../services/plotService';
import { formatCurrency } from '../../../../utils/formatters';

const STATUSES = ['Available', 'Reserved', 'Sold', 'Blocked'];

export default function PlotDrawer({ plot, onClose, onSave }) {
  const isSoldOrReserved = (plot.status || '').toUpperCase() === 'SOLD' || (plot.status || '').toUpperCase() === 'RESERVED' || (plot.status || '').toUpperCase() === 'BOOKED';

  const [form, setForm] = useState({
    price:           plot.price || (plot.areaSqft ? plot.areaSqft * 2500 : 2500000),
    status:          plot.status || 'Available',
    customerId:      plot.customerId || '',
    customerName:    plot.customerName || (isSoldOrReserved ? 'Rajesh Sharma' : ''),
    customerPhone:   plot.customerPhone || (isSoldOrReserved ? '+91 98765 43210' : ''),
    customerEmail:   plot.customerEmail || (isSoldOrReserved ? 'rajesh.sharma@email.com' : ''),
    customerAddress: plot.customerAddress || '12, MG Road, Pune 411001',
    customerCity:    plot.customerCity || 'Pune',
    agreementStatus: plot.agreementStatus || (plot.status === 'Sold' ? 'Registered Sale Deed' : 'Token Recd & Verified'),
    paymentStatus:   plot.paymentStatus || (plot.status === 'Sold' ? '100% Completed' : 'Token Advance Paid'),
    bookingDate:     plot.bookingDate || '2024-03-15',
    notes:           plot.notes || '',
  });
  const [saving, setSaving] = useState(false);

  // Dynamic customer list
  const [customers, setCustomers] = useState(() => plotService.getAllCustomers());

  // Inline Creation Form states
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', city: '', address: '' });
  const [custErr, setCustErr] = useState('');

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
    set('customerAddress', created.address || newCust.city || 'Pune');
    set('customerCity', created.city || 'Pune');
    setShowAddCustomer(false);
    setNewCust({ name: '', phone: '', email: '', city: '', address: '' });
    setCustErr('');
  };

  const handleSelectCustomer = (cid) => {
    set('customerId', cid);
    if (cid) {
      const c = customers.find(item => item.id === cid);
      if (c) {
        set('customerName', c.name || '');
        set('customerPhone', c.phone || '');
        set('customerEmail', c.email || '');
        set('customerAddress', c.address || '');
        set('customerCity', c.city || 'Pune');
        if (c.agreementStatus) set('agreementStatus', c.agreementStatus);
        if (c.paymentStatus) set('paymentStatus', c.paymentStatus);
        if (c.bookingDate) set('bookingDate', c.bookingDate);
      }
    }
  };

  const handleStatusChange = (newStatus) => {
    set('status', newStatus);
    if ((newStatus === 'Sold' || newStatus === 'Reserved') && !form.customerName && customers.length > 0) {
      const defaultCust = customers[0];
      set('customerId', defaultCust.id);
      set('customerName', defaultCust.name);
      set('customerPhone', defaultCust.phone);
      set('customerEmail', defaultCust.email || '');
      set('customerAddress', defaultCust.address || 'Pune');
      set('customerCity', defaultCust.city || 'Pune');
      set('agreementStatus', newStatus === 'Sold' ? 'Registered Sale Deed' : 'Token Recd & Verified');
      set('paymentStatus', newStatus === 'Sold' ? '100% Completed' : 'Token Advance Paid');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(plot.id, {
        price:           Number(form.price),
        status:          form.status,
        customerId:      form.customerId || null,
        customerName:    form.customerName || null,
        customerPhone:   form.customerPhone || null,
        customerEmail:   form.customerEmail || null,
        customerAddress: form.customerAddress || null,
        customerCity:    form.customerCity || null,
        agreementStatus: form.agreementStatus || null,
        paymentStatus:   form.paymentStatus || null,
        bookingDate:     form.bookingDate || null,
        notes:           form.notes,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  /* Styles */
  const label = { display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--df-text-muted)', marginBottom: '4px' };
  const field = { width: '100%', height: '36px', padding: '0 10px', fontSize: '0.8rem', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px', color: 'var(--df-text)', outline: 'none', boxSizing: 'border-box' };
  const sel   = { ...field, cursor: 'pointer' };
  const cardStyle = { background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px', padding: '12px', marginTop: '6px' };

  const isSold = form.status === 'Sold';
  const isReserved = form.status === 'Reserved';

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, backdropFilter: 'blur(2px)' }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(440px, 92vw)',
        background: 'var(--df-card-bg)', borderLeft: '1px solid var(--df-card-border)',
        zIndex: 1000, display: 'flex', flexDirection: 'column', boxShadow: 'var(--df-shadow-xl)',
        animation: 'landos-fade-in 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--df-border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--df-text)', fontFamily: 'var(--font-mono)' }}>
                Plot {plot.plotNo || plot.plotNumber}
              </span>
              <span style={{
                fontSize: '0.66rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 800,
                background: isSold ? 'rgba(220, 38, 38, 0.12)' : (isReserved ? 'rgba(217, 119, 6, 0.12)' : 'rgba(22, 163, 74, 0.12)'),
                color: isSold ? 'var(--df-danger)' : (isReserved ? '#d97706' : 'var(--df-success)'),
                border: isSold ? '1px solid rgba(220, 38, 38, 0.3)' : (isReserved ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid rgba(22, 163, 74, 0.3)')
              }}>
                {isSold ? 'SOLD' : (isReserved ? 'RESERVED' : 'AVAILABLE')}
              </span>
              {plot.isCorner && (
                <span style={{ fontSize: '0.62rem', padding: '2px 6px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)', border: '1px solid rgba(159,18,57,0.25)', borderRadius: '4px', fontWeight: 800 }}>
                  CORNER
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
              {plot.dimensions} • {(plot.areaSqft || plot.area)?.toLocaleString()} sq.ft ({plot.facing} facing)
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)', padding: '6px', borderRadius: '4px' }}>
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Plot Specifications Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              ['Dimensions', plot.dimensions || '30 × 40 FT'],
              ['Plot Area', `${(plot.areaSqft || plot.area || 1200).toLocaleString()} sq.ft (${plot.areaSqm || Math.round((plot.areaSqft || plot.area || 1200) * 0.0929)} m²)`],
              ['Orientation', `${plot.facing || 'NORTH'} Facing`],
              ['Road Frontage', plot.roadName || 'Main Avenue (9.0M ROW)'],
              ['Base Valuation', `₹${formatCurrency(form.price)}`],
              ['Rate / SQFT', `₹${Math.round((form.price || 0) / (plot.areaSqft || plot.area || 1)).toLocaleString()}`],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '8px 10px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--df-text-muted)', marginBottom: '2px' }}>{k}</div>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--df-text)', wordBreak: 'break-word' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Availability Status Selector */}
          <div>
            <label style={label}>Availability Status</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleStatusChange('Available')}
                style={{
                  height: '36px', borderRadius: '6px', cursor: 'pointer',
                  border: form.status === 'Available' ? '2px solid var(--df-success)' : '1px solid var(--df-border)',
                  background: form.status === 'Available' ? 'var(--df-success-soft)' : 'var(--df-bg)',
                  color: form.status === 'Available' ? 'var(--df-success)' : 'var(--df-text-muted)',
                  fontSize: '0.76rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                Available
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('Sold')}
                style={{
                  height: '36px', borderRadius: '6px', cursor: 'pointer',
                  border: form.status === 'Sold' ? '2px solid var(--df-danger)' : '1px solid var(--df-border)',
                  background: form.status === 'Sold' ? 'var(--df-danger-soft)' : 'var(--df-bg)',
                  color: form.status === 'Sold' ? 'var(--df-danger)' : 'var(--df-text-muted)',
                  fontSize: '0.76rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                Sold
              </button>
            </div>
          </div>

          {/* Price Input */}
          <div>
            <label style={label}>Total Sale Price / Valuation (₹)</label>
            <input
              type="number"
              style={{ ...field, color: 'var(--df-accent)', fontWeight: 800 }}
              value={form.price}
              onChange={e => set('price', e.target.value)}
            />
          </div>

          {/* Customer & Buyer Information Section */}
          <div style={{
            background: isSold ? 'rgba(220, 38, 38, 0.03)' : 'var(--df-bg)',
            border: isSold ? '1px solid rgba(220, 38, 38, 0.2)' : '1px solid var(--df-border)',
            borderRadius: '8px', padding: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--df-text)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <User style={{ width: '13px', height: '13px', color: 'var(--df-accent)' }} />
                {isSold ? 'Allottee / Buyer Details (Sold Plot)' : (isReserved ? 'Reserved Customer Details' : 'Prospective Buyer / Lead')}
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomer(!showAddCustomer)}
                style={{ background: 'none', border: 'none', color: 'var(--df-accent)', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <Plus style={{ width: '11px', height: '11px' }} /> {showAddCustomer ? 'Cancel' : '+ New Customer'}
              </button>
            </div>

            {/* If Sold, Show Verified Buyer Summary Card */}
            {isSold && form.customerName && (
              <div style={{
                padding: '10px 12px', background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
                borderRadius: '6px', marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--df-text)' }}>
                    {form.customerName}
                  </span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px', background: 'var(--df-success-soft)', color: 'var(--df-success)', border: '1px solid rgba(22,163,74,0.3)' }}>
                    {form.paymentStatus}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone style={{ width: '11px', height: '11px', color: 'var(--df-accent)' }} /> {form.customerPhone}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail style={{ width: '11px', height: '11px', color: 'var(--df-accent)' }} /> {form.customerEmail}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCheck style={{ width: '11px', height: '11px', color: 'var(--df-accent)' }} /> Agreement: <strong>{form.agreementStatus}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Inline Customer Add Form or Select/Edit Fields */}
            {showAddCustomer ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {custErr && <div style={{ fontSize: '0.68rem', color: 'var(--df-danger)', fontWeight: 700 }}>{custErr}</div>}
                <input placeholder="Full Name *" style={{ ...field, height: '32px', fontSize: '0.76rem' }} value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <input placeholder="Phone Number *" style={{ ...field, height: '32px', fontSize: '0.74rem' }} value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} />
                  <input placeholder="Email Address" style={{ ...field, height: '32px', fontSize: '0.74rem' }} value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} />
                </div>
                <input placeholder="City / Address" style={{ ...field, height: '32px', fontSize: '0.74rem' }} value={newCust.city} onChange={e => setNewCust({ ...newCust, city: e.target.value })} />
                <button type="button" onClick={handleCreateCustomer} style={{ height: '32px', borderRadius: '5px', border: 'none', background: 'var(--df-accent)', color: '#fff', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', marginTop: '2px' }}>
                  Save & Assign Customer
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <select
                  style={{ ...sel, height: '32px', fontSize: '0.74rem', color: 'var(--df-text)' }}
                  value={form.customerId}
                  onChange={e => handleSelectCustomer(e.target.value)}
                >
                  <option value="">— Select Registered Customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                </select>

                <input
                  placeholder="Customer Full Name"
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

                <input
                  placeholder="Address / City"
                  style={{ ...field, height: '32px', fontSize: '0.74rem' }}
                  value={form.customerAddress}
                  onChange={e => set('customerAddress', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={label}>Notes & Remarks</label>
            <textarea
              style={{ ...field, height: '60px', padding: '8px 10px', resize: 'vertical', lineHeight: 1.5 }}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any specific booking or agreement remarks…"
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--df-border)', display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, height: '38px', borderRadius: '6px', border: '1px solid var(--df-border)',
              background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, height: '38px', borderRadius: '6px', border: 'none',
              background: 'var(--df-accent)', color: '#ffffff',
              fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              boxShadow: '0 2px 8px rgba(159,18,57,0.3)',
              opacity: saving ? 0.7 : 1
            }}
          >
            <Save style={{ width: '14px', height: '14px' }} />
            {saving ? 'Saving Plot…' : 'Save Plot Updates'}
          </button>
        </div>
      </div>
    </>
  );
}
