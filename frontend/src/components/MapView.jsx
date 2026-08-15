import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Search, Filter, AlertTriangle, ShieldCheck, Droplets, Compass } from 'lucide-react';
import L from 'leaflet';

// Fix leaflet default icon assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Key representative coordinates across Indian States & Districts
const KEY_HOTSPOTS = [
  { name: 'Sangrur', district: 'Sangrur', state: 'Punjab', lat: 30.2458, lng: 75.8421, category: 'Over-Exploited', soe: 168.5, quality: 'Fluoride, Uranium' },
  { name: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, category: 'Over-Exploited', soe: 154.2, quality: 'Nitrate, Salinity' },
  { name: 'Jodhpur', district: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lng: 73.0243, category: 'Over-Exploited', soe: 142.1, quality: 'Fluoride, Salinity' },
  { name: 'Kurukshetra', district: 'Kurukshetra', state: 'Haryana', lat: 29.9695, lng: 76.8783, category: 'Over-Exploited', soe: 139.8, quality: 'Iron, Nitrate' },
  { name: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, category: 'Critical', soe: 98.4, quality: 'Salinity (Sea Intrusion)' },
  { name: 'Bengaluru Urban', district: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, category: 'Over-Exploited', soe: 141.2, quality: 'Nitrate, Heavy Metals' },
  { name: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, category: 'Semi-Critical', soe: 86.4, quality: 'Salinity, Fluoride' },
  { name: 'Pune (Haveli)', district: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, category: 'Safe', soe: 54.8, quality: 'Normal' },
  { name: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, category: 'Safe', soe: 62.1, quality: 'Normal' },
  { name: 'Patna', district: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, category: 'Safe', soe: 48.6, quality: 'Arsenic' },
  { name: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, category: 'Semi-Critical', soe: 76.2, quality: 'Normal' },
  { name: 'Kolkata', district: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, category: 'Safe', soe: 58.2, quality: 'Arsenic' },
  { name: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, category: 'Semi-Critical', soe: 78.9, quality: 'Fluoride' },
  { name: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, category: 'Safe', soe: 61.4, quality: 'Normal' },
  { name: 'Guwahati', district: 'Kamrup', state: 'Assam', lat: 26.1445, lng: 91.7362, category: 'Safe', soe: 24.1, quality: 'Iron' },
  { name: 'Thiruvananthapuram', district: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366, category: 'Safe', soe: 51.3, quality: 'Normal' }
];

