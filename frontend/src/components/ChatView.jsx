import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles, AlertTriangle, CheckCircle2, ShieldAlert, BarChart2, RefreshCw } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function ChatView() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: "Namaste! I am **I.G.R.I.S.**, your AI virtual assistant for the national **INGRES** groundwater portal.\n\nAsk me about any **State, District, or Block across India (6,635+ blocks indexed)** to get official extraction rates, water table depths, and borewell safety recommendations.",
      source: 'I.G.R.I.S. Core',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState('en');
  const chatEndRef = useRef(null);

  const quickPrompts = [
    { label: '🌾 Borewell in Sangrur, Punjab?', query: 'Is it safe to dig a borewell in Sangrur, Punjab?' },
    { label: '📊 Maharashtra Extraction Stats', query: 'Show groundwater recharge and extraction for Maharashtra' },
    { label: '⚠️ Jaipur, Rajasthan Status', query: 'What is the groundwater categorization of Jaipur, Rajasthan?' },
    { label: '🇮🇳 National GWRA-2025 Overview', query: 'Give me the national all-India groundwater summary' },
    { label: '🧪 Gujarat Water Quality', query: 'What are the groundwater contamination issues in Gujarat?' }
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Speech to Text (Web Speech API)
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser. Please use Chrome/Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognition.start();

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }
  };

  // Text to Speech
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/[*#`_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend = input) => {
    const query = textToSend.trim();
    if (!query || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          language: language,
          history: messages.slice(-4).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          }))
        })
      });

      const data = await res.json();
      const botMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: data.reply || 'Here is the groundwater assessment for your request.',
        source: data.source || 'I.G.R.I.S. Core',
        visualization: data.visualization,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'assistant',
        text: '⚠️ Unable to connect to the backend server. Please make sure FastAPI is running on port 8000.',
        source: 'System Error',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', height: 'calc(100vh - 130px)', padding: '0 1.5rem 1.5rem' }}>
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Chat Header Controls */}
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={18} color="#38bdf8" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Hydrological AI Conversational Navigator</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            >
              🌐 {language === 'en' ? 'English (EN)' : 'हिंदी (HI)'}
            </button>
            <button
              onClick={() => setMessages([messages[0]])}
              className="btn-secondary"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
              title="Clear conversation"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Quick Prompt Chips */}
        <div style={{ padding: '0.6rem 1.25rem', background: 'rgba(15, 23, 42, 0.4)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p.query)}
              style={{
                whiteSpace: 'nowrap',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                color: '#e2e8f0',
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.76rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.2)'}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                gap: '0.35rem',
                maxWidth: '85%',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'rgba(30, 41, 59, 0.75)',
                  border: msg.sender === 'user' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '1rem 1.25rem',
                  color: '#ffffff',
                  boxShadow: msg.sender === 'user' ? '0 4px 15px rgba(2, 132, 199, 0.25)' : '0 4px 20px rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(10px)',
                  lineHeight: '1.6',
                  fontSize: '0.92rem'
                }}
              >
                {/* Message text with basic markdown formatting */}
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </div>

                {/* Inline Visual Data Component */}
                {msg.visualization && (
                  <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '0.85rem' }}>
                    
                    {/* 1. Block Card Payload */}
                    {msg.visualization.type === 'block_card' && (
                      <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '12px', border: `1px solid ${msg.visualization.status_color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{msg.visualization.title}</span>
                          <span className={`badge badge-${msg.visualization.category === 'Safe' ? 'safe' : msg.visualization.category === 'Semi-Critical' ? 'semi' : msg.visualization.category === 'Critical' ? 'crit' : 'over'}`}>
                            {msg.visualization.category}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.8rem' }}>
                          <div className="glass-card" style={{ textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-muted)' }}>State</div>
                            <div style={{ fontWeight: 600 }}>{msg.visualization.state_name}</div>
                          </div>
                          <div className="glass-card" style={{ textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-muted)' }}>District</div>
                            <div style={{ fontWeight: 600 }}>{msg.visualization.district_name}</div>
                          </div>
                          <div className="glass-card" style={{ textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Borewell Permit</div>
                            <div style={{ fontWeight: 600, color: msg.visualization.status_color }}>
                              {msg.visualization.category === 'Safe' ? 'Permitted' : 'NOC Required'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. State Analytics Payload (Donut + Metrics) */}
                    {msg.visualization.type === 'state_analytics' && (
                      <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                        <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#38bdf8' }}>
                          {msg.visualization.title}
                        </h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                          <div style={{ height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Doughnut
                              data={{
                                labels: msg.visualization.donut_chart.labels,
                                datasets: [{
                                  data: msg.visualization.donut_chart.data,
                                  backgroundColor: ['#0284c7', '#f59e0b', '#10b981'],
                                  borderWidth: 0
                                }]
                              }}
                              options={{
                                plugins: {
                                  legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } }
                                },
                                maintainAspectRatio: false
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                            <div className="glass-card">
                              <span style={{ color: 'var(--text-muted)' }}>Stage of Extraction (SoE): </span>
                              <strong style={{ color: msg.visualization.metrics.stage_of_extraction > 100 ? '#ef4444' : '#10b981' }}>
                                {msg.visualization.metrics.stage_of_extraction}%
                              </strong>
                            </div>
                            <div className="glass-card">
                              <span style={{ color: 'var(--text-muted)' }}>Annual Recharge: </span>
                              <strong>{msg.visualization.metrics.total_recharge_bcm} BCM</strong>
                            </div>
                            <div className="glass-card">
                              <span style={{ color: 'var(--text-muted)' }}>Total Extraction: </span>
                              <strong>{msg.visualization.metrics.total_extraction_bcm} BCM</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. National Summary Payload */}
                    {msg.visualization.type === 'national_summary' && (
                      <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#10b981' }}>
                          🇮🇳 All-India Block Health Distribution (6,635 Units)
                        </h4>
                        <div style={{ height: '160px' }}>
                          <Bar
                            data={{
                              labels: ['Safe (74.5%)', 'Semi-Critical (11.4%)', 'Critical (3.0%)', 'Over-Exploited (11.0%)'],
                              datasets: [{
                                label: 'Number of Blocks',
                                data: [
                                  msg.visualization.metrics.safe_blocks,
                                  msg.visualization.metrics.semi_critical_blocks,
                                  msg.visualization.metrics.critical_blocks,
                                  msg.visualization.metrics.over_exploited_blocks
                                ],
                                backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
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
                    )}

                  </div>
                )}
              </div>

              {/* Timestamp & Source */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0 0.4rem' }}>
                <span>{msg.timestamp}</span>
                {msg.source && <span>• {msg.source}</span>}
                {msg.sender === 'assistant' && (
                  <button
                    onClick={() => speakText(msg.text)}
                    style={{ background: 'none', border: 'none', color: isSpeaking ? '#38bdf8' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Listen to response"
                  >
                    {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '12px', width: 'fit-content' }}>
              <span className="pulse-dot" style={{ background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Querying INGRES Master DB & Synthesizing via Gemma-4...
              </span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(15, 23, 42, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(30, 41, 59, 0.6)', padding: '0.4rem 0.6rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <input
              type="text"
              placeholder={isListening ? "Listening... (Speak now)" : "Ask about any state, district, borewell safety, or water stats..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontFamily: 'var(--font-body)',
                padding: '0.4rem 0.5rem'
              }}
            />

            <button
              onClick={toggleSpeechRecognition}
              style={{
                background: isListening ? '#ef4444' : 'rgba(255, 255, 255, 0.07)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem',
                color: isListening ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || loading}
              className="btn-primary"
              style={{ padding: '0.5rem 1rem' }}
            >
              <Send size={16} />
              <span>Ask</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
