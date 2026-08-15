import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Droplets, AlertTriangle, ShieldCheck, Search, ArrowUpDown } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function DashboardView() {
  const [nationalStats, setNationalStats] = useState(null);
  const [statesList, setStatesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [natRes, statesRes] = await Promise.all([
          fetch('/api/stats/national'),
          fetch('/api/states')
        ]);
        const natData = await natRes.json();
        const statesData = await statesRes.json();
        setNationalStats(natData);
        setStatesList(statesData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredStates = statesList.filter(s =>
    s.state_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topOverExploitedStates = [...statesList]
    .sort((a, b) => b.stage_of_extraction_pct - a.stage_of_extraction_pct)
    .slice(0, 8);

  return (
    <div style={{ height: 'calc(100vh - 130px)', overflowY: 'auto', padding: '0 1.5rem 1.5rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
          🇮🇳 National Groundwater Analytics Dashboard
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Official Dynamic Ground Water Resources Assessment of India (GWRA-2025 • GEC-2015 Methodology)
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      {nationalStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
          
          <div className="glass-card" style={{ borderLeft: '4px solid #38bdf8' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Annual Recharge</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', margin: '0.2rem 0' }}>
              {nationalStats.national_recharge_bcm} BCM
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Natural Replenishable Inflow
            </div>
          </div>

          <div className="glass-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Annual Extraction</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', margin: '0.2rem 0' }}>
              {nationalStats.national_extraction_bcm} BCM
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Irrigation (87%) + Domestic + Industry
            </div>
          </div>

          <div className="glass-card" style={{ borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>National Stage of Extraction</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', margin: '0.2rem 0' }}>
              {nationalStats.national_soe_pct}%
            </div>
            <div style={{ fontSize: '0.72rem', color: '#34d399' }}>
              Overall Sustainable Band (&lt; 70%)
            </div>
          </div>

          <div className="glass-card" style={{ borderLeft: '4px solid #a855f7' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Assessment Units</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#c084fc', margin: '0.2rem 0' }}>
              {nationalStats.total_blocks.toLocaleString()} Blocks
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              74.5% Safe • 11.0% Over-Exploited
            </div>
          </div>

        </div>
      )}

      {/* Analytics Charts Row */}
      {nationalStats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          
          {/* Extraction Sector Breakdown */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: '#38bdf8' }}>
              National Extraction by Sector (BCM)
            </h3>
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Doughnut
                data={{
                  labels: [
                    `Irrigation (${nationalStats.national_irrigation_bcm} BCM)`,
                    `Domestic (${nationalStats.national_domestic_bcm} BCM)`,
                    `Industrial (${nationalStats.national_industrial_bcm} BCM)`
                  ],
                  datasets: [{
                    data: [
                      nationalStats.national_irrigation_bcm,
                      nationalStats.national_domestic_bcm,
                      nationalStats.national_industrial_bcm
                    ],
                    backgroundColor: ['#0284c7', '#10b981', '#f59e0b'],
                    borderWidth: 0
                  }]
                }}
                options={{
                  plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } } },
                  maintainAspectRatio: false
                }}
              />
            </div>
          </div>

          {/* Top States SoE Bar Chart */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: '#f59e0b' }}>
              Highest Groundwater Stress States (Stage of Extraction %)
            </h3>
            <div style={{ height: '220px' }}>
              <Bar
                data={{
                  labels: topOverExploitedStates.map(s => s.state_name),
                  datasets: [{
                    label: 'Stage of Extraction (%)',
                    data: topOverExploitedStates.map(s => s.stage_of_extraction_pct),
                    backgroundColor: topOverExploitedStates.map(s => s.stage_of_extraction_pct > 100 ? '#ef4444' : '#f59e0b'),
                    borderRadius: 6
                  }]
                }}
                options={{
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
                    y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                  },
                  maintainAspectRatio: false
                }}
              />
            </div>
          </div>

        </div>
      )}

      {/* State-by-State Data Table */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>All 36 States & Union Territories Ground Water Registry</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Complete official assessment metrics in Billion Cubic Meters (BCM)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(30, 41, 59, 0.7)', padding: '0.4rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.82rem', width: '150px' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>STATE / UT</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>ANNUAL RECHARGE (BCM)</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>TOTAL EXTRACTION (BCM)</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>IRRIGATION (BCM)</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>DOMESTIC (BCM)</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>FUTURE AVAILABLE</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>STAGE OF EXTRACTION (%)</th>
              </tr>
            </thead>
            <tbody>
              {filteredStates.map((s, idx) => (
                <tr
                  key={idx}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: '#ffffff' }}>{s.state_name}</td>
                  <td style={{ padding: '0.65rem 0.5rem', color: '#38bdf8' }}>{s.total_annual_recharge}</td>
                  <td style={{ padding: '0.65rem 0.5rem', color: '#f59e0b' }}>{s.total_annual_extraction}</td>
                  <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-secondary)' }}>{s.irrigation_extraction}</td>
                  <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-secondary)' }}>{s.domestic_extraction}</td>
                  <td style={{ padding: '0.65rem 0.5rem', color: '#34d399' }}>{s.net_availability_future}</td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>
                    <span className={`badge badge-${s.stage_of_extraction_pct <= 70 ? 'safe' : s.stage_of_extraction_pct <= 90 ? 'semi' : s.stage_of_extraction_pct <= 100 ? 'crit' : 'over'}`}>
                      {s.stage_of_extraction_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
