import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Volume2, VolumeX, Maximize, Users, Pin, MessageCircle } from 'lucide-react';
import axios from 'axios';

const API = (import.meta.env.VITE_API_URL || '') + '/api/public';

export default function WebinarRoom() {
  const { roomCode } = useParams();
  const [webinar, setWebinar] = useState(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [attendee, setAttendee] = useState(null);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [visible, setVisible] = useState([]);
  const [localMsgs, setLocalMsgs] = useState([]);
  const [userMsg, setUserMsg] = useState('');
  const [pinned, setPinned] = useState(null);
  const [seedingData, setSeedingData] = useState([]);
  const [notif, setNotif] = useState(null);
  const videoRef = useRef(null);
  const chatEnd = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    loadWebinar();
    const s = sessionStorage.getItem(`checkin_${roomCode}`);
    if (s) { const d = JSON.parse(s); setAttendee(d); setCheckedIn(true); }
  }, [roomCode]);

  const loadWebinar = async () => {
    try {
      const { data } = await axios.get(`${API}/room/${roomCode}`);
      setWebinar(data.webinar);
      setViewers(Math.floor(Math.random() * 50) + (data.webinar.display_threshold || 10));
      const [c, s] = await Promise.all([
        axios.get(`${API}/room/${roomCode}/chat`),
        axios.get(`${API}/room/${roomCode}/seeding`),
      ]);
      setChatMessages(c.data.messages || []);
      setSeedingData(s.data.notifications || []);
    } catch (err) { setError('Không tìm thấy webinar hoặc chưa được xuất bản'); }
    finally { setLoading(false); }
  };

  const handleCheckin = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email) return;
    try {
      const { data } = await axios.post(`${API}/room/${roomCode}/checkin`, {
        ...form, deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        browser: navigator.userAgent.split(' ').pop()
      });
      const a = { ...data, fullName: form.fullName };
      setAttendee(a); setCheckedIn(true);
      sessionStorage.setItem(`checkin_${roomCode}`, JSON.stringify(a));
    } catch (err) { console.error(err); }
  };

  // Chat sync — combine script messages + local messages
  useEffect(() => {
    if (!checkedIn) return;
    const iv = setInterval(() => {
      const ms = videoRef.current ? (videoRef.current.currentTime || 0) * 1000 : 0;
      const scripted = playing ? chatMessages.filter(m => m.time_offset_ms <= ms) : [];
      setVisible([...scripted, ...localMsgs]);
      if (playing) {
        const pin = chatMessages.find(m => m.is_pinned && m.time_offset_ms <= ms &&
          (m.pin_duration_seconds === 0 || m.time_offset_ms + m.pin_duration_seconds * 1000 > ms));
        setPinned(pin || null);
        const seed = seedingData.find(s => { const d = ms - s.time_offset_ms; return d >= 0 && d < 4000; });
        if (seed) setNotif(seed);
      }
    }, 500);
    return () => clearInterval(iv);
  }, [playing, chatMessages, seedingData, localMsgs, checkedIn]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [visible]);
  useEffect(() => { if (notif) { const t = setTimeout(() => setNotif(null), 3500); return () => clearTimeout(t); } }, [notif]);

  const trackEvent = useCallback(async (eventType, payload = {}) => {
    if (!attendee || !webinar) return;
    try {
      await axios.post(`${API}/track`, {
        subAccountId: webinar.sub_account_id, webinarId: webinar.id,
        attendeeId: attendee.attendeeId, sessionId: attendee.sessionId,
        eventType, payload, videoTimeSeconds: videoRef.current?.currentTime || 0,
      });
    } catch (err) { /* silent */ }
  }, [attendee, webinar]);

  const handlePlay = () => {
    if (!videoRef.current) return;
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        setPlaying(true);
        trackEvent('video_started');
      }).catch((err) => {
        console.warn('Autoplay blocked, retrying muted:', err);
        videoRef.current.muted = true;
        videoRef.current.play().then(() => {
          setPlaying(true);
          setMuted(true);
          trackEvent('video_started');
        }).catch(e => console.error('Video play failed:', e));
      });
    }
  };

  const sendMsg = () => {
    if (!userMsg.trim()) return;
    const msg = { name: attendee?.fullName || 'Bạn', message: userMsg, role: 'viewer', color: '#6366f1', time_offset_ms: Date.now(), _local: true };
    setLocalMsgs(p => [...p, msg]);
    trackEvent('chat_message_sent', { message: userMsg });
    setUserMsg('');
  };

  const formatLink = (text) => {
    if (!text) return text;
    const r = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(r);
    return parts.map((p, i) => {
      if (r.test(p)) {
        return <a key={i} href={p} target="_blank" rel="noopener noreferrer"
          style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'underline' }}>{p.length > 40 ? p.slice(0,40)+'...' : p}</a>;
      }
      return p;
    });
  };

  // Smart detect actual video type from URL (handles data mismatches)
  const detectVideoType = () => {
    if (!webinar?.video_url) return 'mp4';
    const url = webinar.video_url;
    if (url.match(/youtube\.com|youtu\.be/)) return 'youtube';
    if (url.match(/vimeo\.com/)) return 'vimeo';
    return webinar.video_type || 'mp4';
  };

  const getVideoSrc = () => {
    if (!webinar) return '';
    const actualType = detectVideoType();
    if (actualType === 'youtube') {
      const id = webinar.video_url?.match(/(?:v=|\/)([\w-]{11})/)?.[1];
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&modestbranding=1&rel=0` : '';
    }
    if (actualType === 'vimeo') {
      const id = webinar.video_url?.match(/vimeo\.com\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}?autoplay=1&controls=1` : '';
    }
    return webinar.video_url;
  };

  // Loading
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p style={{ color: 'var(--text-muted)', marginTop: 16, fontSize: 13 }}>Đang tải webinar...</p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>😔</div>
        <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Không thể tải webinar</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{error}</p>
      </div>
    </div>
  );

  // Check-in Form
  if (!checkedIn) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '20%', left: '25%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)' }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }} className="animate-fadeIn">
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-2xl)', padding: '32px 28px', boxShadow: 'var(--shadow-lg)',
        }}>
          {webinar?.thumbnail_url && (
            <img src={webinar.thumbnail_url} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 'var(--radius-lg)', marginBottom: 20 }} />
          )}
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.02em' }}>
            {webinar?.title}
          </h1>
          {webinar?.description && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>{webinar.description}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span className="live-dot" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>LIVE</span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 4 }}>• {viewers} người đang xem</span>
          </div>

          <form onSubmit={handleCheckin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label className="input-label">Họ và tên *</label>
              <input value={form.fullName} onChange={(e) => setForm(p=>({...p, fullName: e.target.value}))} className="input-field" required />
            </div>
            <div><label className="input-label">Email *</label>
              <input value={form.email} onChange={(e) => setForm(p=>({...p, email: e.target.value}))} type="email" className="input-field" required />
            </div>
            <div><label className="input-label">Số điện thoại</label>
              <input value={form.phone} onChange={(e) => setForm(p=>({...p, phone: e.target.value}))} className="input-field" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 14, fontWeight: 700, marginTop: 4 }}>
              🎬 Tham gia Webinar ngay
            </button>
          </form>
        </div>
      </div>
      <style>{`.live-dot{width:8px;height:8px;border-radius:50%;background:#ef4444;animation:pulseGlow 2s ease-in-out infinite}@keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}`}</style>
    </div>
  );

  // =================== WEBINAR ROOM ===================
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', background: '#0a0f1a' }}>
      {/* ====== VIDEO AREA ====== */}
      <div style={{
        flex: isMobile ? undefined : 1,
        height: isMobile ? '50vh' : '100%',
        position: 'relative',
        background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {detectVideoType() === 'mp4' ? (
          <video
            ref={videoRef}
            src={getVideoSrc()}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            playsInline
            preload="auto"
            onEnded={() => trackEvent('webinar_completed')}
            controls
          />
        ) : (
          <iframe src={getVideoSrc()} style={{ width: '100%', height: '100%', border: 'none' }} allow="autoplay; fullscreen" allowFullScreen />
        )}

        {/* Play overlay */}
        {(!playing && detectVideoType() === 'mp4') && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', cursor: 'pointer' }} onClick={handlePlay}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(99,102,241,0.3)', backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', border: '2px solid rgba(255,255,255,0.2)',
            }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'rgba(99,102,241,0.5)'; }}
               onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; }}>
              <div style={{ width: 0, height: 0, borderLeft: '22px solid white', borderTop: '14px solid transparent', borderBottom: '14px solid transparent', marginLeft: 5 }} />
            </div>
          </div>
        )}

        {/* Top overlay bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '12px 16px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          pointerEvents: playing ? 'none' : 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="live-dot-sm" />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{webinar?.title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: 20, color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
            <Users size={13} /> {viewers}
          </div>
        </div>

        {/* Seeding notification */}
        {notif && (
          <div style={{ position: 'absolute', bottom: isMobile ? 8 : 16, left: 12, zIndex: 20 }} className="animate-fadeIn">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 16,
              background: 'rgba(17,26,46,0.92)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', maxWidth: 280,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                {notif.customer_name?.charAt(0)}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{notif.customer_name}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.content}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====== CHAT PANEL ====== */}
      <div style={{
        width: isMobile ? '100%' : 380,
        flexShrink: 0,
        flex: isMobile ? 1 : undefined,
        display: 'flex', flexDirection: 'column',
        background: '#0c1220',
        borderLeft: isMobile ? 'none' : '1px solid rgba(148,163,184,0.1)',
      }}>
        {/* Chat Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(148,163,184,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={16} style={{ color: '#818cf8' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Live Chat</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}>
            <span className="live-dot-xs" />
            <span>{viewers} online</span>
          </div>
        </div>

        {/* Pinned Message */}
        {pinned && (
          <div style={{ padding: '10px 18px', background: 'rgba(251,191,36,0.06)', borderBottom: '1px solid rgba(251,191,36,0.12)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Pin size={14} style={{ color: '#fbbf24', marginTop: 2, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>{pinned.name}</p>
              <p style={{ fontSize: 12.5, color: '#94a3b8', wordBreak: 'break-word' }}>{formatLink(pinned.message)}</p>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {visible.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <MessageCircle size={28} style={{ color: '#334155', marginBottom: 10 }} />
              <p style={{ color: '#475569', fontSize: 13, fontWeight: 500 }}>Chat sẽ hiển thị tại đây</p>
              <p style={{ color: '#334155', fontSize: 11.5, marginTop: 4 }}>Hãy gửi tin nhắn để tương tác!</p>
            </div>
          )}
          {visible.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12 }} className="animate-fadeIn">
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: 'white',
                background: m.role === 'admin' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : (m.color || '#1e293b'),
              }}>
                {m.name?.charAt(0)?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0, maxWidth: '88%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: m.role === 'admin' ? '#818cf8' : m._local ? '#6366f1' : '#94a3b8' }}>
                    {m.name}
                  </span>
                  {m.role === 'admin' && (
                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontWeight: 700 }}>HOST</span>
                  )}
                  {m._local && (
                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontWeight: 600 }}>Bạn</span>
                  )}
                </div>
                <div style={{
                  display: 'inline-block', padding: '8px 14px', borderRadius: '4px 16px 16px 16px',
                  fontSize: 13, wordBreak: 'break-word', lineHeight: 1.5,
                  background: m.role === 'admin' ? 'rgba(99,102,241,0.1)' : m._local ? 'rgba(99,102,241,0.06)' : 'rgba(148,163,184,0.05)',
                  color: '#e2e8f0',
                  border: m.role === 'admin' ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(148,163,184,0.08)',
                }}>
                  {formatLink(m.message)}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEnd} />
        </div>

        {/* Chat Input */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(148,163,184,0.08)',
          background: '#0c1220',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={userMsg} onChange={(e) => setUserMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
              placeholder="Gửi tin nhắn..."
              style={{
                flex: 1, padding: '10px 18px', borderRadius: 99,
                background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.1)',
                color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                transition: 'border-color 150ms',
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(148,163,184,0.1)'}
            />
            <button onClick={sendMsg} style={{
              width: 40, height: 40, borderRadius: '50%', border: 'none',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'transform 150ms, box-shadow 150ms',
              boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
            }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.5)'; }}
               onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(99,102,241,0.3)'; }}>
              <Send size={15} style={{ marginLeft: 1 }} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .live-dot{width:8px;height:8px;border-radius:50%;background:#ef4444;animation:pulseGlow 2s ease-in-out infinite}
        .live-dot-sm{width:7px;height:7px;border-radius:50%;background:#ef4444;animation:pulseGlow 2s ease-in-out infinite}
        .live-dot-xs{width:6px;height:6px;border-radius:50%;background:#22c55e;flex-shrink:0}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
