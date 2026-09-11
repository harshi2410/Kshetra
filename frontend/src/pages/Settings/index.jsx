import React, { useState } from 'react';
import { Settings as SettingsIcon, Building2, User, Shield, Moon, Sun, Bell, Check, Save } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import useAuth from '../../auth/useAuth';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [orgForm, setOrgForm] = useState({
    companyName: 'LandOS Real Estate Infrastructure LLP',
    contactEmail: user?.email || 'admin@landos.com',
    supportPhone: '+91 98230 12345',
    headquarters: 'Senapati Bapat Road, Shivaji Nagar, Pune, Maharashtra 411016',
    defaultAreaUnit: 'Square Feet (SQFT)',
    reraRegNumber: 'MAHARERA-ACK-2025-0912',
  });

  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--df-text-muted)',
    marginBottom: '6px'
  };

  const inputStyle = {
    width: '100%',
    height: '38px',
    padding: '0 12px',
    backgroundColor: 'var(--df-input-bg)',
    border: '1px solid var(--df-border-input)',
    borderRadius: '6px',
    fontSize: '13px',
    color: 'var(--df-text)',
    outline: 'none',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'landos-fade-in 0.2s ease-out', maxWidth: '840px' }}>
      
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
              Enterprise System Settings
            </h1>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--df-text-muted)', marginTop: '4px', margin: 0 }}>
            Manage organization credentials, RERA compliance defaults, user security, and interface themes.
          </p>
        </div>
      </div>

      {/* ── Organization Profile Card ── */}
      <div style={{
        padding: '20px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '10px',
        boxShadow: 'var(--df-shadow-xs)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--df-border)', paddingBottom: '10px' }}>
          <Building2 style={{ width: '18px', height: '18px', color: 'var(--df-accent)' }} />
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--df-text)', margin: 0 }}>
            Organization & Legal Entity
          </h2>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="responsive-form-grid-2">
            <div>
              <label style={labelStyle}>Company / Developer Legal Name</label>
              <input
                style={inputStyle}
                value={orgForm.companyName}
                onChange={e => setOrgForm({ ...orgForm, companyName: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Primary Administrative Email</label>
              <input
                style={inputStyle}
                value={orgForm.contactEmail}
                onChange={e => setOrgForm({ ...orgForm, contactEmail: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Support Phone Number</label>
              <input
                style={inputStyle}
                value={orgForm.supportPhone}
                onChange={e => setOrgForm({ ...orgForm, supportPhone: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Corporate RERA Promoter Reg.</label>
              <input
                style={inputStyle}
                value={orgForm.reraRegNumber}
                onChange={e => setOrgForm({ ...orgForm, reraRegNumber: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Corporate Headquarters Address</label>
              <input
                style={inputStyle}
                value={orgForm.headquarters}
                onChange={e => setOrgForm({ ...orgForm, headquarters: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
            <button
              type="submit"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 20px', borderRadius: '6px', border: 'none',
                background: 'var(--df-accent)', color: '#ffffff',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer'
              }}
            >
              <Save style={{ width: '14px', height: '14px' }} /> Save Organization Settings
            </button>
            {saved && (
              <span style={{ fontSize: '12px', color: 'var(--df-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check style={{ width: '14px', height: '14px' }} /> Saved successfully!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* ── Theme & Appearance Card ── */}
      <div style={{
        padding: '20px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '10px',
        boxShadow: 'var(--df-shadow-xs)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--df-border)', paddingBottom: '10px' }}>
          {theme === 'dark' ? <Moon style={{ width: '18px', height: '18px', color: 'var(--df-accent)' }} /> : <Sun style={{ width: '18px', height: '18px', color: 'var(--df-accent)' }} />}
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--df-text)', margin: 0 }}>
            Appearance & Interface Theme
          </h2>
        </div>

        <div className="responsive-stack" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--df-text)', fontSize: '13.5px' }}>
              Current Mode: <span style={{ color: 'var(--df-accent)' }}>{theme === 'dark' ? 'Obsidian Luxury Dark' : 'Clean Pearl Light'}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--df-text-muted)', marginTop: '2px' }}>
              Toggle between high-contrast dark architectural canvas and high-clarity daylight theme.
            </div>
          </div>

          <button
            onClick={toggleTheme}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '6px',
              border: '1px solid var(--df-border)', background: 'var(--df-bg)',
              color: 'var(--df-text)', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {theme === 'dark' ? <Sun style={{ width: '15px', height: '15px', color: '#f59e0b' }} /> : <Moon style={{ width: '15px', height: '15px', color: 'var(--df-accent)' }} />}
            Switch to {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>

    </div>
  );
}
