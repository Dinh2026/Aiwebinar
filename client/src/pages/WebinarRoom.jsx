import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Volume2, VolumeX, Maximize, Users, Pin } from 'lucide-react';
import axios from 'axios';

const API = (import.meta.env.VITE_API_URL || '') + '/api/public';
const PIN_ICON = 'https://storage.googleapis.com/msgsndr/ZvTjUqBlrPvdA6D95vnu/media/68b46b6f74ce1f1ed01955c4.png';

export default function WebinarRoom() {
  const { roomCode } = useParams();
  const [webinar, setWebinar] = useState(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [attendeeData, setAttendeeData] = useState(null);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [pinnedMessage, setPinnedMessage] = useState(null);

  // Seeding state
  const [seedingData, setSeedingData] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);

  // Video state
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  // Load webinar data
  useEffect(() => {
    loadWebinar();
    // Check if already checked in
    const saved = sessionStorage.getItem(`checkin_${roomCode}`);
    if (saved) {
      const data = JSON.parse(saved);
      setAttendeeData(data);
      setCheckedIn(true);
    }
  }, [roomCode]);

  const loadWebinar = async () => {
    try {
      const { data } = await axios.get(`${API}/room/${roomCode}`);
      setWebinar(data.webinar);
      setViewerCount(Math.floor(Math.random() * 50) + (data.webinar.display_threshold || 10));
      // Load chat + seeding
      const [chatRes, seedRes] = await Promise.all([
        axios.get(`${API}/room/${roomCode}/chat`),
        axios.get(`${API}/room/${roomCode}/seeding`),
      ]);
      setChatMessages(chatRes.data.messages || []);
      setSeedingData(seedRes.data.notifications || []);
    } catch (err) {
      setError('Không tìm thấy webinar hoặc webinar chưa được xuất bản');
    } finally { setLoading(false); }
  };

  // Check-in handler
  const handleCheckin = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email) return;
    try {
      const { data } = await axios.post(`${API}/room/${roomCode}/checkin`, {
        ...form, deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        browser: navigator.userAgent.split(' ').pop()
      });
      const attendee = { ...data, fullName: form.fullName };
      setAttendeeData(attendee);
      setCheckedIn(true);
      sessionStorage.setItem(`checkin_${roomCode}`, JSON.stringify(attendee));
    } catch (err) { console.error(err); }
  };

  // Chat scheduler based on video time
  useEffect(() => {
    if (!playing || !videoRef.current) return;
    const interval = setInterval(() => {
      const currentMs = (videoRef.current?.currentTime || 0) * 1000;
      const visible = chatMessages.filter(m => m.time_offset_ms <= currentMs);
      setVisibleMessages(visible);

      // Pin messages
      const pinMsg = chatMessages.find(m => m.is_pinned && m.time_offset_ms <= currentMs &&
        (m.pin_duration_seconds === 0 || m.time_offset_ms + m.pin_duration_seconds * 1000 > currentMs));
      setPinnedMessage(pinMsg || null);

      // Seeding notifications
      const currentSeed = seedingData.find(s => {
        const diff = currentMs - s.time_offset_ms;
        return diff >= 0 && diff < 4000;
      });
      if (currentSeed) setActiveNotification(currentSeed);
    }, 500);
    return () => clearInterval(interval);
  }, [playing, chatMessages, seedingData]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages]);

  // Hide notification after 3s
  useEffect(() => {
    if (activeNotification) {
      const t = setTimeout(() => setActiveNotification(null), 3000);
      return () => clearTimeout(t);
    }
  }, [activeNotification]);

  // Track event
  const trackEvent = useCallback(async (eventType, payload = {}) => {
    if (!attendeeData || !webinar) return;
    try {
      await axios.post(`${API}/track`, {
        subAccountId: webinar.sub_account_id, webinarId: webinar.id,
        attendeeId: attendeeData.attendeeId, sessionId: attendeeData.sessionId,
        eventType, payload, videoTimeSeconds: videoRef.current?.currentTime || 0,
      });
    } catch (err) { /* silent */ }
  }, [attendeeData, webinar]);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setPlaying(true);
      trackEvent('video_started');
    }
  };

  const sendMessage = () => {
    if (!userMessage.trim()) return;
    setVisibleMessages(prev => [...prev, {
      name: attendeeData?.fullName || 'Bạn', message: userMessage, role: 'viewer',
      color: '#6366f1', time_offset_ms: Date.now(), _local: true
    }]);
    trackEvent('chat_message_sent', { message: userMessage });
    setUserMessage('');
  };

  const toggleFullscreen = () => {
    const el = document.documentElement;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (rfs) rfs.call(el);
  };

  const formatLink = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="text-indigo-400 font-bold italic underline hover:text-indigo-300 transition-colors">
          {part}
        </a>
      ) : part
    );
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
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
      <div className="text-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-gray-400 mt-4">Đang tải webinar...</p></div>
    </div>
  );

  // Error
  if (error) return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-4">
      <div className="text-center"><p className="text-2xl text-white font-bold mb-2">😔</p><p className="text-gray-400">{error}</p></div>
    </div>
  );

  // Check-in Form
  if (!checkedIn) return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl" />
      <div className="relative z-10 w-full max-w-lg">
        <div className="glass-card p-8">
          {/* Webinar Info */}
          <div className="text-center mb-8">
            {webinar?.thumbnail_url && <img src={webinar.thumbnail_url} alt="" className="w-full h-48 object-cover rounded-xl mb-6" />}
            <h1 className="text-2xl font-bold text-white">{webinar?.title}</h1>
            {webinar?.description && <p className="text-gray-400 mt-2 text-sm">{webinar.description}</p>}
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="animate-pulse-live w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              <span className="text-sm text-red-400 font-semibold">LIVE</span>
              <span className="text-gray-500 text-sm ml-2">• {viewerCount} người đang xem</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleCheckin} className="space-y-4">
            <input value={form.fullName} onChange={(e) => setForm(p=>({...p, fullName: e.target.value}))}
              placeholder="Họ và tên *" className="input-field" required />
            <input value={form.email} onChange={(e) => setForm(p=>({...p, email: e.target.value}))}
              placeholder="Email *" type="email" className="input-field" required />
            <input value={form.phone} onChange={(e) => setForm(p=>({...p, phone: e.target.value}))}
              placeholder="Số điện thoại" className="input-field" />
            <button type="submit" className="btn-primary w-full py-3 text-base">
              🎬 Tham gia Webinar ngay
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // Webinar Room
  const isMobile = window.innerWidth < 768;

  return (
    <div className="h-screen bg-[#0a0e1a] flex flex-col md:flex-row overflow-hidden">
      {/* Favicon pulse */}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}} .live-dot{animation:blink 1.5s infinite}`}</style>

      {/* Video Section */}
      <div className={`${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-black flex items-center justify-center`}>
        {webinar?.video_type === 'mp4' ? (
          <video ref={videoRef} src={getVideoSrc()} className="w-full h-full object-contain"
            playsInline onEnded={() => trackEvent('webinar_completed')} />
        ) : (
          <iframe src={getVideoSrc()} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen />
        )}

        {/* Play Overlay */}
        {!playing && webinar?.video_type === 'mp4' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer" onClick={handlePlay}>
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform">
              <div className="w-0 h-0 border-l-[20px] border-l-white border-y-[12px] border-y-transparent ml-1" />
            </div>
          </div>
        )}

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="live-dot w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-sm font-bold text-white">{webinar?.title}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Users size={14} /> {viewerCount}
            </div>
          </div>
        </div>

        {/* Controls */}
        {!isMobile && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-between">
            <button onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }}
              className="p-2 text-white/80 hover:text-white">
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button onClick={toggleFullscreen} className="p-2 text-white/80 hover:text-white">
              <Maximize size={20} />
            </button>
          </div>
        )}

        {/* Seeding Notification */}
        {activeNotification && (
          <div className="absolute bottom-16 left-4 z-30 animate-fadeIn">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1f2937]/95 backdrop-blur-sm border border-indigo-500/20 shadow-xl max-w-xs">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {activeNotification.customer_name?.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{activeNotification.customer_name}</p>
                <p className="text-xs text-gray-400 truncate">{activeNotification.content}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Section */}
      <div className={`${isMobile ? 'flex-1' : 'w-[380px]'} flex flex-col bg-[#0d1117] border-l border-gray-800`}>
        {/* Pinned Message */}
        {pinnedMessage && (
          <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-2">
            <img src={PIN_ICON} alt="pin" className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-400">{pinnedMessage.name}</p>
              <p className="text-sm text-gray-200 break-words">{formatLink(pinnedMessage.message)}</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          {visibleMessages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 animate-fadeIn ${msg.role === 'admin' ? '' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white`}
                style={{ background: msg.role === 'admin' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : (msg.color || '#374151') }}>
                {msg.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0 max-w-[85%]">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-bold ${msg.role === 'admin' ? 'text-indigo-400' : 'text-gray-300'}`}>
                    {msg.name}
                  </span>
                  {msg.role === 'admin' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">Admin</span>
                  )}
                </div>
                <div className={`inline-block px-3 py-2 rounded-2xl text-sm break-words ${
                  msg.role === 'admin'
                    ? 'bg-indigo-500/15 text-gray-100 border border-indigo-500/20'
                    : 'bg-white/5 text-gray-200'
                }`}>
                  {formatLink(msg.message)}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="px-4 py-3 border-t border-gray-800 bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <input
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Gửi tin nhắn..."
              className="flex-1 px-4 py-2.5 rounded-full bg-white/5 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <button onClick={sendMessage} className="p-2.5 rounded-full bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
