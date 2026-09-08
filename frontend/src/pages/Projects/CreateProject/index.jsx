import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Check, ChevronRight, Upload, X, ArrowLeft, Building2, MapPin, 
  Layers, Calendar, IndianRupee, Tag, FileText, Compass, ShieldCheck, 
  Plus, Edit2, AlertCircle, File, CheckCircle2, AlertTriangle
} from 'lucide-react';
import projectService from '../../../services/projectService';
import { Button, Badge } from '../../../components/ui';

const STEPS = [
  { id: 'identity', title: 'Identity & Type', headline: '1. Project & Developer Identity', subtitle: 'Enter primary project name, legal developer entity, and land classification' },
  { id: 'location', title: 'Location & Survey', headline: '2. Location, Survey & Geo Identity', subtitle: 'Specify administrative location, survey numbers, coordinates & legal approvals' },
  { id: 'commercial', title: 'Land & Commercial', headline: '3. Commercial Baseline & Land Metrics', subtitle: 'Specify total gross land area, measurement unit & baseline price expectations' },
  { id: 'layout', title: 'Master Layout', headline: '4. Upload Master Layout Blueprint', subtitle: 'Attach high-resolution CAD/PDF/Image master layout map (up to 50MB)' },
  { id: 'review', title: 'Review & Create', headline: '5. Pre-Flight Review & Launch Audit', subtitle: 'Audit project parameters and initiate automated layout processing' },
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
  district: '',
  taluka: '',
  cityVillage: '',
  pincode: '',
  surveyNumbers: [], // Array of tag strings
  latitude: '',
  longitude: '',
  approvingAuthority: '',
  reraNo: '',

  // Step 3: Commercial Baseline
  grossArea: '',
  areaUnit: 'Acres',
  baseRatePerSqFt: '',
  priceMin: '',
  priceMax: '',
  startDate: new Date().toISOString().split('T')[0],
  expectedCompletion: '',

  // Step 4: Master Layout File & Scale
  knownScale: 'Not specified',
  scaleRatio: '',
};

