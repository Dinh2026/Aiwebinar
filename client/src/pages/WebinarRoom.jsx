import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Volume2, VolumeX, Maximize, Users, Pin } from 'lucide-react';
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
  const [userMsg, setUserMsg] = useState('');
  const [pinned, setPinned] = useState(null);
  const [seedingData, setSeedingData] = useState([]);
  const [notif, setNotif] = useState(null);
  const videoRef = useRef(null);
  const chatEnd = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [viewers, setViewers] = useState(0);

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

  // Chat sync
  useEffect(() => {
    if (!playing || !videoRef.current) return;
    const iv = setInterval(() => {
      const ms = (videoRef.current?.currentTime || 0) * 1000;
      setVisible(chatMessages.filter(m => m.time_offset_ms <= ms));
      const pin = chatMessages.find(m => m.is_pinned && m.time_offset_ms <= ms &&
        (m.pin_duration_seconds === 0 || m.time_offset_ms + m.pin_duration_seconds * 1000 > ms));
      setPinned(pin || null);
      const seed = seedingData.find(s => { const d = ms - s.time_offset_ms; return d >= 0 && d < 4000; });
      if (seed) setNotif(seed);
    }, 500);
    return () => clearInterval(iv);
  }, [playing, chatMessages, seedingData]);

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
    if (videoRef.current) { videoRef.current.play(); setPlaying(true); trackEvent('video_started'); }
  };

  const sendMsg = () => {
    if (!userMsg.trim()) return;
    setVisible(p => [...p, { name: attendee?.fullName || 'Bạn', message: userMsg, role: 'viewer', color: '#6366f1', time_offset_ms: Date.now(), _local: true }]);
    trackEvent('chat_message_sent', { message: userMsg });
    setUserMsg('');
  };

  const formatLink = (text) => {
    const r = /(https?:\/\/[^\s]+)/g;
    return text.split(r).map((p, i) => r.test(p) ? (
      <a key={i} href={p} target="_blank" rel="noopener noreferrer"
        style={{ color: 'var(--accent-primary-light)', fontWeight: 600, textDecoration: 'underline' }}>{p}</a>
    ) : p);
  };

  const getVideoSrc = () => {
    if (!webinar) return '';
    if (webinar.video_type === 'youtube') {
      const id = webinar.video_url?.match(/(?:v=|\/)([\w-]{11})/)?.[1];
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&controls=0&modestbranding=1&rel=0` : '';
    }
    if (webinar.video_type === 'vimeo') {
      const id = webinar.video_url?.match(/vimeo\.com\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}?autoplay=1&controls=0` : '';
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
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulseGlow 2s ease-in-out infinite' }} />
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
      <style>{`@keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}`}</style>
    </div>
  );

  // Webinar Room
  const mob = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: mob ? 'column' : 'row', overflow: 'hidden', background: '#000' }}>
      {/* Video */}
      <div style={{ flex: mob ? undefined : 1, height: mob ? '45vh' : '100%', position: 'relative', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {webinar?.video_type === 'mp4' ? (
          <video ref={videoRef} src={getVideoSrc()} style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            playsInline onEnded={() => trackEvent('webinar_completed')} />
        ) : (
          <iframe src={getVideoSrc()} style={{ width: '100%', height: '100%', border: 'none' }} allow="autoplay; fullscreen" allowFullScreen />
        )}

        {/* Play overlay */}
        {!playing && webinar?.video_type === 'mp4' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', cursor: 'pointer' }} onClick={handlePlay}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s',
            }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ width: 0, height: 0, borderLeft: '18px solid white', borderTop: '11px solid transparent', borderBottom: '11px solid transparent', marginLeft: 4 }} />
            </div>
          </div>
        )}

        {/* Top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 16px', background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'pulseGlow 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{webinar?.title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
            <Users size={13} /> {viewers}
          </div>
        </div>

        {/* Bottom controls */}
        {!mob && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 16px', background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)', display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 6 }}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button onClick={() => document.documentElement.requestFullscreen?.()}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 6 }}>
              <Maximize size={18} />
            </button>
          </div>
        )}

        {/* Seeding notification */}
        {notif && (
          <div style={{ position: 'absolute', bottom: mob ? 8 : 56, left: 12, zIndex: 20 }} className="animate-fadeIn">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 16,
              background: 'rgba(17,26,46,0.92)', backdropFilter: 'blur(12px)',
              border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-md)', maxWidth: 280,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                {notif.customer_name?.charAt(0)}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{notif.customer_name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.content}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat */}
      <div style={{
        width: mob ? '100%' : 360, flex: mob ? 1 : undefined,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-secondary)', borderLeft: mob ? 'none' : '1px solid var(--border-default)',
      }}>
        {/* Pinned */}
        {pinned && (
          <div style={{ padding: '10px 16px', background: 'rgba(251,191,36,0.06)', borderBottom: '1px solid rgba(251,191,36,0.12)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Pin size={14} style={{ color: 'var(--accent-amber)', marginTop: 2, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-amber)' }}>{pinned.name}</p>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{formatLink(pinned.message)}</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          {visible.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10 }} className="animate-fadeIn">
              <div style={{
                width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: 'white',
                background: m.role === 'admin' ? 'var(--gradient-primary)' : (m.color || 'var(--bg-elevated)'),
              }}>
                {m.name?.charAt(0)?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0, maxWidth: '85%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: m.role === 'admin' ? 'var(--accent-primary-light)' : 'var(--text-secondary)' }}>{m.name}</span>
                  {m.role === 'admin' && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary-light)', fontWeight: 700 }}>Admin</span>
                  )}
                </div>
                <div style={{
                  display: 'inline-block', padding: '7px 12px', borderRadius: '4px 14px 14px 14px',
                  fontSize: 13, wordBreak: 'break-word', lineHeight: 1.45,
                  background: m.role === 'admin' ? 'rgba(99,102,241,0.1)' : 'rgba(148,163,184,0.06)',
                  color: 'var(--text-primary)',
                  border: m.role === 'admin' ? '1px solid rgba(99,102,241,0.15)' : '1px solid var(--border-default)',
                }}>
                  {formatLink(m.message)}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEnd} />
        </div>

        {/* Input */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={userMsg} onChange={(e) => setUserMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
              placeholder="Gửi tin nhắn..."
              style={{
                flex: 1, padding: '9px 16px', borderRadius: 99,
                background: 'rgba(148,163,184,0.06)', border: '1px solid var(--border-default)',
                color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                transition: 'border-color var(--transition-fast)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
            />
            <button onClick={sendMsg} style={{
              width: 38, height: 38, borderRadius: '50%', border: 'none',
              background: 'var(--gradient-primary)', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'transform var(--transition-fast)',
            }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}`}</style>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
