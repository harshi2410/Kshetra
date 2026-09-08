import React, { useState } from 'react';
import projectService from '../../../../services/projectService';
import { cardStyle, cardHeaderStyle, cardTitleStyle } from '../../components/dCardStyles';

export default function ProjectSettings({ project, onUpdated }) {
  const [form, setForm] = useState({
    name:               project.name,
    location:           project.location,
    type:               project.type,
    status:             project.status,
    developer:          project.developer || '',
    totalArea:          project.totalArea || '',
    priceRange:         project.priceRange || '',
    expectedCompletion: project.expectedCompletion || '',
    reraNo:             project.reraNo || '',
    description:        project.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };

  const handleSave = async () => {
    try {
      setSaving(true);
      await projectService.updateProject(project.id, form);
      setSaved(true);
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  const label = { display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--df-text-muted)', marginBottom: '4px' };
  const field = { width: '100%', height: '36px', padding: '0 10px', fontSize: '0.8rem', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px', color: 'var(--df-text)', outline: 'none', boxSizing: 'border-box' };
  const sel   = { ...field, cursor: 'pointer' };

  return (
    <div style={{ maxWidth: '640px', width: '100%' }}>
      <div style={cardStyle} className="mobile-card-compact">
        <div style={cardHeaderStyle}>
          <div style={cardTitleStyle}>Project Configuration</div>
          <span style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>Changes are saved to local storage</span>
        </div>
        <div className="responsive-form-grid-2" style={{ padding: '16px 14px', gap: '14px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Project Name</label>
            <input style={field} value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label style={label}>Location</label>
            <input style={field} value={form.location} onChange={e => set('location', e.target.value)} />
          </div>
          <div>
            <label style={label}>Type</label>
            <select style={sel} value={form.type} onChange={e => set('type', e.target.value)}>
              <option>Residential</option><option>Commercial</option><option>Mixed Use</option>
            </select>
          </div>
          <div>
            <label style={label}>Status</label>
            <select style={sel} value={form.status} onChange={e => set('status', e.target.value)}>
              <option>Active</option><option>Upcoming</option><option>Completed</option><option>On Hold</option>
            </select>
          </div>
          <div>
            <label style={label}>Developer Name</label>
            <input style={field} value={form.developer} onChange={e => set('developer', e.target.value)} />
          </div>
          <div>
            <label style={label}>Total Area</label>
            <input style={field} value={form.totalArea} onChange={e => set('totalArea', e.target.value)} placeholder="e.g. 45 Acres" />
          </div>
          <div>
            <label style={label}>Price Range</label>
            <input style={field} value={form.priceRange} onChange={e => set('priceRange', e.target.value)} placeholder="₹25L – ₹80L" />
          </div>
          <div>
            <label style={label}>RERA Number</label>
            <input style={field} value={form.reraNo} onChange={e => set('reraNo', e.target.value)} placeholder="P52100XXXXXX" />
          </div>
          <div>
            <label style={label}>Expected Completion</label>
            <input style={field} type="date" value={form.expectedCompletion} onChange={e => set('expectedCompletion', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Description</label>
            <textarea style={{ ...field, height: '72px', padding: '8px 10px', resize: 'vertical', lineHeight: 1.5 }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Project description…" />
          </div>
        </div>
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--df-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={handleSave} disabled={saving} style={{ height: '36px', padding: '0 20px', borderRadius: '6px', border: 'none', background: 'var(--df-accent)', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saved && <span style={{ fontSize: '0.72rem', color: 'var(--df-success)', fontWeight: 600 }}>✓ Saved successfully</span>}
        </div>
      </div>
    </div>
  );
}