export default function CreateProject() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse step from URL query param ?step=X
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
  const [errors, setErrors] = useState({});

  // Helper setter
  const setField = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  // --- Survey Tag Management ---
  const handleAddSurveyTag = (e) => {
    if (e) e.preventDefault();
    const trimmed = surveyTagInput.trim().replace(/^,+|,+$/g, '');
    if (!trimmed) return;

    // Split by comma if user typed multiple comma-separated values
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

  // --- Step Validations ---
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

    // Auto-commit any remaining text in surveyTagInput
    let currentTags = [...form.surveyNumbers];
    if (surveyTagInput.trim()) {
      const extraTags = surveyTagInput.trim().split(',').map(t => t.trim()).filter(Boolean);
      currentTags = Array.from(new Set([...currentTags, ...extraTags]));
      setForm(f => ({ ...f, surveyNumbers: currentTags }));
      setSurveyTagInput('');
    }

    if (currentTags.length === 0) {
      e.surveyNumbers = 'At least one Survey / Gut / Khasra number is required';
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

  // --- Layout File Drop Handling ---
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
    const maxBytes = 50 * 1024 * 1024; // 50MB
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

  // --- Final Project Creation ---
  const handleCreateProject = async (isDraft = false) => {
    try {
      setSaving(true);
      
      const payload = {
        ...form,
        grossArea: Number(form.grossArea),
        status: isDraft ? 'DRAFT' : (layoutFile ? 'LAYOUT_PENDING' : 'DRAFT'),
        layoutUploaded: Boolean(layoutFile),
        layoutFile: layoutFile ? {
          name: layoutFile.name,
          size: layoutFile.size,
          type: layoutFile.type,
        } : null,
      };

      const newProject = await projectService.createProject(payload);

      // Upload the actual binary layout file to backend storage
      if (layoutFile && newProject?.id) {
        await projectService.uploadLayoutFile(newProject.id, layoutFile, form.scaleRatio || 'Not specified');
      }

      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setSaving(false);
    }
  };

  // Common UI styles
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
    width: '100%', height: '40px', padding: '0 12px', fontSize: '0.85rem',
    background: 'var(--df-bg)', border: `1px solid ${err ? 'var(--df-danger)' : 'var(--df-border)'}`,
    borderRadius: '6px', color: 'var(--df-text)', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  });
  const textareaStyle = (err) => ({ 
    ...inputStyle(err), 
    height: '84px', 
    padding: '10px 12px', 
    resize: 'vertical', 
    lineHeight: 1.5 
  });
  const selectStyle = (err) => ({ ...inputStyle(err), cursor: 'pointer' });
  const errMsg = { fontSize: '0.68rem', color: 'var(--df-danger)', marginTop: '4px', fontWeight: 600 };

  return (
    <div style={{ padding: '0', width: '100%', margin: '0 auto', animation: 'landos-fade-in 0.2s ease-out' }}>
      
      {/* Workspace Page Header */}
      <div className="page-header-container responsive-stack" style={{
        padding: '16px 20px',
        backgroundColor: 'var(--df-card-bg)',
        border: '1px solid var(--df-card-border)',
        borderRadius: '8px',
        boxShadow: 'var(--df-shadow-xs)',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--df-accent)', marginBottom: '3px' }}>
            Step {step + 1} of 5 — Setup Wizard
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--df-text)', margin: 0, lineHeight: 1.2 }}>
            {STEPS[step].headline}
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--df-text-muted)', margin: '3px 0 0' }}>
            {STEPS[step].subtitle}
          </p>
        </div>

        {/* Progress indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--df-text)' }}>
              {Math.round(((step + 1) / 5) * 100)}% Complete
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>
              Step {step + 1} of 5
            </div>
          </div>
          <div style={{ width: '80px', height: '6px', borderRadius: '3px', background: 'var(--df-border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((step + 1) / 5) * 100}%`, background: 'var(--df-accent)', borderRadius: '3px', transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* STEP 0 — PROJECT & DEVELOPER IDENTITY                         */}
      {/* ============================================================ */}
      {step === 0 && (
        <div style={cardStyle} className="mobile-card-compact">
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '4px' }}>
            Project & Developer Identity
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--df-text-muted)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--df-border)' }}>
            Enter primary project registration name, legal developer entity, and land category.
          </div>

          <div className="responsive-form-grid-2">
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Project Name *</label>
              <input 
                style={inputStyle(errors.name)} 
                value={form.name} 
                onChange={e => setField('name', e.target.value)} 
                placeholder="e.g. Sunrise Valley Phase 2" 
              />
              {errors.name && <div style={errMsg}>{errors.name}</div>}
            </div>

            <div>
              <label style={labelStyle}>Developer Entity *</label>
              <input 
                style={inputStyle(errors.developer)} 
                value={form.developer} 
                onChange={e => setField('developer', e.target.value)} 
                placeholder="e.g. Sunrise Infra Pvt Ltd" 
              />
              {errors.developer && <div style={errMsg}>{errors.developer}</div>}
            </div>

            <div>
              <label style={labelStyle}>Project Type *</label>
              <select 
                style={selectStyle(errors.type)} 
                value={form.type} 
                onChange={e => setField('type', e.target.value)}
              >
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Mixed Use">Mixed Use</option>
                <option value="Industrial">Industrial</option>
                <option value="Farm Plots">Farm Plots</option>
              </select>
              {errors.type && <div style={errMsg}>{errors.type}</div>}
            </div>

            <div>
              <label style={labelStyle}>Land Classification *</label>
              <select 
                style={selectStyle(errors.landClassification)} 
                value={form.landClassification} 
                onChange={e => setField('landClassification', e.target.value)}
              >
                <option value="N.A. Residential">N.A. Residential</option>
                <option value="N.A. Commercial">N.A. Commercial</option>
                <option value="Agricultural">Agricultural</option>
                <option value="Gram Panchayat">Gram Panchayat Approved</option>
              </select>
              {errors.landClassification && <div style={errMsg}>{errors.landClassification}</div>}
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Project Description (Optional)</label>
              <textarea 
                style={textareaStyle()} 
                value={form.description} 
                onChange={e => setField('description', e.target.value)} 
                placeholder="Enter executive summary, key highlights, marketing pitch or project notes..." 
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 1 — LOCATION, SURVEY & GEO IDENTITY                     */}
      {/* ============================================================ */}
      {step === 1 && (
        <div style={cardStyle} className="mobile-card-compact">
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '4px' }}>
            Location, Survey & Geo Identity
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--df-text-muted)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--df-border)' }}>
            Specify administrative location, land survey numbers (tag input), coordinates & regulatory registration.
          </div>

          <div className="responsive-form-grid-3">
            <div>
              <label style={labelStyle}>State *</label>
              <input 
                style={inputStyle(errors.state)} 
                value={form.state} 
                onChange={e => setField('state', e.target.value)} 
                placeholder="e.g. Maharashtra" 
              />
              {errors.state && <div style={errMsg}>{errors.state}</div>}
            </div>

            <div>
              <label style={labelStyle}>District *</label>
              <input 
                style={inputStyle(errors.district)} 
                value={form.district} 
                onChange={e => setField('district', e.target.value)} 
                placeholder="e.g. Pune" 
              />
              {errors.district && <div style={errMsg}>{errors.district}</div>}
            </div>

            <div>
              <label style={labelStyle}>Taluka *</label>
              <input 
                style={inputStyle(errors.taluka)} 
                value={form.taluka} 
                onChange={e => setField('taluka', e.target.value)} 
                placeholder="e.g. Haveli" 
              />
              {errors.taluka && <div style={errMsg}>{errors.taluka}</div>}
            </div>

            <div>
              <label style={labelStyle}>City / Village *</label>
              <input 
                style={inputStyle(errors.cityVillage)} 
                value={form.cityVillage} 
                onChange={e => setField('cityVillage', e.target.value)} 
                placeholder="e.g. Wagholi, Pune" 
              />
              {errors.cityVillage && <div style={errMsg}>{errors.cityVillage}</div>}
            </div>

            <div>
              <label style={labelStyle}>Pincode *</label>
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
              <label style={labelStyle}>RERA Reg. Number (Optional)</label>
              <input 
                style={inputStyle()} 
                value={form.reraNo} 
                onChange={e => setField('reraNo', e.target.value)} 
                placeholder="e.g. P52100012345" 
              />
            </div>

            {/* Survey / Gut / Khasra Numbers Tag Input */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Survey / Gut / Khasra Numbers *</label>
              
              {/* Active Tag Pills */}
              <div style={{ 
                display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px', 
                minHeight: form.surveyNumbers.length > 0 ? 'auto' : '0' 
              }}>
                {form.surveyNumbers.map(tag => (
                  <span 
                    key={tag}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '4px 10px', borderRadius: '4px',
                      background: 'var(--df-accent-medium)', border: '1px solid rgba(122,30,58,0.2)',
                      color: 'var(--df-accent)', fontSize: '0.78rem', fontWeight: 700
                    }}
                  >
                    <Tag style={{ width: '12px', height: '12px' }} />
                    {tag}
                    <button 
                      type="button"
                      onClick={() => handleRemoveSurveyTag(tag)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-accent)', padding: 0, display: 'flex' }}
                    >
                      <X style={{ width: '13px', height: '13px' }} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Tag Input Box & Add Button */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  style={{ ...inputStyle(errors.surveyNumbers), flex: 1 }} 
                  value={surveyTagInput} 
                  onChange={e => setSurveyTagInput(e.target.value)} 
                  onKeyDown={handleSurveyKeyDown}
                  onBlur={() => handleAddSurveyTag()}
                  placeholder="Type survey number (e.g. Gut No. 142/1) and press Enter or comma" 
                />
                <button
                  type="button"
                  onClick={handleAddSurveyTag}
                  style={{
                    height: '40px', padding: '0 16px', borderRadius: '6px', border: '1px solid var(--df-border)',
                    background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '0.78rem', fontWeight: 700,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0,
                  }}
                >
                  <Plus style={{ width: '14px', height: '14px' }} /> Add Tag
                </button>
              </div>
              {errors.surveyNumbers ? (
                <div style={errMsg}>{errors.surveyNumbers}</div>
              ) : (
                <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted)', marginTop: '4px' }}>
                  Press Enter or comma (,) to add multiple survey tokens.
                </div>
              )}
            </div>

            {/* GIS / Geolocation Coordinates */}
            <div>
              <label style={labelStyle}>Latitude (Recommended)</label>
              <input 
                style={inputStyle()} 
                type="number"
                step="any"
                value={form.latitude} 
                onChange={e => setField('latitude', e.target.value)} 
                placeholder="e.g. 18.5204" 
              />
            </div>

            <div>
              <label style={labelStyle}>Longitude (Recommended)</label>
              <input 
                style={inputStyle()} 
                type="number"
                step="any"
                value={form.longitude} 
                onChange={e => setField('longitude', e.target.value)} 
                placeholder="e.g. 73.8567" 
              />
            </div>

            <div>
              <label style={labelStyle}>Approving Authority (Optional)</label>
              <input 
                style={inputStyle()} 
                value={form.approvingAuthority} 
                onChange={e => setField('approvingAuthority', e.target.value)} 
                placeholder="e.g. PMRDA, MMRDA, DTCP" 
              />
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 2 — COMMERCIAL BASELINE & LAND METRICS                  */}
      {/* ============================================================ */}
      {step === 2 && (
        <div style={cardStyle} className="mobile-card-compact">
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '4px' }}>
            Commercial Baseline & Land Metrics
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--df-text-muted)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--df-border)' }}>
            Specify total gross land area, measurement units, target base rates & estimated project launch dates.
          </div>

          <div className="responsive-form-grid-2">
            {/* Total Land Area & Unit Selector */}
            <div>
              <label style={labelStyle}>Total Gross Land Area *</label>
              <input 
                style={inputStyle(errors.grossArea)} 
                type="number" 
                step="any"
                value={form.grossArea} 
                onChange={e => setField('grossArea', e.target.value)} 
                placeholder="e.g. 45" 
              />
              {errors.grossArea && <div style={errMsg}>{errors.grossArea}</div>}
            </div>

            <div>
              <label style={labelStyle}>Area Measurement Unit *</label>
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
                placeholder="e.g. 3500" 
              />
            </div>

            <div className="responsive-form-grid-2" style={{ gap: '10px' }}>
              <div>
                <label style={labelStyle}>Min Plot Price (₹)</label>
                <input 
                  style={inputStyle()} 
                  type="number" 
                  value={form.priceMin} 
                  onChange={e => setField('priceMin', e.target.value)} 
                  placeholder="2500000" 
                />
              </div>

              <div>
                <label style={labelStyle}>Max Plot Price (₹)</label>
                <input 
                  style={inputStyle()} 
                  type="number" 
                  value={form.priceMax} 
                  onChange={e => setField('priceMax', e.target.value)} 
                  placeholder="8000000" 
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Target Launch Date</label>
              <input 
                style={inputStyle()} 
                type="date" 
                value={form.startDate} 
                onChange={e => setField('startDate', e.target.value)} 
              />
            </div>

            <div>
              <label style={labelStyle}>Expected Completion Date</label>
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

      {/* ============================================================ */}
      {/* STEP 3 — MASTER LAYOUT BLUEPRINT UPLOAD                      */}
      {/* ============================================================ */}
      {step === 3 && (
        <div style={cardStyle} className="mobile-card-compact">
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '4px' }}>
            Upload Master Layout Blueprint
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--df-text-muted)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--df-border)' }}>
            Upload master CAD / PDF / High-res image layout map for automated vector plot extraction (PDF, PNG, JPG, JPEG, TIFF up to 50MB).
          </div>

          {!layoutFile ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById('blueprint-file-input').click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--df-accent)' : errors.layoutFile ? 'var(--df-danger)' : 'var(--df-border)'}`,
                borderRadius: '8px', padding: '40px 24px', textAlign: 'center',
                cursor: 'pointer', background: dragOver ? 'var(--df-accent-medium)' : 'var(--df-bg)',
                transition: 'all 0.15s',
              }}
            >
              <Upload style={{ width: '36px', height: '36px', color: 'var(--df-accent)', display: 'block', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--df-text)', marginBottom: '4px' }}>
                Drag & Drop Master Layout Blueprint Here
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--df-text-muted)', marginBottom: '12px' }}>
                or click to browse from device (CAD DXF, PDF, PNG, JPG, JPEG, TIFF up to 50MB)
              </div>
              <Button variant="secondary" size="sm">Browse Device Files</Button>
              <input id="blueprint-file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.dxf,.webp" hidden onChange={handleFileInputChange} />
            </div>
          ) : (
            <div style={{ padding: '16px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--df-accent-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
                  <FileText style={{ width: '24px', height: '24px', color: 'var(--df-accent)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--df-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {layoutFile.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--df-text-muted)', marginTop: '2px' }}>
                    {(layoutFile.size / (1024 * 1024)).toFixed(2)} MB • {layoutFile.type || 'Blueprint File'}
                  </div>
                </div>
                <button 
                  onClick={() => setLayoutFile(null)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)', padding: '6px' }}
                  title="Remove blueprint"
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>

              {/* Upload Complete Simulated Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: 'var(--df-success)', fontWeight: 700 }}>
                <CheckCircle2 style={{ width: '14px', height: '14px' }} /> File attached & ready for processing pipeline
              </div>
            </div>
          )}

          {errors.layoutFile && <div style={{ ...errMsg, marginTop: '8px' }}>{errors.layoutFile}</div>}

          {/* Scale Calibration Field */}
          <div className="responsive-form-grid-2" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--df-border)' }}>
            <div>
              <label style={labelStyle}>Known Scale Calibration</label>
              <select 
                style={selectStyle()} 
                value={form.knownScale} 
                onChange={e => setField('knownScale', e.target.value)}
              >
                <option value="Not specified">Not specified / Auto-detect</option>
                <option value="Custom scale">Custom scale ratio</option>
              </select>
            </div>

            {form.knownScale === 'Custom scale' && (
              <div>
                <label style={labelStyle}>Scale Ratio (e.g. 1:500)</label>
                <input 
                  style={inputStyle()} 
                  value={form.scaleRatio} 
                  onChange={e => setField('scaleRatio', e.target.value)} 
                  placeholder="e.g. 1:500" 
                />
              </div>
            )}
          </div>

          {/* Processing Note */}
          <div style={{ display: 'flex', gap: '10px', padding: '12px 14px', background: 'var(--df-accent-soft)', border: '1px solid rgba(122,30,58,0.15)', borderRadius: '6px', marginTop: '16px' }}>
            <AlertCircle style={{ width: '16px', height: '16px', color: 'var(--df-accent)', shrink: 0, marginTop: '1px' }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--df-text)', lineHeight: 1.4 }}>
              <strong>Pipeline Hand-off Note:</strong> Attaching a master layout blueprint queues this file for future AI & GIS vector plot extraction. Plot boundaries and counts will be generated automatically after project creation.
            </div>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 4 — REVIEW & CREATE                                     */}
      {/* ============================================================ */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={cardStyle} className="mobile-card-compact">
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '4px' }}>
              Pre-Flight Review & Launch Audit
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--df-text-muted)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--df-border)' }}>
              Audit project parameters across all 4 sections before triggering workspace creation.
            </div>

            {/* Grid of Cards */}
            <div className="responsive-grid-2">
              
              {/* Card 1: Identity */}
              <div style={{ padding: '14px', background: 'var(--df-bg)', borderRadius: '6px', border: '1px solid var(--df-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--df-accent)', letterSpacing: '0.05em' }}>
                    1. Identity & Classification
                  </span>
                  <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', color: 'var(--df-text-muted)', cursor: 'pointer', display: 'flex', gap: '3px', fontSize: '0.68rem', fontWeight: 700 }}>
                    <Edit2 style={{ width: '12px', height: '12px' }} /> Edit
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: 'var(--df-text)' }}>
                  <div><strong>Name:</strong> {form.name}</div>
                  <div><strong>Developer:</strong> {form.developer}</div>
                  <div><strong>Type:</strong> {form.type}</div>
                  <div><strong>Land Class:</strong> {form.landClassification}</div>
                </div>
              </div>

              {/* Card 2: Location */}
              <div style={{ padding: '14px', background: 'var(--df-bg)', borderRadius: '6px', border: '1px solid var(--df-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--df-accent)', letterSpacing: '0.05em' }}>
                    2. Location & Survey
                  </span>
                  <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--df-text-muted)', cursor: 'pointer', display: 'flex', gap: '3px', fontSize: '0.68rem', fontWeight: 700 }}>
                    <Edit2 style={{ width: '12px', height: '12px' }} /> Edit
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: 'var(--df-text)' }}>
                  <div><strong>Address:</strong> {form.cityVillage}, {form.taluka}, {form.district}, {form.state} - {form.pincode}</div>
                  <div>
                    <strong>Survey Nos:</strong>{' '}
                    {form.surveyNumbers.map(t => (
                      <span key={t} style={{ display: 'inline-block', padding: '1px 5px', borderRadius: '3px', background: 'var(--df-accent-medium)', color: 'var(--df-accent)', fontSize: '0.7rem', fontWeight: 700, marginRight: '4px' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  {form.reraNo && <div><strong>RERA No:</strong> {form.reraNo}</div>}
                </div>
              </div>

              {/* Card 3: Commercial */}
              <div style={{ padding: '14px', background: 'var(--df-bg)', borderRadius: '6px', border: '1px solid var(--df-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--df-accent)', letterSpacing: '0.05em' }}>
                    3. Commercial & Land
                  </span>
                  <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--df-text-muted)', cursor: 'pointer', display: 'flex', gap: '3px', fontSize: '0.68rem', fontWeight: 700 }}>
                    <Edit2 style={{ width: '12px', height: '12px' }} /> Edit
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: 'var(--df-text)' }}>
                  <div><strong>Gross Land Area:</strong> {form.grossArea} {form.areaUnit}</div>
                  <div><strong>Base Rate:</strong> {form.baseRatePerSqFt ? `₹${Number(form.baseRatePerSqFt).toLocaleString('en-IN')}/sq.ft` : 'Not specified'}</div>
                  <div><strong>Est. Price Range:</strong> {form.priceMin ? `₹${Number(form.priceMin).toLocaleString('en-IN')} – ₹${Number(form.priceMax || 0).toLocaleString('en-IN')}` : 'Not specified'}</div>
                </div>
              </div>

              {/* Card 4: Blueprint */}
              <div style={{ padding: '14px', background: 'var(--df-bg)', borderRadius: '6px', border: '1px solid var(--df-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--df-accent)', letterSpacing: '0.05em' }}>
                    4. Master Layout Blueprint
                  </span>
                  <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'var(--df-text-muted)', cursor: 'pointer', display: 'flex', gap: '3px', fontSize: '0.68rem', fontWeight: 700 }}>
                    <Edit2 style={{ width: '12px', height: '12px' }} /> Edit
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: 'var(--df-text)' }}>
                  <div><strong>Layout File:</strong> {layoutFile ? layoutFile.name : 'No layout file attached (Deferred)'}</div>
                  <div><strong>Scale Ratio:</strong> {form.knownScale === 'Custom scale' ? form.scaleRatio : 'Auto-detect'}</div>
                  <div><strong>Initial Status:</strong> {layoutFile ? 'LAYOUT_PENDING' : 'DRAFT'}</div>
                </div>
              </div>

            </div>
          </div>

          {/* Pre-Flight Checklist Card */}
          <div style={{ ...cardStyle, padding: '16px 20px' }} className="mobile-card-compact">
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--df-text)', marginBottom: '8px' }}>
              Pre-Flight System Checklist
            </div>
            <div className="responsive-grid-2" style={{ gap: '8px', fontSize: '0.72rem', color: 'var(--df-text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--df-success)' }}>
                <CheckCircle2 style={{ width: '14px', height: '14px', shrink: 0 }} /> Project & developer identity verified
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--df-success)' }}>
                <CheckCircle2 style={{ width: '14px', height: '14px', shrink: 0 }} /> Address & survey numbers verified
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--df-success)' }}>
                <CheckCircle2 style={{ width: '14px', height: '14px', shrink: 0 }} /> Gross area & measurement unit verified
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: layoutFile ? 'var(--df-success)' : 'var(--df-warning)' }}>
                {layoutFile ? (
                  <CheckCircle2 style={{ width: '14px', height: '14px', shrink: 0 }} />
                ) : (
                  <AlertTriangle style={{ width: '14px', height: '14px', shrink: 0 }} />
                )}
                {layoutFile ? 'Master layout file attached' : 'Layout upload deferred (DRAFT)'}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Actions Bottom Bar */}
      <div className="responsive-stack" style={{ marginTop: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={step === 0 ? () => navigate('/projects') : prevStep}
          style={{
            height: '40px', padding: '0 20px', borderRadius: '6px', border: '1px solid var(--df-border)',
            background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
          }}
          className="w-full-on-mobile"
        >
          {step === 0 ? 'Cancel' : '← Back'}
        </button>

        <div className="btn-group-responsive" style={{ display: 'flex', gap: '10px' }}>
          {step === 4 && (
            <button
              onClick={() => handleCreateProject(true)}
              disabled={saving}
              style={{
                height: '40px', padding: '0 18px', borderRadius: '6px', border: '1px solid var(--df-border)',
                background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Save as Draft
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={nextStep}
              style={{
                height: '40px', padding: '0 24px', borderRadius: '6px', border: 'none',
                background: 'var(--df-accent)', color: '#fff', fontSize: '0.8rem', fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              Next Step <ChevronRight style={{ width: '16px', height: '16px' }} />
            </button>
          ) : (
            <button
              onClick={() => handleCreateProject(false)}
              disabled={saving}
              style={{
                height: '40px', padding: '0 24px', borderRadius: '6px', border: 'none',
                background: 'var(--df-accent)', color: '#fff', fontSize: '0.82rem', fontWeight: 800,
                cursor: 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {saving ? 'Creating Project…' : layoutFile ? '✓ Create Project & Process Layout' : '✓ Create Project'}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
