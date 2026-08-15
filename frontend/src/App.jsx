import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ChatView from './components/ChatView';
import MapView from './components/MapView';
import SuggestorView from './components/SuggestorView';
import DashboardView from './components/DashboardView';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Tab Content */}
      <main style={{ flex: 1 }}>
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'map' && <MapView />}
        {activeTab === 'suggestor' && <SuggestorView />}
        {activeTab === 'dashboard' && <DashboardView />}
      </main>
    </div>
  );
}
