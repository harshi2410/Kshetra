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
  Info,
  ChevronDown,
  ChevronUp,
  Settings2,
  Sliders
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
  const [isExpanded, setIsExpanded] = useState(false);

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

  const selectedAuth = jurisdictions.find(j => j.id === selectedJurisdiction);
  const currentAuthName = selectedAuth?.shortName || selectedAuth?.name || 'PMC Pune';

  return (
    <div style={{
      background: 'var(--df-card-bg, #0f172a)',
      border: '1px solid var(--df-card-border, #1e293b)',
      borderRadius: '10px',
      padding: isExpanded ? '14px 18px' : '10px 16px',
      marginBottom: '10px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      transition: 'all 0.2s ease'
    }}>
      {/* Sleek Collapsed Single-Line Header */}
      {!isExpanded ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {/* Left: Jurisdiction & Regulations Summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '6px',
              background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', flexShrink: 0
            }}>
              <Building2 style={{ width: '15px', height: '15px' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f8fafc' }}>
                {currentAuthName}
              </span>
              <span style={{
                fontSize: '0.66rem', fontWeight: 800, padding: '1px 7px', borderRadius: '10px',
                background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0'
              }}>
                UDCPR 2020 Compliant
              </span>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                • {landUse === 'RESIDENTIAL' ? 'Residential' : landUse}
              </span>
            </div>

            {/* Quick Metrics Badges in Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.70rem', padding: '2px 8px', borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: 700
              }}>
                🌿 Open Space: {evaluatedNorms?.openSpacePercentage || 10}%
              </span>
              <span style={{
                fontSize: '0.70rem', padding: '2px 8px', borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.25)', fontWeight: 700
              }}>
                🏢 Amenity: {evaluatedNorms?.amenitySpacePercentage || 5}%
              </span>
              <span style={{
                fontSize: '0.70rem', padding: '2px 8px', borderRadius: '6px',
                background: 'rgba(148, 163, 184, 0.12)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.25)', fontWeight: 700
              }}>
                🛣️ Road: {evaluatedNorms?.internalRoadWidthM || 9}M ({evaluatedNorms?.internalRoadWidthFt || 29.5}')
              </span>
              <span style={{
                fontSize: '0.70rem', padding: '2px 8px', borderRadius: '6px',
                background: 'rgba(234, 179, 8, 0.12)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.25)', fontWeight: 700
              }}>
                📐 Min Plot: {evaluatedNorms?.minPlotAreaSqm || 100} m²
              </span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsExpanded(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
                borderRadius: '6px', border: '1px solid #334155', background: '#1e293b',
                color: '#cbd5e1', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              <Sliders style={{ width: '13px', height: '13px' }} /> Configure Norms <ChevronDown style={{ width: '12px', height: '12px' }} />
            </button>

            <button
              onClick={handleTriggerGenerate}
              disabled={isGenerating}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                borderRadius: '6px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff', fontWeight: 800, fontSize: '0.76rem', border: 'none',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 10px rgba(37,99,235,0.3)',
                opacity: isGenerating ? 0.7 : 1
              }}
            >
              <Sparkles style={{ width: '13px', height: '13px' }} />
              {isGenerating ? 'Generating...' : 'Generate 2–3 Options'}
            </button>
          </div>
        </div>
      ) : (
        /* Expanded Full Configuration Form */
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)'
              }}>
                <Building2 style={{ width: '16px', height: '16px' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '0.90rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                    Maharashtra Planning Authority & UDCPR Regulations
                  </h3>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: '10px',
                    background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0'
                  }}>
                    UDCPR 2020 Compliant
                  </span>
                </div>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Configure jurisdiction and development norms before generating 2–3 alternative plotting layouts (13A–13O)
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px',
                  borderRadius: '6px', border: '1px solid #334155', background: '#1e293b',
                  color: '#cbd5e1', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                <ChevronUp style={{ width: '12px', height: '12px' }} /> Collapse
              </button>

              <button
                onClick={handleTriggerGenerate}
                disabled={isGenerating}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
                  borderRadius: '6px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff', fontWeight: 800, fontSize: '0.78rem', border: 'none',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  boxShadow: '0 3px 12px rgba(37,99,235,0.35)',
                  opacity: isGenerating ? 0.7 : 1
                }}
              >
                <Sparkles style={{ width: '14px', height: '14px' }} />
                {isGenerating ? 'Generating...' : 'Generate Best 2–3 Options'}
              </button>
            </div>
          </div>

          {/* Form Controls */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '10px',
            padding: '10px 12px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            marginBottom: '10px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', marginBottom: '3px', textTransform: 'uppercase' }}>
                Jurisdiction
              </label>
              <select
                value={selectedJurisdiction}
                onChange={(e) => setSelectedJurisdiction(e.target.value)}
                style={{
                  width: '100%', padding: '6px 8px', borderRadius: '5px',
                  background: '#090e17', border: '1px solid #334155',
                  color: '#f8fafc', fontSize: '0.75rem', fontWeight: 600
                }}
              >
                {jurisdictions.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', marginBottom: '3px', textTransform: 'uppercase' }}>
                City / Area
              </label>
              <input
                type="text"
                value={cityArea}
                onChange={(e) => setCityArea(e.target.value)}
                placeholder="Enter City / District"
                style={{
                  width: '100%', padding: '6px 8px', borderRadius: '5px',
                  background: '#090e17', border: '1px solid #334155',
                  color: '#f8fafc', fontSize: '0.75rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', marginBottom: '3px', textTransform: 'uppercase' }}>
                Land Use
              </label>
              <select
                value={landUse}
                onChange={(e) => setLandUse(e.target.value)}
                style={{
                  width: '100%', padding: '6px 8px', borderRadius: '5px',
                  background: '#090e17', border: '1px solid #334155',
                  color: '#f8fafc', fontSize: '0.75rem', fontWeight: 600
                }}
              >
                <option value="RESIDENTIAL">Residential (UDCPR 100 m²)</option>
                <option value="AFFORDABLE">Affordable Housing (50 m²)</option>
                <option value="MIXED_USE">Mixed Use (150 m²)</option>
                <option value="COMMERCIAL">Commercial (200 m²)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', marginBottom: '3px', textTransform: 'uppercase' }}>
                Planning Regulation
              </label>
              <select
                value={planningRegulation}
                onChange={(e) => setPlanningRegulation(e.target.value)}
                style={{
                  width: '100%', padding: '6px 8px', borderRadius: '5px',
                  background: '#090e17', border: '1px solid #334155',
                  color: '#f8fafc', fontSize: '0.75rem', fontWeight: 600
                }}
              >
                <option value="UDCPR_2020">Applicable UDCPR 2020 (Current)</option>
                <option value="DCR_MUMBAI_2034">DCPR 2034 (Mumbai)</option>
                <option value="PMRDA_DP_2021">PMRDA Regional DP</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#cbd5e1', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={isCongested}
                  onChange={(e) => setIsCongested(e.target.checked)}
                  style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                />
                Gaothan / Congested Core (Rule 3.3.1: 6.0m Roads)
              </label>
            </div>
          </div>

          {/* Dynamic Statutory Space Cards */}
          {evaluatedNorms && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '8px'
            }}>
              <div style={{ background: '#090e17', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontSize: '0.68rem', fontWeight: 700 }}>
                  <Trees style={{ width: '13px', height: '13px' }} /> Open Space (Rule 3.4)
                </div>
                <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                  {evaluatedNorms.openSpacePercentage}%
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  {evaluatedNorms.allocatedOpenSpaceSqm?.toFixed(0)} m² ({evaluatedNorms.allocatedOpenSpaceSqft?.toFixed(0)} sqft)
                </div>
              </div>

              <div style={{ background: '#090e17', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#3b82f6', fontSize: '0.68rem', fontWeight: 700 }}>
                  <Building2 style={{ width: '13px', height: '13px' }} /> Amenity Space (Rule 3.5)
                </div>
                <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                  {evaluatedNorms.amenitySpacePercentage}%
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  {evaluatedNorms.allocatedAmenitySqm?.toFixed(0)} m²
                </div>
              </div>

              <div style={{ background: '#090e17', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700 }}>
                  <Compass style={{ width: '13px', height: '13px' }} /> Road Corridor (Rule 3.3)
                </div>
                <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                  {evaluatedNorms.internalRoadWidthM} M <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({evaluatedNorms.internalRoadWidthFt} FT)</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  Main: {evaluatedNorms.mainRoadWidthM} M ({evaluatedNorms.mainRoadWidthFt} FT)
                </div>
              </div>

              <div style={{ background: '#090e17', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f59e0b', fontSize: '0.68rem', fontWeight: 700 }}>
                  <Home style={{ width: '13px', height: '13px' }} /> Min Plot & Frontage
                </div>
                <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                  {evaluatedNorms.minPlotAreaSqm} m² <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({evaluatedNorms.minPlotAreaSqft} sqft)</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  Frontage: {evaluatedNorms.minFrontageM} M ({evaluatedNorms.minFrontageFt} FT)
                </div>
              </div>

              <div style={{ background: '#090e17', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#a855f7', fontSize: '0.68rem', fontWeight: 700 }}>
                  <Zap style={{ width: '13px', height: '13px' }} /> Peripheral Setback
                </div>
                <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                  {evaluatedNorms.outerBoundarySetbackM} M <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({evaluatedNorms.outerBoundarySetbackFt} FT)</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  UDCPR Rule 6.1 boundary buffer
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
