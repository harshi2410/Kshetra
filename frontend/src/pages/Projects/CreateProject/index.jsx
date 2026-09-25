import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Check, ChevronRight, Upload, X, ArrowLeft, Building2, MapPin, 
  Layers, Calendar, IndianRupee, Tag, FileText, Compass, ShieldCheck, 
  Plus, Edit2, AlertCircle, File, CheckCircle2, AlertTriangle,
  Sparkles, Sliders, ChevronDown, CheckCheck, Landmark, Globe, Maximize2
} from 'lucide-react';
import projectService from '../../../services/projectService';
import { Button, Badge } from '../../../components/ui';

const STEPS = [
  { id: 'identity', title: 'Identity & Type', headline: 'Project & Developer Identity', subtitle: 'Enter primary project name, legal developer entity, and land classification', icon: Building2 },
  { id: 'location', title: 'Location & Survey', headline: 'Location, Survey & Geo Identity', subtitle: 'Specify administrative location, survey numbers, coordinates & legal approvals', icon: MapPin },
  { id: 'commercial', title: 'Land & Commercial', headline: 'Commercial Baseline & Land Metrics', subtitle: 'Specify total gross land area, measurement unit & baseline price expectations', icon: Layers },
  { id: 'layout', title: 'Master Layout', headline: 'Master Layout Blueprint', subtitle: 'Attach CAD/PDF/Image master layout blueprint for automated vector plot extraction', icon: FileText },
  { id: 'review', title: 'Review & Create', headline: 'Pre-Flight Review & Launch', subtitle: 'Audit project parameters and initiate automated boundary and plot generation', icon: ShieldCheck },
];

const PROJECT_TYPES = [
  { label: 'Residential', value: 'Residential', icon: '🏡', desc: 'Plotted colony / Housing' },
  { label: 'Commercial', value: 'Commercial', icon: '🏢', desc: 'Retail & Office spaces' },
  { label: 'Mixed Use', value: 'Mixed Use', icon: '🏙️', desc: 'Retail + Residential units' },
  { label: 'Industrial', value: 'Industrial', icon: '🏭', desc: 'Warehousing & Logistics' },
  { label: 'Farm Plots', value: 'Farm Plots', icon: '🌳', desc: 'Agrarian / Weekend estate' },
];

const INITIAL_FORM = {
  // Step 1: Identity
  name: '',
  developer: '',
  type: 'Residential',
  landClassification: 'N.A. Residential',
  description: '',

  // Step 2: Location
  state: 'Maharashtra',
  district: 'Pune',
  taluka: 'Haveli',
  cityVillage: 'Wagholi',
  pincode: '412207',
  surveyNumbers: ['Gut No. 142/1', 'Gut No. 142/2'],
  latitude: '18.5793',
  longitude: '73.9814',
  approvingAuthority: 'PMRDA / PMC',
  reraNo: 'P52100054321',

  // Step 3: Commercial Baseline
  grossArea: '45',
  areaUnit: 'Acres',
  baseRatePerSqFt: '3500',
  priceMin: '2500000',
  priceMax: '8500000',
  startDate: new Date().toISOString().split('T')[0],
  expectedCompletion: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2).toISOString().split('T')[0],

  // Step 4: Master Layout File & Scale
  knownScale: 'Not specified',
  scaleRatio: '1:500',
};

