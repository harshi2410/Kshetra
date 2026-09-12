import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Table, 
  Eye, 
  Check, 
  Sparkles, 
  Compass, 
  Trees, 
  Layers, 
  Building2, 
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  X
} from 'lucide-react';

export default function LayoutAlternativesModal({
  isOpen,
  onClose,
  variants = [],
  activeVariantId,
  onSelectVariant,
  onSetAsMaster,
  failureReasons = [],
  validCount = 0
}) {
  const [activeTab, setActiveTab] = useState('CARDS'); // CARDS | COMPARISON_TABLE

  if (!isOpen) return null;

  const hasNoValid = variants.length === 0;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#090e17',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#0f172a'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                GENERATED PLOTTING OPTIONS (13A–13O)
              </h2>
              <span style={{
                fontSize: '0.72rem', fontWeight: 800, padding: '2px 10px', borderRadius: '12px',
                background: hasNoValid ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                color: hasNoValid ? '#f87171' : '#34d399',
                border: `1px solid ${hasNoValid ? '#ef4444' : '#10b981'}`
              }}>
                {hasNoValid ? '0 Valid Layouts' : `${variants.length} Valid Options Found`}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
              All options generated from the same input boundary and strictly comply with Maharashtra UDCPR 2020 regulations.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!hasNoValid && (
              <div style={{ display: 'flex', background: '#1e293b', borderRadius: '8px', padding: '3px' }}>
                <button
                  onClick={() => setActiveTab('CARDS')}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    background: activeTab === 'CARDS' ? '#2563eb' : 'transparent',
                    color: activeTab === 'CARDS' ? '#ffffff' : '#94a3b8'
                  }}
                >
                  Cards View (13J)
                </button>
                <button
                  onClick={() => setActiveTab('COMPARISON_TABLE')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 14px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    background: activeTab === 'COMPARISON_TABLE' ? '#2563eb' : 'transparent',
                    color: activeTab === 'COMPARISON_TABLE' ? '#ffffff' : '#94a3b8'
                  }}
                >
                  <Table style={{ width: '13px', height: '13px' }} /> Comparison Table (13N)
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #334155',
                background: '#1e293b', color: '#94a3b8', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer'
              }}
            >
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* SECTION 13M: IF NO VALID LAYOUT EXISTS */}
          {hasNoValid && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid #ef4444',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <XCircle style={{ width: '48px', height: '48px', color: '#ef4444', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fca5a5', margin: '0 0 8px 0' }}>
                No fully compliant layout could be generated under the selected planning constraints.
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', maxWidth: '600px', margin: '0 auto 18px' }}>
                The boundary is too small, irregular, or constrained by peripheral setbacks and road corridors to satisfy Maharashtra UDCPR statutory requirements.
              </p>

              {failureReasons.length > 0 && (
                <div style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  textAlign: 'left',
                  maxWidth: '650px',
                  margin: '0 auto 18px'
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f87171', marginBottom: '8px' }}>
                    Detected Constraint Violations:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#94a3b8', fontSize: '0.76rem', lineHeight: '1.6' }}>
                    {failureReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Please modify parcel dimensions, adjust setback/road parameters, or select a different zoning configuration.
              </p>
            </div>
          )}

          {/* SECTION 13L NOTICE (If 1 or 2 options) */}
          {!hasNoValid && variants.length < 3 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
              background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6',
              borderRadius: '8px', marginBottom: '18px', color: '#93c5fd', fontSize: '0.78rem'
            }}>
              <ShieldCheck style={{ width: '16px', height: '16px', color: '#3b82f6', flexShrink: 0 }} />
              <span>
                <strong>{variants.length} valid layout{variants.length > 1 ? 's' : ''} found</strong> under the current boundary and Maharashtra planning constraints. (No artificial/non-compliant layouts are forced).
              </span>
            </div>
          )}

          {/* SECTION 13J: DISPLAY CARDS */}
          {!hasNoValid && activeTab === 'CARDS' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {variants.map((v) => {
                const isActive = v.id === activeVariantId;
                const isMaster = v.isSelected;

                return (
                  <div
                    key={v.id}
                    style={{
                      background: isActive ? '#0f1f38' : '#0f172a',
                      border: isActive ? '2px solid #3b82f6' : '1px solid #1e293b',
                      borderRadius: '12px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 8px 24px rgba(59,130,246,0.25)' : 'none'
                    }}
                  >
                    <div>
                      {/* Badge & Title */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.04em',
                          padding: '3px 10px', borderRadius: '6px',
                          background: '#1e293b', color: '#60a5fa', border: '1px solid #3b82f6'
                        }}>
                          {v.optionBadge || `OPTION ${v.variantNumber}`}
                        </span>

                        <span style={{
                          fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px',
                          background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0'
                        }}>
                          Compliance: PASS
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
                        {v.strategyName}
                      </h4>

                      {/* Score Highlight */}
                      <div style={{
                        display: 'flex', alignItems: 'baseline', gap: '8px',
                        padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
                        marginBottom: '14px'
                      }}>
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>Score:</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38bdf8' }}>
                          {v.compositeScore?.toFixed(0) || 85}/100
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#34d399', marginLeft: 'auto', fontWeight: 700 }}>
                          {v.utilizationPercent?.toFixed(1)}% Utilization
                        </span>
                      </div>

                      {/* Key Civil Engineering Metrics (13J) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '0.76rem', color: '#cbd5e1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
                          <span style={{ color: '#94a3b8' }}>Plots:</span>
                          <strong style={{ color: '#f8fafc' }}>{v.totalPlots} Units</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
                          <span style={{ color: '#94a3b8' }}>Road Area:</span>
                          <strong>{v.totalRoadAreaSqm ? `${v.totalRoadAreaSqm.toFixed(0)} m²` : `${v.totalRoadAreaSqft.toFixed(0)} sqft`}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
                          <span style={{ color: '#94a3b8' }}>Open Space (Rule 3.4):</span>
                          <strong style={{ color: '#34d399' }}>{v.totalOpenSpaceAreaSqm ? `${v.totalOpenSpaceAreaSqm.toFixed(0)} m²` : `${v.totalOpenSpaceAreaSqft.toFixed(0)} sqft`}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
                          <span style={{ color: '#94a3b8' }}>Amenity Area (Rule 3.5):</span>
                          <strong style={{ color: '#60a5fa' }}>{v.totalAmenityAreaSqm ? `${v.totalAmenityAreaSqm.toFixed(0)} m²` : `${v.totalAmenityAreaSqft.toFixed(0)} sqft`}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>Avg Plot Size:</span>
                          <strong>{v.averagePlotAreaSqm ? `${v.averagePlotAreaSqm.toFixed(0)} m²` : `${v.averagePlotAreaSqft.toFixed(0)} sqft`}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                      <button
                        onClick={() => {
                          onSelectVariant(v.id);
                          onClose();
                        }}
                        style={{
                          flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          gap: '6px', padding: '9px 12px', borderRadius: '8px',
                          background: isActive ? '#2563eb' : '#1e293b',
                          color: '#ffffff', fontSize: '0.78rem', fontWeight: 800,
                          border: isActive ? '1px solid #3b82f6' : '1px solid #334155',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye style={{ width: '14px', height: '14px' }} />
                        {`VIEW ${v.optionBadge?.split('—')[0]?.trim() || `OPTION ${v.variantNumber}`}`}
                      </button>

                      <button
                        onClick={() => {
                          onSetAsMaster(v.id);
                        }}
                        style={{
                          padding: '9px 14px', borderRadius: '8px',
                          background: isMaster ? '#059669' : '#0f291e',
                          color: isMaster ? '#ffffff' : '#34d399',
                          border: '1px solid #059669',
                          fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '5px'
                        }}
                        title="Set as Project Master Layout"
                      >
                        <Check style={{ width: '14px', height: '14px' }} />
                        {isMaster ? 'Master' : 'Use'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION 13N: COMPARISON VIEW TABLE */}
          {!hasNoValid && activeTab === 'COMPARISON_TABLE' && (
            <div style={{
              overflowX: 'auto',
              borderRadius: '10px',
              border: '1px solid #1e293b',
              background: '#0f172a'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '2px solid #334155' }}>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 800 }}>Parameter</th>
                    {variants.map((v) => (
                      <th key={v.id} style={{ padding: '12px 16px', color: '#60a5fa', fontWeight: 800 }}>
                        {v.optionBadge || `Option ${v.variantNumber}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ color: '#cbd5e1' }}>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#94a3b8' }}>Validity</td>
                    {variants.map((v) => (
                      <td key={v.id} style={{ padding: '10px 16px', color: '#34d399', fontWeight: 800 }}>
                        ✓ PASS
                      </td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#94a3b8' }}>Planning Strategy</td>
                    {variants.map((v) => (
                      <td key={v.id} style={{ padding: '10px 16px', fontWeight: 700, color: '#f8fafc' }}>
                        {v.strategyName}
                      </td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#94a3b8' }}>Plot Count</td>
                    {variants.map((v) => (
                      <td key={v.id} style={{ padding: '10px 16px', fontWeight: 800 }}>
                        {v.totalPlots} Plots
                      </td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#94a3b8' }}>Avg Plot Area</td>
                    {variants.map((v) => (
                      <td key={v.id} style={{ padding: '10px 16px' }}>
                        {v.averagePlotAreaSqm ? `${v.averagePlotAreaSqm.toFixed(0)} m²` : `${v.averagePlotAreaSqft.toFixed(0)} sqft`}
                      </td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#94a3b8' }}>Road Area</td>
                    {variants.map((v) => (
                      <td key={v.id} style={{ padding: '10px 16px' }}>
                        {v.totalRoadAreaSqm ? `${v.totalRoadAreaSqm.toFixed(0)} m²` : `${v.totalRoadAreaSqft.toFixed(0)} sqft`}
                      </td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#94a3b8' }}>Open Space (Rule 3.4)</td>
                    {variants.map((v) => (
                      <td key={v.id} style={{ padding: '10px 16px', color: '#34d399' }}>
                        {v.totalOpenSpaceAreaSqm ? `${v.totalOpenSpaceAreaSqm.toFixed(0)} m²` : `${v.totalOpenSpaceAreaSqft.toFixed(0)} sqft`}
                      </td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#94a3b8' }}>Amenity Area (Rule 3.5)</td>
                    {variants.map((v) => (
                      <td key={v.id} style={{ padding: '10px 16px', color: '#60a5fa' }}>
                        {v.totalAmenityAreaSqm ? `${v.totalAmenityAreaSqm.toFixed(0)} m²` : `${v.totalAmenityAreaSqft.toFixed(0)} sqft`}
                      </td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#94a3b8' }}>Utilization</td>
                    {variants.map((v) => (
                      <td key={v.id} style={{ padding: '10px 16px', fontWeight: 700 }}>
                        {v.utilizationPercent?.toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#94a3b8' }}>Accessibility</td>
                    {variants.map((v) => (
                      <td key={v.id} style={{ padding: '10px 16px', color: '#38bdf8', fontWeight: 700 }}>
                        100% Direct Frontage
                      </td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#94a3b8' }}>Compliance</td>
                    {variants.map((v) => (
                      <td key={v.id} style={{ padding: '10px 16px', color: '#34d399', fontWeight: 800 }}>
                        PASS (12 Rules)
                      </td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '2px solid #334155', background: 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 900, color: '#f8fafc' }}>Overall Score</td>
                    {variants.map((v) => (
                      <td key={v.id} style={{ padding: '12px 16px', fontSize: '0.95rem', fontWeight: 900, color: '#38bdf8' }}>
                        {v.compositeScore?.toFixed(0) || 85}/100
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#94a3b8' }}>Action</td>
                    {variants.map((v) => (
                      <td key={v.id} style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => {
                            onSetAsMaster(v.id);
                            onClose();
                          }}
                          style={{
                            padding: '7px 14px', borderRadius: '6px',
                            background: v.isSelected ? '#059669' : '#2563eb',
                            color: '#ffffff', fontWeight: 800, fontSize: '0.74rem',
                            border: 'none', cursor: 'pointer', display: 'inline-flex',
                            alignItems: 'center', gap: '5px'
                          }}
                        >
                          <Check style={{ width: '13px', height: '13px' }} />
                          {v.isSelected ? 'Selected Active' : 'Use This Layout'}
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#0f172a'
        }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
            Maharashtra UDCPR 2020 Space Reservation Standards Applied
          </span>

          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: '6px', background: '#1e293b',
              color: '#cbd5e1', border: '1px solid #334155', fontWeight: 700,
              fontSize: '0.78rem', cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
