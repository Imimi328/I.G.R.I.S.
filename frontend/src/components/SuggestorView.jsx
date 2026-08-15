import React, { useState, useEffect } from 'react';
import { Sparkles, Droplets, Sprout, ArrowRight, ShieldCheck, TrendingUp, Building2, Landmark, HelpCircle } from 'lucide-react';

export default function SuggestorView() {
  const [activeSubTab, setActiveSubTab] = useState('citizen'); // 'citizen' or 'gov'
  
  // Citizen RWH State
  const [roofArea, setRoofArea] = useState(1200);
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [rwhResult, setRwhResult] = useState(null);
  const [rwhLoading, setRwhLoading] = useState(false);

  // Crop Suggestor State
  const [cropState, setCropState] = useState('Punjab');
  const [cropResult, setCropResult] = useState(null);

  // Government Grid State
  const [gridData, setGridData] = useState([]);
  const [gridLoading, setGridLoading] = useState(true);

  const indianStates = [
    'Maharashtra', 'Gujarat', 'Punjab', 'Rajasthan', 'Haryana', 
    'Karnataka', 'Tamil Nadu', 'Uttar Pradesh', 'Madhya Pradesh', 'Bihar', 'West Bengal', 'Delhi'
  ];

  // Fetch RWH Calculation
  const calculateRWH = async () => {
    setRwhLoading(true);
    try {
      const res = await fetch('/api/suggestor/rwh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rooftop_area_sqft: parseFloat(roofArea) || 1000,
          state_name: selectedState
        })
      });
      const data = await res.json();
      setRwhResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setRwhLoading(false);
    }
  };

  // Fetch Crop Suggestion
  const fetchCropAdvice = async () => {
    try {
      const res = await fetch('/api/suggestor/crops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state_name: cropState })
      });
      const data = await res.json();
      setCropResult(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Gov Dam Balancing Grid
  const fetchGridData = async () => {
    setGridLoading(true);
    try {
      const res = await fetch('/api/grid/balancing');
      const data = await res.json();
      setGridData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setGridLoading(false);
    }
  };

  useEffect(() => {
    calculateRWH();
    fetchCropAdvice();
    fetchGridData();
  }, []);

  return (
    <div style={{ height: 'calc(100vh - 130px)', overflowY: 'auto', padding: '0 1.5rem 1.5rem' }}>
      
      {/* Sub-navigation Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            ⚡ Smart Water Suggestor & Conjunctive Grid Engine
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            AI-driven decision support for citizens, farmers, and government dam-flood water transfer networks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.3rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setActiveSubTab('citizen')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'citizen' ? 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)' : 'transparent',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Building2 size={16} />
            <span>Citizen & Farmer Solutions</span>
          </button>

          <button
            onClick={() => setActiveSubTab('gov')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'gov' ? 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)' : 'transparent',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Landmark size={16} />
            <span>Government Dam Balancing Grid</span>
          </button>
        </div>
      </div>

      {/* 1. CITIZEN & FARMER TAB */}
      {activeSubTab === 'citizen' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          
          {/* Rooftop Rainwater Harvesting (RWH) Calculator */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                <Droplets size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem' }}>Rooftop Rainwater Harvesting Calculator</h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Calculate how many liters of groundwater recharge your roof can capture.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  ROOFTOP AREA (SQ. FT)
                </label>
                <input
                  type="number"
                  value={roofArea}
                  onChange={(e) => setRoofArea(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  SELECT STATE
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem' }}
                >
                  {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <button onClick={calculateRWH} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Sparkles size={16} />
              <span>Calculate Rainwater Yield & Sizing</span>
            </button>

            {rwhResult && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div className="glass-card" style={{ borderLeft: '3px solid #38bdf8' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Annual Water Harvested</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>
                    {rwhResult.annual_harvestable_liters.toLocaleString()} L
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Based on {rwhResult.annual_rainfall_mm} mm annual rainfall
                  </div>
                </div>

                <div className="glass-card" style={{ borderLeft: '3px solid #10b981' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Water Savings</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
                    ₹ {rwhResult.estimated_annual_savings_inr.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Offsets {rwhResult.equivalent_family_days} days of family water demand
                  </div>
                </div>

                <div className="glass-card" style={{ gridColumn: 'span 2', background: 'rgba(15, 23, 42, 0.9)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#ffffff' }}>Recommended Storage / Sump Tank</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Optimized for 25% peak intensity monsoon surge</div>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>
                      {rwhResult.recommended_tank_capacity_liters.toLocaleString()} Liters
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Crop Water Requirement Advisor */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <Sprout size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem' }}>Crop Water Optimization Advisor</h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Suggests drought-resilient crops for over-exploited blocks to prevent borewell failures.
                </p>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                SELECT STATE FOR AGRICULTURAL ADVICE
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={cropState}
                  onChange={(e) => {
                    setCropState(e.target.value);
                  }}
                  style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem' }}
                >
                  {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={fetchCropAdvice} className="btn-secondary">
                  Update
                </button>
              </div>
            </div>

            {cropResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: cropResult.is_water_stressed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', border: `1px solid ${cropResult.is_water_stressed ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`, fontSize: '0.78rem' }}>
                  <strong style={{ color: cropResult.is_water_stressed ? '#f87171' : '#34d399' }}>
                    {cropResult.is_water_stressed ? '⚠️ High Groundwater Depletion Zone' : '🟢 Sustainable Aquifer Status'}
                  </strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {cropResult.current_crop_water_drain}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {cropResult.recommendations.map((rec, i) => (
                    <div key={i} className="glass-card" style={{ fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <strong style={{ color: '#38bdf8' }}>{rec.crop}</strong>
                        <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700 }}>
                          Save {rec.savings_vs_paddy_pct} Water
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>{rec.recommendation_reason}</div>
                      <div style={{ color: '#f59e0b', fontSize: '0.72rem', marginTop: '0.25rem' }}>🎯 Subsidy: {rec.subsidy_applicable}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 2. GOVERNMENT DAM BALANCING GRID */}
      {activeSubTab === 'gov' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <Landmark size={22} color="#f59e0b" />
                <h3 style={{ fontSize: '1.2rem' }}>Government Dam & Aquifer Balancing Grid</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Identifies over-exploited blocks that should be prioritized for seasonal monsoon flood spill routing & Managed Aquifer Recharge (MAR).
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(30, 41, 59, 0.6)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem' }}>
              <span className="pulse-dot" style={{ background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }} />
              <span>Conjunctive Surface-to-Groundwater Optimization</span>
            </div>
          </div>

          {/* Grid Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>STATE</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>OVER-EXPLOITED UNITS</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>STAGE OF EXTRACTION</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>PRIORITY</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>SURPLUS DIVERSION SOURCE</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>EST. MAR POTENTIAL</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>RECOMMENDED STRATEGY</th>
                </tr>
              </thead>
              <tbody>
                {gridData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#ffffff' }}>{row.state_name}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#f87171', fontWeight: 600 }}>{row.over_exploited_blocks} Blocks</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: row.stage_of_extraction_pct > 100 ? '#ef4444' : '#f59e0b' }}>
                      {row.stage_of_extraction_pct}%
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span className={`badge badge-${row.priority === 'CRITICAL' ? 'over' : 'semi'}`}>
                        {row.priority}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#38bdf8' }}>{row.recommended_source}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#34d399', fontWeight: 700 }}>
                      {row.estimated_recharge_potential_mcm} MCM
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.76rem', maxWidth: '300px' }}>
                      {row.strategy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