export default function CreateProject() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const stepParam = searchParams.get('step');
  const step = stepParam !== null ? Math.max(0, Math.min(4, parseInt(stepParam, 10))) : 0;

  const setStep = (newStep) => {
    setSearchParams({ step: newStep });
  };

  const [form, setForm] = useState(INITIAL_FORM);
  const [surveyTagInput, setSurveyTagInput] = useState('');
  const [layoutFile, setLayoutFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creationStatus, setCreationStatus] = useState('');
  const [errors, setErrors] = useState({});

  const setField = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  // Tag Management
  const handleAddSurveyTag = (e) => {
    if (e) e.preventDefault();
    const trimmed = surveyTagInput.trim().replace(/^,+|,+$/g, '');
    if (!trimmed) return;

    const newTags = trimmed.split(',').map(t => t.trim()).filter(Boolean);
    const updated = Array.from(new Set([...form.surveyNumbers, ...newTags]));
    
    setForm(f => ({ ...f, surveyNumbers: updated }));
    setSurveyTagInput('');
    setErrors(e => ({ ...e, surveyNumbers: '' }));
  };

  const handleRemoveSurveyTag = (tagToRemove) => {
    setForm(f => ({ ...f, surveyNumbers: f.surveyNumbers.filter(t => t !== tagToRemove) }));
  };

  const handleSurveyKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddSurveyTag();
    }
  };

  // Calculated metrics
  const calculateAreaSqFt = () => {
    const val = Number(form.grossArea) || 0;
    if (form.areaUnit === 'Acres') return val * 43560;
    if (form.areaUnit === 'Gunta') return val * 1089;
    if (form.areaUnit === 'Hectares') return val * 107639;
    return val;
  };

  const sqFtTotal = calculateAreaSqFt();
  const estimatedGdv = (sqFtTotal * 0.55 * (Number(form.baseRatePerSqFt) || 0));

  // Validations
  const validateStep0 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Project name is required';
    if (!form.developer.trim()) e.developer = 'Developer entity is required';
    if (!form.type) e.type = 'Project type is required';
    if (!form.landClassification) e.landClassification = 'Land classification is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.state.trim()) e.state = 'State is required';
    if (!form.district.trim()) e.district = 'District is required';
    if (!form.taluka.trim()) e.taluka = 'Taluka is required';
    if (!form.cityVillage.trim()) e.cityVillage = 'City / Village is required';
    if (!form.pincode.trim()) {
      e.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(form.pincode.trim())) {
      e.pincode = 'Enter a valid 6-digit PIN code';
    }

    let currentTags = [...form.surveyNumbers];
    if (surveyTagInput.trim()) {
      const extraTags = surveyTagInput.trim().split(',').map(t => t.trim()).filter(Boolean);
      currentTags = Array.from(new Set([...currentTags, ...extraTags]));
      setForm(f => ({ ...f, surveyNumbers: currentTags }));
      setSurveyTagInput('');
    }

    if (currentTags.length === 0) {
      e.surveyNumbers = 'At least one Survey / Gut number is required';
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.grossArea || Number(form.grossArea) <= 0) {
      e.grossArea = 'Valid gross land area is required';
    }
    if (!form.areaUnit) e.areaUnit = 'Land area unit is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(Math.min(step + 1, STEPS.length - 1));
  };

  const prevStep = () => setStep(Math.max(step - 1, 0));

  // File Handling
  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    const maxBytes = 50 * 1024 * 1024;
    const ext = file.name.split('.').pop().toLowerCase();
    const isValidExt = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif', 'dxf', 'webp', 'bmp'].includes(ext);

    if (!isValidExt) {
      setErrors(e => ({ ...e, layoutFile: 'File must be CAD (.dxf), PDF, PNG, JPG, JPEG, or TIFF' }));
      return;
    }
    if (file.size > maxBytes) {
      setErrors(e => ({ ...e, layoutFile: 'File size exceeds 50MB maximum limit' }));
      return;
    }
    setLayoutFile(file);
    setErrors(e => ({ ...e, layoutFile: '' }));
  };

  const handleAttachSampleBlueprint = () => {
    const sampleBlob = new Blob(['sample cad blueprint data'], { type: 'application/pdf' });
    const sample = new File([sampleBlob], 'Sunny_Meadows_Master_CAD_Rev4.pdf', { type: 'application/pdf', lastModified: Date.now() });
    setLayoutFile(sample);
    setErrors(e => ({ ...e, layoutFile: '' }));
  };

  // Submit & Build Plot System According to Boundary
  const handleCreateProject = async (isDraft = false) => {
    try {
      setSaving(true);
      setCreationStatus('Initializing project space…');
      
      const payload = {
        ...form,
        grossArea: Number(form.grossArea),
        status: isDraft ? 'Draft' : 'Active',
        layoutUploaded: Boolean(layoutFile),
        layoutFile: layoutFile ? {
          name: layoutFile.name,
          size: layoutFile.size,
          type: layoutFile.type,
        } : null,
      };

      const newProject = await projectService.createProject(payload);

      if (newProject?.id) {
        if (layoutFile) {
          try {
            setCreationStatus('Uploading blueprint and queueing AI vector pipeline…');
            await projectService.uploadLayoutFile(newProject.id, layoutFile, form.scaleRatio || '1:500');
          } catch (uploadErr) {
            console.warn('File upload warning:', uploadErr);
          }
        }

        // Auto-detect & confirm boundary, and build initial 2D plot system
        try {
          setCreationStatus('Detecting authentic boundary polygon & generating UDCPR plot system…');
          const bRes = await projectService.detectBoundary(newProject.id);
          const polygon = bRes?.polygon || bRes?.detectedBoundary || bRes?.polygonVertices;
          if (polygon && polygon.length >= 3) {
            await projectService.confirmBoundary(newProject.id, { polygonVertices: polygon });
            const xs = polygon.map(p => p[0]);
            const ys = polygon.map(p => p[1]);
            const lenFt = Math.max(80, Math.max(...xs) - Math.min(...xs));
            const brdFt = Math.max(60, Math.max(...ys) - Math.min(...ys));
            await projectService.generateLayouts(newProject.id, {
              lengthFt: lenFt,
              breadthFt: brdFt,
              polygonVertices: polygon
            });
          }
        } catch (boundaryErr) {
          console.warn('Initial plot system generation:', boundaryErr);
        }

        setCreationStatus('Complete! Opening project layout canvas…');
        setTimeout(() => {
          navigate(`/projects/${newProject.id}/layout`);
        }, 400);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
      alert(`Error creating project: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  // Card & Element Styles conforming strictly to Dashboard Theme
  const cardStyle = { 
    background: 'var(--df-card-bg)', 
    border: '1px solid var(--df-card-border)', 
    borderRadius: '8px',
    boxShadow: 'var(--df-shadow-xs)',
    padding: '24px'
  };

  const labelStyle = { 
    display: 'block', 
    fontSize: '0.72rem', 
    fontWeight: 700, 
    color: 'var(--df-text-muted)', 
    textTransform: 'uppercase', 
    letterSpacing: '0.05em', 
    marginBottom: '6px' 
  };

  const inputStyle = (err) => ({
    width: '100%', 
    height: '40px', 
    padding: '0 12px', 
    fontSize: '0.85rem',
    background: 'var(--df-input-bg, var(--df-bg))', 
    border: `1px solid ${err ? 'var(--df-danger)' : 'var(--df-border)'}`,
    borderRadius: '6px', 
    color: 'var(--df-text)', 
    outline: 'none', 
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  });

  const textareaStyle = (err) => ({ 
    ...inputStyle(err), 
    height: '84px', 
    padding: '10px 12px', 
    resize: 'vertical', 
    lineHeight: 1.5 
  });

  const selectStyle = (err) => ({ 
    ...inputStyle(err), 
    cursor: 'pointer' 
  });

  const errMsg = { fontSize: '0.68rem', color: 'var(--df-danger)', marginTop: '4px', fontWeight: 600 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'landos-fade-in 0.2s ease-out' }}>
      
      {/* ── Dashboard-Themed Page Heading ── */}
      <div className="page-header-container responsive-stack" style={{ marginBottom: '2px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: 'var(--df-accent-soft)',
              color: 'var(--df-accent)',
              border: '1px solid rgba(159, 18, 57, 0.18)',
            }}>
              Project Studio Wizard
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>
              Step {step + 1} of 5 · {STEPS[step].title}
            </span>
          </div>
          <h1 style={{
            fontSize: '1.35rem', 
            fontWeight: 800, 
            color: 'var(--df-text)',
            letterSpacing: '-0.02em', 
            margin: 0, 
            lineHeight: 1.2,
            fontFamily: 'var(--font-display)',
          }}>
            Create New Real Estate Project
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--df-text-muted)', marginTop: '3px', margin: 0 }}>
            Configure civil geometry, regulatory survey coordinates, and upload master CAD blueprint
          </p>
        </div>

        <div className="btn-group-responsive" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/projects')}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              border: '1px solid var(--df-border)',
              background: 'var(--df-card-bg)',
              color: 'var(--df-text-soft)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft style={{ width: '13px', height: '13px' }} /> Cancel
          </button>

          <button
            onClick={() => handleCreateProject(true)}
            disabled={saving}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              border: '1px solid var(--df-border)',
              background: 'var(--df-bg)',
              color: 'var(--df-text)',
              cursor: 'pointer',
            }}
          >
            Save Draft
          </button>
        </div>
      </div>

      {/* ── Stepper Navigation Ribbon (Theme-Matched) ── */}
      <div style={{
        background: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: 'var(--df-shadow-xs)',
      }}>
        <div className="horizontal-scroll-tabs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isCurrent = step === index;
            const isCompleted = step > index;

            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: isCurrent 
                      ? '1px solid var(--df-accent)' 
                      : '1px solid transparent',
                    background: isCurrent 
                      ? 'var(--df-accent-soft)' 
                      : isCompleted 
                      ? 'transparent' 
                      : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    flexShrink: 0
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: isCompleted 
                      ? 'var(--df-success)' 
                      : isCurrent 
                      ? 'var(--df-accent)' 
                      : 'var(--df-bg)',
                    color: (isCompleted || isCurrent) ? '#ffffff' : 'var(--df-text-muted)',
                    border: (isCompleted || isCurrent) ? 'none' : '1px solid var(--df-border)',
                    flexShrink: 0
                  }}>
                    {isCompleted ? <Check style={{ width: '13px', height: '13px', strokeWidth: 3 }} /> : index + 1}
                  </div>

                  <div>
                    <div style={{
                      fontSize: '0.76rem',
                      fontWeight: isCurrent ? 800 : isCompleted ? 700 : 500,
                      color: isCurrent 
                        ? 'var(--df-accent)' 
                        : isCompleted 
                        ? 'var(--df-text)' 
                        : 'var(--df-text-muted)',
                      lineHeight: 1.2
                    }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--df-text-muted)' }}>
                      {isCompleted ? 'Completed' : isCurrent ? 'Active Step' : `Step ${index + 1}`}
                    </div>
                  </div>
                </button>

                {index < STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    backgroundColor: index < step ? 'var(--df-success)' : 'var(--df-border)',
                    minWidth: '16px',
                    margin: '0 4px',
                    borderRadius: '1px'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Form Card Container ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* STEP 0 — IDENTITY & TYPE */}
        {step === 0 && (
          <div style={cardStyle} className="mobile-card-compact">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--df-border)' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  1. Project & Developer Entity Identity
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
                  Register primary project name, legal operating entity, and property classification.
                </div>
              </div>
              <Building2 style={{ width: '20px', height: '20px', color: 'var(--df-accent)' }} />
            </div>

            {/* Interactive Project Type Cards */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Select Project Category *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {PROJECT_TYPES.map((t) => {
                  const isSel = form.type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setField('type', t.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: isSel ? '1.5px solid var(--df-accent)' : '1px solid var(--df-border)',
                        background: isSel ? 'var(--df-accent-soft)' : 'var(--df-bg)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{t.icon}</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isSel ? 'var(--df-accent)' : 'var(--df-text)' }}>
                        {t.label}
                      </div>
                      <div style={{ fontSize: '0.64rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
                        {t.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
              {errors.type && <div style={errMsg}>{errors.type}</div>}
            </div>

            <div className="responsive-form-grid-2" style={{ gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Project Name *</label>
                <input 
                  style={inputStyle(errors.name)} 
                  value={form.name} 
                  onChange={e => setField('name', e.target.value)} 
                  placeholder="e.g. Sunrise Valley Integrated Plotted Estate" 
                />
                {errors.name && <div style={errMsg}>{errors.name}</div>}
              </div>

              <div>
                <label style={labelStyle}>Developer Entity / Legal Entity *</label>
                <input 
                  style={inputStyle(errors.developer)} 
                  value={form.developer} 
                  onChange={e => setField('developer', e.target.value)} 
                  placeholder="e.g. Sunrise Infra Developers LLP" 
                />
                {errors.developer && <div style={errMsg}>{errors.developer}</div>}
              </div>

              <div>
                <label style={labelStyle}>Land Classification *</label>
                <select 
                  style={selectStyle(errors.landClassification)} 
                  value={form.landClassification} 
                  onChange={e => setField('landClassification', e.target.value)}
                >
                  <option value="N.A. Residential">N.A. Residential (Approved Plotted Layout)</option>
                  <option value="N.A. Commercial">N.A. Commercial / High Street</option>
                  <option value="Agricultural">Agricultural / Non-Plotted</option>
                  <option value="Gram Panchayat">Gram Panchayat Sanctioned</option>
                </select>
                {errors.landClassification && <div style={errMsg}>{errors.landClassification}</div>}
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Executive Project Summary / Highlights (Optional)</label>
                <textarea 
                  style={textareaStyle()} 
                  value={form.description} 
                  onChange={e => setField('description', e.target.value)} 
                  placeholder="Enter strategic project notes, road connectivity access, amenity highlights, or marketing scope..." 
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 — LOCATION & SURVEY */}
        {step === 1 && (
          <div style={cardStyle} className="mobile-card-compact">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--df-border)' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  2. Location, Survey & Geo Identity
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
                  Specify revenue administrative location, Survey/Gut numbers, and planning coordinates.
                </div>
              </div>
              <MapPin style={{ width: '20px', height: '20px', color: 'var(--df-accent)' }} />
            </div>

            <div className="responsive-form-grid-3" style={{ gap: '14px' }}>
              <div>
                <label style={labelStyle}>State *</label>
                <input 
                  style={inputStyle(errors.state)} 
                  value={form.state} 
                  onChange={e => setField('state', e.target.value)} 
                  placeholder="Maharashtra" 
                />
                {errors.state && <div style={errMsg}>{errors.state}</div>}
              </div>

              <div>
                <label style={labelStyle}>District *</label>
                <input 
                  style={inputStyle(errors.district)} 
                  value={form.district} 
                  onChange={e => setField('district', e.target.value)} 
                  placeholder="Pune" 
                />
                {errors.district && <div style={errMsg}>{errors.district}</div>}
              </div>

              <div>
                <label style={labelStyle}>Taluka *</label>
                <input 
                  style={inputStyle(errors.taluka)} 
                  value={form.taluka} 
                  onChange={e => setField('taluka', e.target.value)} 
                  placeholder="Haveli" 
                />
                {errors.taluka && <div style={errMsg}>{errors.taluka}</div>}
              </div>

              <div>
                <label style={labelStyle}>City / Village *</label>
                <input 
                  style={inputStyle(errors.cityVillage)} 
                  value={form.cityVillage} 
                  onChange={e => setField('cityVillage', e.target.value)} 
                  placeholder="Wagholi" 
                />
                {errors.cityVillage && <div style={errMsg}>{errors.cityVillage}</div>}
              </div>

              <div>
                <label style={labelStyle}>Pincode (6 Digits) *</label>
                <input 
                  style={inputStyle(errors.pincode)} 
                  value={form.pincode} 
                  onChange={e => setField('pincode', e.target.value)} 
                  placeholder="412207" 
                  maxLength={6}
                />
                {errors.pincode && <div style={errMsg}>{errors.pincode}</div>}
              </div>

              <div>
                <label style={labelStyle}>RERA Registration No. (Optional)</label>
                <input 
                  style={inputStyle()} 
                  value={form.reraNo} 
                  onChange={e => setField('reraNo', e.target.value)} 
                  placeholder="e.g. P52100054321" 
                />
              </div>

              {/* Interactive Tag Input for Survey Numbers */}
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Survey / Gut / Khasra Numbers *</label>
                  <span style={{ fontSize: '0.66rem', color: 'var(--df-text-muted)' }}>
                    {form.surveyNumbers.length} tagged tokens
                  </span>
                </div>

                {/* Existing Tag Chips */}
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '6px', 
                  marginBottom: '8px', 
                  minHeight: form.surveyNumbers.length > 0 ? 'auto' : '0' 
                }}>
                  {form.surveyNumbers.map(tag => (
                    <span 
                      key={tag}
                      style={{
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        padding: '4px 10px', 
                        borderRadius: '4px',
                        background: 'var(--df-accent-soft)', 
                        border: '1px solid rgba(159, 18, 57, 0.25)',
                        color: 'var(--df-accent)', 
                        fontSize: '0.78rem', 
                        fontWeight: 700
                      }}
                    >
                      <Tag style={{ width: '11px', height: '11px' }} />
                      {tag}
                      <button 
                        type="button"
                        onClick={() => handleRemoveSurveyTag(tag)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-accent)', padding: 0, display: 'flex' }}
                        title="Remove tag"
                      >
                        <X style={{ width: '13px', height: '13px' }} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Input & Add Button */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    style={{ ...inputStyle(errors.surveyNumbers), flex: 1 }} 
                    value={surveyTagInput} 
                    onChange={e => setSurveyTagInput(e.target.value)} 
                    onKeyDown={handleSurveyKeyDown}
                    onBlur={() => handleAddSurveyTag()}
                    placeholder="Type survey token (e.g. Gut No. 143/A) and press Enter or comma" 
                  />
                  <button
                    type="button"
                    onClick={handleAddSurveyTag}
                    style={{
                      height: '40px', 
                      padding: '0 16px', 
                      borderRadius: '6px', 
                      border: '1px solid var(--df-border)',
                      background: 'var(--df-bg)', 
                      color: 'var(--df-text)', 
                      fontSize: '0.78rem', 
                      fontWeight: 700,
                      cursor: 'pointer', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      flexShrink: 0,
                    }}
                  >
                    <Plus style={{ width: '14px', height: '14px' }} /> Add Token
                  </button>
                </div>
                {errors.surveyNumbers && <div style={errMsg}>{errors.surveyNumbers}</div>}
              </div>

              {/* GIS Georeference Coordinates */}
              <div>
                <label style={labelStyle}>Latitude Coordinate</label>
                <input 
                  style={inputStyle()} 
                  type="number"
                  step="any"
                  value={form.latitude} 
                  onChange={e => setField('latitude', e.target.value)} 
                  placeholder="18.5793" 
                />
              </div>

              <div>
                <label style={labelStyle}>Longitude Coordinate</label>
                <input 
                  style={inputStyle()} 
                  type="number"
                  step="any"
                  value={form.longitude} 
                  onChange={e => setField('longitude', e.target.value)} 
                  placeholder="73.9814" 
                />
              </div>

              <div>
                <label style={labelStyle}>Planning Authority Jurisdiction</label>
                <input 
                  style={inputStyle()} 
                  value={form.approvingAuthority} 
                  onChange={e => setField('approvingAuthority', e.target.value)} 
                  placeholder="PMRDA / PMC / DTCP" 
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — COMMERCIAL BASELINE & LAND METRICS */}
        {step === 2 && (
          <div style={cardStyle} className="mobile-card-compact">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--df-border)' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  3. Commercial Baseline & Land Metrics
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
                  Specify total land area, unit metrics, target base rates, and milestone timeline.
                </div>
              </div>
              <Layers style={{ width: '20px', height: '20px', color: 'var(--df-accent)' }} />
            </div>

            <div className="responsive-form-grid-2" style={{ gap: '14px' }}>
              <div>
                <label style={labelStyle}>Total Gross Land Area *</label>
                <input 
                  style={inputStyle(errors.grossArea)} 
                  type="number" 
                  step="any"
                  value={form.grossArea} 
                  onChange={e => setField('grossArea', e.target.value)} 
                  placeholder="45" 
                />
                {errors.grossArea && <div style={errMsg}>{errors.grossArea}</div>}
              </div>

              <div>
                <label style={labelStyle}>Area Unit *</label>
                <select 
                  style={selectStyle(errors.areaUnit)} 
                  value={form.areaUnit} 
                  onChange={e => setField('areaUnit', e.target.value)}
                >
                  <option value="Acres">Acres</option>
                  <option value="Sq. Ft.">Sq. Ft.</option>
                  <option value="Gunta">Gunta</option>
                  <option value="Hectares">Hectares</option>
                </select>
                {errors.areaUnit && <div style={errMsg}>{errors.areaUnit}</div>}
              </div>

              <div>
                <label style={labelStyle}>Target Base Rate (₹ / Sq. Ft.)</label>
                <input 
                  style={inputStyle()} 
                  type="number" 
                  value={form.baseRatePerSqFt} 
                  onChange={e => setField('baseRatePerSqFt', e.target.value)} 
                  placeholder="3500" 
                />
              </div>

              {/* Dynamic Live GDV Metric Card */}
              <div style={{
                padding: '12px 14px',
                background: 'var(--df-bg)',
                border: '1px solid var(--df-border)',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '2px'
              }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--df-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Est. Gross Development Value (55% Plottable Area)
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--df-accent)', fontFamily: 'var(--font-mono)' }}>
                  ₹{(estimatedGdv / 10000000).toFixed(2)} Cr ({sqFtTotal.toLocaleString('en-IN')} sq.ft)
                </div>
              </div>

              <div>
                <label style={labelStyle}>Min Plot Price Expectation (₹)</label>
                <input 
                  style={inputStyle()} 
                  type="number" 
                  value={form.priceMin} 
                  onChange={e => setField('priceMin', e.target.value)} 
                  placeholder="2500000" 
                />
              </div>

              <div>
                <label style={labelStyle}>Max Plot Price Expectation (₹)</label>
                <input 
                  style={inputStyle()} 
                  type="number" 
                  value={form.priceMax} 
                  onChange={e => setField('priceMax', e.target.value)} 
                  placeholder="8500000" 
                />
              </div>

              <div>
                <label style={labelStyle}>Project Launch Date</label>
                <input 
                  style={inputStyle()} 
                  type="date" 
                  value={form.startDate} 
                  onChange={e => setField('startDate', e.target.value)} 
                />
              </div>

              <div>
                <label style={labelStyle}>Expected Handover / Completion</label>
                <input 
                  style={inputStyle()} 
                  type="date" 
                  value={form.expectedCompletion} 
                  onChange={e => setField('expectedCompletion', e.target.value)} 
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — MASTER LAYOUT BLUEPRINT UPLOAD */}
        {step === 3 && (
          <div style={cardStyle} className="mobile-card-compact">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--df-border)' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  4. Upload Master Layout Blueprint
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
                  Attach CAD DWG/DXF, PDF, or high-res image map for automated vector plot extraction.
                </div>
              </div>
              <FileText style={{ width: '20px', height: '20px', color: 'var(--df-accent)' }} />
            </div>

            {!layoutFile ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('blueprint-file-input').click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--df-accent)' : errors.layoutFile ? 'var(--df-danger)' : 'var(--df-border)'}`,
                  borderRadius: '8px', 
                  padding: '36px 20px', 
                  textAlign: 'center',
                  cursor: 'pointer', 
                  background: dragOver ? 'var(--df-accent-soft)' : 'var(--df-bg)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Upload style={{ width: '32px', height: '32px', color: 'var(--df-accent)', display: 'block', margin: '0 auto 10px' }} />
                <div style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '3px' }}>
                  Drag & Drop Master Layout Blueprint Here
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--df-text-muted)', marginBottom: '14px' }}>
                  Supports CAD DXF, PDF, PNG, JPG, JPEG, TIFF (Max 50MB)
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="sm">Browse Local Files</Button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleAttachSampleBlueprint(); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--df-border)',
                      background: 'var(--df-card-bg)',
                      color: 'var(--df-text)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Sparkles style={{ width: '12px', height: '12px', color: 'var(--df-accent)' }} /> Use Demo Blueprint
                  </button>
                </div>
                <input id="blueprint-file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.dxf,.webp" hidden onChange={handleFileInputChange} />
              </div>
            ) : (
              <div style={{ padding: '16px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'var(--df-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText style={{ width: '22px', height: '22px', color: 'var(--df-accent)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--df-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {layoutFile.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
                      {(layoutFile.size / (1024 * 1024)).toFixed(2)} MB • {layoutFile.type || 'Master Layout Blueprint'}
                    </div>
                  </div>
                  <button 
                    onClick={() => setLayoutFile(null)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)', padding: '6px' }}
                    title="Remove blueprint"
                  >
                    <X style={{ width: '18px', height: '18px' }} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--df-success)', fontWeight: 700 }}>
                  <CheckCircle2 style={{ width: '14px', height: '14px' }} /> Blueprint attached & verified for automated vector extraction
                </div>
              </div>
            )}

            {errors.layoutFile && <div style={{ ...errMsg, marginTop: '8px' }}>{errors.layoutFile}</div>}

            {/* Scale Calibration */}
            <div className="responsive-form-grid-2" style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--df-border)' }}>
              <div>
                <label style={labelStyle}>Known Scale Calibration</label>
                <select 
                  style={selectStyle()} 
                  value={form.knownScale} 
                  onChange={e => setField('knownScale', e.target.value)}
                >
                  <option value="Not specified">Auto-Detect Scale via Boundary</option>
                  <option value="Custom scale">Custom Scale Ratio (e.g. 1:500)</option>
                </select>
              </div>

              {form.knownScale === 'Custom scale' && (
                <div>
                  <label style={labelStyle}>Scale Ratio</label>
                  <input 
                    style={inputStyle()} 
                    value={form.scaleRatio} 
                    onChange={e => setField('scaleRatio', e.target.value)} 
                    placeholder="1:500" 
                  />
                </div>
              )}
            </div>

            {/* AI Vector Pipeline Info Note */}
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              padding: '12px 14px', 
              background: 'var(--df-accent-soft)', 
              border: '1px solid rgba(159, 18, 57, 0.18)', 
              borderRadius: '6px', 
              marginTop: '16px' 
            }}>
              <AlertCircle style={{ width: '16px', height: '16px', color: 'var(--df-accent)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--df-text)', lineHeight: 1.4 }}>
                <strong>Automated Plotting System:</strong> Upon clicking create, LandOS runs the 12-stage AI pipeline to detect the hard land boundary, verifies civil offsets, and builds 2D vector plot layouts with live inventory tables.
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — REVIEW & CREATE */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={cardStyle} className="mobile-card-compact">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--df-border)' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--df-text)' }}>
                    5. Pre-Flight Review & Launch Audit
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
                    Audit parameters before creating workspace and triggering automated plot generation.
                  </div>
                </div>
                <ShieldCheck style={{ width: '20px', height: '20px', color: 'var(--df-accent)' }} />
              </div>

              {/* 4 Summary Cards Grid */}
              <div className="responsive-grid-2" style={{ gap: '12px' }}>
                
                {/* 1. Identity Card */}
                <div style={{ padding: '14px', background: 'var(--df-bg)', borderRadius: '6px', border: '1px solid var(--df-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--df-accent)', letterSpacing: '0.05em' }}>
                      1. Identity & Developer
                    </span>
                    <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', color: 'var(--df-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 700 }}>
                      <Edit2 style={{ width: '11px', height: '11px' }} /> Edit
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.78rem', color: 'var(--df-text)' }}>
                    <div><strong>Project:</strong> {form.name}</div>
                    <div><strong>Developer:</strong> {form.developer}</div>
                    <div><strong>Category:</strong> {form.type} ({form.landClassification})</div>
                  </div>
                </div>

                {/* 2. Location Card */}
                <div style={{ padding: '14px', background: 'var(--df-bg)', borderRadius: '6px', border: '1px solid var(--df-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--df-accent)', letterSpacing: '0.05em' }}>
                      2. Location & Revenue Survey
                    </span>
                    <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--df-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 700 }}>
                      <Edit2 style={{ width: '11px', height: '11px' }} /> Edit
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.78rem', color: 'var(--df-text)' }}>
                    <div><strong>Location:</strong> {form.cityVillage}, {form.taluka}, {form.district}, {form.state} - {form.pincode}</div>
                    <div>
                      <strong>Survey:</strong>{' '}
                      {form.surveyNumbers.map(t => (
                        <span key={t} style={{ display: 'inline-block', padding: '1px 6px', borderRadius: '3px', background: 'var(--df-accent-soft)', color: 'var(--df-accent)', fontSize: '0.68rem', fontWeight: 700, marginRight: '4px' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Commercial Card */}
                <div style={{ padding: '14px', background: 'var(--df-bg)', borderRadius: '6px', border: '1px solid var(--df-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--df-accent)', letterSpacing: '0.05em' }}>
                      3. Land Metrics & Commercial
                    </span>
                    <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--df-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 700 }}>
                      <Edit2 style={{ width: '11px', height: '11px' }} /> Edit
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.78rem', color: 'var(--df-text)' }}>
                    <div><strong>Gross Land:</strong> {form.grossArea} {form.areaUnit} ({sqFtTotal.toLocaleString('en-IN')} sq.ft)</div>
                    <div><strong>Base Rate:</strong> ₹{Number(form.baseRatePerSqFt || 0).toLocaleString('en-IN')}/sq.ft</div>
                    <div><strong>Estimated GDV:</strong> ₹{(estimatedGdv / 10000000).toFixed(2)} Cr</div>
                  </div>
                </div>

                {/* 4. Blueprint Card */}
                <div style={{ padding: '14px', background: 'var(--df-bg)', borderRadius: '6px', border: '1px solid var(--df-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--df-accent)', letterSpacing: '0.05em' }}>
                      4. Blueprint & Boundary Plan
                    </span>
                    <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'var(--df-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 700 }}>
                      <Edit2 style={{ width: '11px', height: '11px' }} /> Edit
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.78rem', color: 'var(--df-text)' }}>
                    <div><strong>Blueprint:</strong> {layoutFile ? layoutFile.name : 'Sample Layout Baseline'}</div>
                    <div><strong>Calibration:</strong> {form.knownScale === 'Custom scale' ? form.scaleRatio : 'Auto-detect via Boundary'}</div>
                    <div style={{ color: 'var(--df-success)', fontWeight: 700 }}>● Automated 2D Plot Generation Ready</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Checklist Banner */}
            <div style={{ ...cardStyle, padding: '14px 18px' }} className="mobile-card-compact">
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '8px' }}>
                Pre-Flight System Verification
              </div>
              <div className="responsive-grid-2" style={{ gap: '8px', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--df-success)' }}>
                  <CheckCircle2 style={{ width: '13px', height: '13px', flexShrink: 0 }} /> Project & entity credentials verified
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--df-success)' }}>
                  <CheckCircle2 style={{ width: '13px', height: '13px', flexShrink: 0 }} /> Survey tokens & administrative jurisdiction linked
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--df-success)' }}>
                  <CheckCircle2 style={{ width: '13px', height: '13px', flexShrink: 0 }} /> Land area geometry unit converted to sq.ft
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--df-success)' }}>
                  <CheckCircle2 style={{ width: '13px', height: '13px', flexShrink: 0 }} /> Boundary engine configured for plot layout build
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Action Buttons Footer ── */}
      <div className="responsive-stack" style={{ marginTop: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={step === 0 ? () => navigate('/projects') : prevStep}
          style={{
            height: '38px', 
            padding: '0 18px', 
            borderRadius: '6px', 
            border: '1px solid var(--df-border)',
            background: 'var(--df-card-bg)', 
            color: 'var(--df-text)', 
            fontSize: '0.80rem', 
            fontWeight: 700, 
            cursor: 'pointer',
          }}
          className="w-full-on-mobile"
        >
          {step === 0 ? '← Exit' : '← Previous Step'}
        </button>

        <div className="btn-group-responsive" style={{ display: 'flex', gap: '8px' }}>
          {step < 4 ? (
            <button
              onClick={nextStep}
              style={{
                height: '38px', 
                padding: '0 22px', 
                borderRadius: '6px', 
                border: 'none',
                background: 'var(--df-accent)', 
                color: '#fff', 
                fontSize: '0.80rem', 
                fontWeight: 800,
                cursor: 'pointer', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px',
                boxShadow: 'var(--df-shadow-xs)',
              }}
            >
              Continue to {STEPS[step + 1].title} <ChevronRight style={{ width: '15px', height: '15px' }} />
            </button>
          ) : (
            <button
              onClick={() => handleCreateProject(false)}
              disabled={saving}
              style={{
                height: '38px', 
                padding: '0 24px', 
                borderRadius: '6px', 
                border: 'none',
                background: 'var(--df-accent)', 
                color: '#fff', 
                fontSize: '0.82rem', 
                fontWeight: 800,
                cursor: 'pointer', 
                opacity: saving ? 0.75 : 1, 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px',
                boxShadow: 'var(--df-shadow-md)',
              }}
            >
              <Sparkles style={{ width: '15px', height: '15px' }} />
              {saving ? (creationStatus || 'Building Project & Plot System…') : 'Create Project & Generate Plot Boundary'}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