export default function MapView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (val) => {
    setSearchTerm(val);
    if (!val || val.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/blocks?query=${encodeURIComponent(val)}&limit=10`);
      const data = await res.json();
      setSearchResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const filteredHotspots = KEY_HOTSPOTS.filter(spot => {
    const matchesCat = selectedCategory === 'All' || spot.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      spot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spot.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spot.state.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Safe': return '#10b981';
      case 'Semi-Critical': return '#f59e0b';
      case 'Critical': return '#f97316';
      case 'Over-Exploited': return '#ef4444';
      default: return '#38bdf8';
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.25rem', height: 'calc(100vh - 130px)', padding: '0 1.5rem 1.5rem' }}>
      
      {/* Sidebar Controls */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', overflowY: 'auto' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Compass size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1.1rem' }}>All-India GIS Navigator</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Explore 6,635 groundwater assessment blocks color-coded by extraction danger levels.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(30, 41, 59, 0.7)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search block, district or state..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.85rem' }}
            />
          </div>

          {/* Autocomplete Search Dropdown */}
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '105%', left: 0, right: 0, background: '#0f172a', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '10px', padding: '0.4rem', zIndex: 1000, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              {searchResults.map(b => (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedLocation(b);
                    setSearchResults([]);
                  }}
                  style={{ padding: '0.5rem 0.65rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <strong style={{ color: '#ffffff' }}>{b.block_name}</strong>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{b.district_name}, {b.state_name}</div>
                  </div>
                  <span className={`badge badge-${b.category === 'Safe' ? 'safe' : b.category === 'Semi-Critical' ? 'semi' : b.category === 'Critical' ? 'crit' : 'over'}`}>
                    {b.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Filters */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            FILTER BY STAGE OF EXTRACTION (SoE)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            {['All', 'Safe', 'Semi-Critical', 'Critical', 'Over-Exploited'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.45rem 0.6rem',
                  borderRadius: '8px',
                  border: selectedCategory === cat ? `1px solid ${getCategoryColor(cat)}` : '1px solid rgba(255,255,255,0.08)',
                  background: selectedCategory === cat ? `${getCategoryColor(cat)}22` : 'rgba(30, 41, 59, 0.5)',
                  color: selectedCategory === cat ? getCategoryColor(cat) : 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="glass-card" style={{ marginTop: '0.5rem', fontSize: '0.78rem' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
            Official Categorization Tiers
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#34d399' }}>🟢 Safe</span>
              <span style={{ color: 'var(--text-muted)' }}>SoE ≤ 70% (4,945 Blocks)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fbbf24' }}>🟡 Semi-Critical</span>
              <span style={{ color: 'var(--text-muted)' }}>70% &lt; SoE ≤ 90% (759)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fb923c' }}>🟠 Critical</span>
              <span style={{ color: 'var(--text-muted)' }}>90% &lt; SoE ≤ 100% (201)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#f87171' }}>🔴 Over-Exploited</span>
              <span style={{ color: 'var(--text-muted)' }}>SoE &gt; 100% (730 Blocks)</span>
            </div>
          </div>
        </div>

        {/* Selected Location Card */}
        {selectedLocation && (
          <div className="glass-card" style={{ marginTop: 'auto', border: `1px solid ${getCategoryColor(selectedLocation.category)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontSize: '1rem', color: '#ffffff' }}>{selectedLocation.block_name}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {selectedLocation.district_name}, {selectedLocation.state_name}
                </p>
              </div>
              <span className={`badge badge-${selectedLocation.category === 'Safe' ? 'safe' : selectedLocation.category === 'Semi-Critical' ? 'semi' : selectedLocation.category === 'Critical' ? 'crit' : 'over'}`}>
                {selectedLocation.category}
              </span>
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', lineHeight: '1.5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.3rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Borewell Feasibility:</span>
                <strong style={{ color: selectedLocation.category === 'Safe' ? '#34d399' : '#f87171' }}>
                  {selectedLocation.category === 'Safe' ? 'Permissible' : 'Strict NOC Required'}
                </strong>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                {selectedLocation.category === 'Over-Exploited'
                  ? 'Mandatory 100% rooftop rainwater recharge required for industrial clearance.'
                  : 'Maintain water balance with routine percolation check dams.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Map Container */}
      <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '0.5rem' }}>
        <MapContainer
          center={[22.5937, 78.9629]}
          zoom={5}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%', borderRadius: '12px' }}
        >
          {/* Dark / CartoDB Voyager styled tile layer */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {filteredHotspots.map((spot, i) => (
            <CircleMarker
              key={i}
              center={[spot.lat, spot.lng]}
              radius={spot.category === 'Over-Exploited' ? 12 : 9}
              fillColor={getCategoryColor(spot.category)}
              color="#ffffff"
              weight={2}
              opacity={0.9}
              fillOpacity={0.75}
              eventHandlers={{
                click: () => {
                  setSelectedLocation({
                    block_name: spot.name,
                    district_name: spot.district,
                    state_name: spot.state,
                    category: spot.category
                  });
                }
              }}
            >
              <Popup>
                <div style={{ padding: '0.3rem', minWidth: '180px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>{spot.name}</strong>
                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: `${getCategoryColor(spot.category)}22`, color: getCategoryColor(spot.category), fontWeight: 700 }}>
                      {spot.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4' }}>
                    <div><strong>District:</strong> {spot.district}, {spot.state}</div>
                    <div><strong>Stage of Extraction:</strong> <span style={{ color: spot.soe > 100 ? '#f87171' : '#34d399', fontWeight: 700 }}>{spot.soe}%</span></div>
                    {spot.quality && <div><strong>Contaminants:</strong> {spot.quality}</div>}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

    </div>
  );
}
