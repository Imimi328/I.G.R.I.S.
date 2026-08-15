import React from 'react';
import { Droplets, MessageSquare, MapPin, Sparkles, BarChart3, Radio, ShieldCheck } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, backendStatus }) {
  const navItems = [
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare, badge: 'Gemma-4' },
    { id: 'map', label: 'GIS Water Map', icon: MapPin, count: '6,635 Blocks' },
    { id: 'suggestor', label: 'Smart Suggestor', icon: Sparkles, highlight: true },
    { id: 'dashboard', label: 'National Analytics', icon: BarChart3 }
  ];

  return (
    <header className="glass-panel" style={{ margin: '1rem 1.5rem', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
      {/* Brand & Project Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(2, 132, 199, 0.4)'
        }}>
          <Droplets size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              I.G.R.I.S.
            </h1>
            <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 700 }}>
              INGRES AI
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Ministry of Jal Shakti • Central Ground Water Board (CGWB)
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', gap: '0.4rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.3rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #0369a1 0%, #0f766e 100%)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {item.badge && (
                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '999px', background: 'rgba(168, 85, 247, 0.25)', color: '#c084fc', fontWeight: 700 }}>
                  {item.badge}
                </span>
              )}
              {item.highlight && (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Connection Status & Team Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '999px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          fontSize: '0.75rem',
          color: '#34d399',
          fontWeight: 600
        }}>
          <span className="pulse-dot" />
          <span>LMStudio Connected</span>
        </div>

        <div style={{
          fontSize: '0.72rem',
          padding: '0.35rem 0.65rem',
          borderRadius: '8px',
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: 'var(--text-secondary)'
        }}>
          SIH25066 • <strong style={{ color: 'var(--text-primary)' }}>Team Emogi</strong>
        </div>
      </div>
    </header>
  );
}
