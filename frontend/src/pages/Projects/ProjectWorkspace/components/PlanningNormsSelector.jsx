import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Layers, 
  FileText, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Trees, 
  Home, 
  Compass, 
  Zap,
  Info
} from 'lucide-react';
import { projectService } from '../../../../services/projectService';

export default function PlanningNormsSelector({
  project,
  onGenerate,
  isGenerating = false,
  onNormsChange = null
}) {
  const [jurisdictions, setJurisdictions] = useState([]);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState(
    project?.jurisdictionId || 'IN_MH_PMC'
  );
  const [cityArea, setCityArea] = useState(project?.location?.city_village || 'Pune');
  const [landUse, setLandUse] = useState('RESIDENTIAL');
  const [planningRegulation, setPlanningRegulation] = useState('UDCPR_2020');
  const [isCongested, setIsCongested] = useState(false);
  const [evaluatedNorms, setEvaluatedNorms] = useState(null);
  const [loadingNorms, setLoadingNorms] = useState(false);

  // Load Maharashtra Authorities from backend
  useEffect(() => {
    async function loadAuthorities() {
      try {
        const res = await projectService.getPlanningJurisdictions();
        if (res?.authorities?.length > 0) {
          setJurisdictions(res.authorities);
        } else {
          // Fallback authorities
          setJurisdictions([
            { id: 'IN_MH_PMC', name: 'Pune Municipal Corporation (PMC)', shortName: 'PMC Pune' },
            { id: 'IN_MH_PCMC', name: 'Pimpri-Chinchwad Municipal Corporation (PCMC)', shortName: 'PCMC' },
            { id: 'IN_MH_BMC', name: 'Brihanmumbai Municipal Corporation (BMC / MCGM)', shortName: 'BMC Mumbai' },
            { id: 'IN_MH_PMRDA', name: 'Pune Metropolitan Region Development Authority (PMRDA)', shortName: 'PMRDA' },
            { id: 'IN_MH_NMMC', name: 'Navi Mumbai Municipal Corporation / CIDCO', shortName: 'NMMC / CIDCO' },
            { id: 'IN_MH_TMC', name: 'Thane Municipal Corporation (TMC)', shortName: 'TMC Thane' },
            { id: 'IN_MH_NMC', name: 'Nagpur Municipal Corporation (NMC) / NIT', shortName: 'NMC Nagpur' },
            { id: 'IN_MH_COUNCILS', name: 'Maharashtra Municipal Councils (Class A/B/C)', shortName: 'MH Municipal Councils' },
            { id: 'IN_MH_REGIONAL_PLAN', name: 'Maharashtra Regional Plan (Rural NA Layouts)', shortName: 'Regional Plan / Collectorate' },
            { id: 'IN_MH_UDCPR_STANDARD', name: 'Unified Development Control and Promotion Regulations (UDCPR 2020)', shortName: 'UDCPR Standard Baseline' }
          ]);
        }
      } catch (err) {
        console.warn('Failed to load jurisdictions:', err);
      }
    }
    loadAuthorities();
  }, []);

  // Recalculate norms whenever jurisdiction or area parameters change
  useEffect(() => {
    async function recalculate() {
      setLoadingNorms(true);
      try {
        const areaSqft = (project?.land_length_ft && project?.land_breadth_ft)
          ? project.land_length_ft * project.land_breadth_ft
          : 60000.0;

        const res = await projectService.evaluatePlanningNorms({
          jurisdictionId: selectedJurisdiction,
          landAreaSqft: areaSqft,
          landUse,
          isCongested
        });

        if (res) {
          setEvaluatedNorms(res);
          if (onNormsChange) onNormsChange(res);
        }
      } catch (e) {
        console.warn('Error evaluating norms:', e);
      } finally {
        setLoadingNorms(false);
      }
    }

    recalculate();
  }, [selectedJurisdiction, landUse, isCongested, project?.land_length_ft, project?.land_breadth_ft]);

  const handleTriggerGenerate = () => {
    if (onGenerate) {
      onGenerate({
        jurisdictionId: selectedJurisdiction,
        cityArea,
        landUse,
        isCongested,
        planningRegulation,
        lengthFt: project?.land_length_ft || 300,
        breadthFt: project?.land_breadth_ft || 200,
        polygonVertices: project?.land_polygon_json ? JSON.parse(project.land_polygon_json) : null
      });
    }
  };

  const isUnknownJurisdiction = !selectedJurisdiction;

  return (
    <div style={{
      background: 'var(--df-card-bg, #0f172a)',
      border: '1px solid var(--df-card-border, #1e293b)',
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.18)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '8px',
            background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)'
          }}>
            <Building2 style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--df-text, #f8fafc)' }}>
                Maharashtra Planning Authority & UDCPR Regulations
              </h3>
              <span style={{
                fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px',
                background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0'
              }}>
                UDCPR 2020 Compliant
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--df-text-muted, #94a3b8)', margin: '2px 0 0 0' }}>
              Configure jurisdiction and development norms before generating 2–3 genuine alternative plotting layouts (13A–13O)
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerGenerate}
          disabled={isGenerating}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px',
            borderRadius: '8px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#ffffff', fontWeight: 800, fontSize: '0.82rem', border: 'none',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            transition: 'all 0.2s ease', opacity: isGenerating ? 0.7 : 1
          }}
        >
          <Sparkles style={{ width: '16px', height: '16px' }} />
          {isGenerating ? 'Generating Best 2–3 Options...' : 'Generate Best 2–3 Alternatives'}
        </button>
      </div>

      {/* Mandatory Notice if Unknown Jurisdiction (13C) */}
      {isUnknownJurisdiction && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
          borderRadius: '8px', marginBottom: '14px', color: '#fca5a5', fontSize: '0.78rem'
        }}>
          <AlertTriangle style={{ width: '16px', height: '16px', color: '#ef4444', flexShrink: 0 }} />
          <span>
            <strong>Applicable planning authority/jurisdiction required for exact regulatory compliance.</strong>
          </span>
        </div>
      )}

      {/* Configuration Form Controls (13C) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '12px',
        padding: '12px 14px',
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        marginBottom: '14px'
      }}>
        {/* JURISDICTION */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--df-text-muted, #94a3b8)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Jurisdiction
          </label>
          <select
            value={selectedJurisdiction}
            onChange={(e) => setSelectedJurisdiction(e.target.value)}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: '6px',
              background: 'var(--df-bg, #090e17)', border: '1px solid var(--df-border, #334155)',
              color: 'var(--df-text, #f8fafc)', fontSize: '0.78rem', fontWeight: 600
            }}
          >
            {jurisdictions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>

        {/* CITY / AREA */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--df-text-muted, #94a3b8)', marginBottom: '4px', textTransform: 'uppercase' }}>
            City / Area
          </label>
          <input
            type="text"
            value={cityArea}
            onChange={(e) => setCityArea(e.target.value)}
            placeholder="Enter City / District"
            style={{
              width: '100%', padding: '7px 10px', borderRadius: '6px',
              background: 'var(--df-bg, #090e17)', border: '1px solid var(--df-border, #334155)',
              color: 'var(--df-text, #f8fafc)', fontSize: '0.78rem'
            }}
          />
        </div>

        {/* LAND USE */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--df-text-muted, #94a3b8)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Land Use
          </label>
          <select
            value={landUse}
            onChange={(e) => setLandUse(e.target.value)}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: '6px',
              background: 'var(--df-bg, #090e17)', border: '1px solid var(--df-border, #334155)',
              color: 'var(--df-text, #f8fafc)', fontSize: '0.78rem', fontWeight: 600
            }}
          >
            <option value="RESIDENTIAL">Residential (Standard UDCPR 100 m²)</option>
            <option value="AFFORDABLE">Affordable Housing / Row Housing (50 m²)</option>
            <option value="MIXED_USE">Mixed Use / Commercial Frontage (150 m²)</option>
            <option value="COMMERCIAL">Commercial Plotted Layout (200 m²)</option>
          </select>
        </div>

        {/* PLANNING REGULATION */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--df-text-muted, #94a3b8)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Planning Regulation
          </label>
          <select
            value={planningRegulation}
            onChange={(e) => setPlanningRegulation(e.target.value)}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: '6px',
              background: 'var(--df-bg, #090e17)', border: '1px solid var(--df-border, #334155)',
              color: 'var(--df-text, #f8fafc)', fontSize: '0.78rem', fontWeight: 600
            }}
          >
            <option value="UDCPR_2020">Applicable UDCPR 2020 (Current)</option>
            <option value="LOCAL_DP">Local Authority Sanctioned DP</option>
          </select>
        </div>

        {/* CONGESTED AREA TOGGLE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
          <input
            type="checkbox"
            id="congestedToggle"
            checked={isCongested}
            onChange={(e) => setIsCongested(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }}
          />
          <label htmlFor="congestedToggle" style={{ fontSize: '0.76rem', color: 'var(--df-text, #f8fafc)', cursor: 'pointer', fontWeight: 600 }}>
            Gaothan / Congested Core (Rule 3.3.1: 6.0m Roads)
          </label>
        </div>
      </div>

      {/* Mandatory Space Allocation Dynamic Breakdown (13D, 13E, 13F, 13G, 13H) */}
      {evaluatedNorms && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '10px'
        }}>
          {/* Recreational Open Space */}
          <div style={{
            padding: '10px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.72rem', fontWeight: 800 }}>
              <Trees style={{ width: '14px', height: '14px' }} /> Open Space (Rule 3.4)
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
              {evaluatedNorms.openSpacePercentage}%
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted, #94a3b8)' }}>
              {evaluatedNorms.openSpaceRequiredSqm?.toFixed(0)} m² ({evaluatedNorms.openSpaceRequiredSqft?.toFixed(0)} sqft)
            </div>
          </div>

          {/* Civic Amenity Space */}
          <div style={{
            padding: '10px 12px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6', fontSize: '0.72rem', fontWeight: 800 }}>
              <Building2 style={{ width: '14px', height: '14px' }} /> Amenity Space (Rule 3.5)
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#3b82f6', marginTop: '2px' }}>
              {evaluatedNorms.amenitySpacePercentage}%
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted, #94a3b8)' }}>
              {evaluatedNorms.amenitySpaceRequiredSqm > 0 ? `${evaluatedNorms.amenitySpaceRequiredSqm?.toFixed(0)} m²` : 'Exempted (< threshold)'}
            </div>
          </div>

          {/* Road Widths */}
          <div style={{
            padding: '10px 12px', borderRadius: '8px', background: 'rgba(100, 116, 139, 0.08)',
            border: '1px solid rgba(100, 116, 139, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 800 }}>
              <Layers style={{ width: '14px', height: '14px' }} /> Road Corridor (Rule 3.3)
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
              {evaluatedNorms.internalRoadWidthM} M <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({evaluatedNorms.internalRoadWidthFt} FT)</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted, #94a3b8)' }}>
              Main: {evaluatedNorms.mainRoadWidthM} M ({evaluatedNorms.mainRoadWidthFt} FT)
            </div>
          </div>

          {/* Min Plot Size & Frontage */}
          <div style={{
            padding: '10px 12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 800 }}>
              <Home style={{ width: '14px', height: '14px' }} /> Min Plot & Frontage
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
              {evaluatedNorms.minPlotAreaSqm} m² <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>({evaluatedNorms.minPlotAreaSqft?.toFixed(0)} sqft)</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted, #94a3b8)' }}>
              Frontage: {evaluatedNorms.minFrontageM} M ({evaluatedNorms.minFrontageFt} FT)
            </div>
          </div>

          {/* Boundary Setback */}
          <div style={{
            padding: '10px 12px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.08)',
            border: '1px solid rgba(168, 85, 247, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', fontSize: '0.72rem', fontWeight: 800 }}>
              <Compass style={{ width: '14px', height: '14px' }} /> Peripheral Setback
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#c084fc', marginTop: '2px' }}>
              {evaluatedNorms.outerBoundarySetbackM} M <span style={{ fontSize: '0.75rem', color: '#c084fc' }}>({evaluatedNorms.outerBoundarySetbackFt} FT)</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--df-text-muted, #94a3b8)' }}>
              UDCPR Rule 6.1 Boundary Buffer
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
