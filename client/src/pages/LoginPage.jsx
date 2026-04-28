import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const LOGO_URL = 'https://storage.googleapis.com/msgsndr/ZvTjUqBlrPvdA6D95vnu/media/68b44dd274ce1f13bc15f3ef.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Vui lòng nhập email và mật khẩu');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success(`Xin chào, ${data.user.fullName || 'bạn'}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Email hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient Lights */}
      <div style={{
        position: 'absolute', top: '15%', left: '20%',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', right: '20%',
        width: 350, height: 350,
        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }} className="animate-fadeIn">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src={LOGO_URL} alt="Ai Webinar" style={{ height: 36, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            Nền tảng Webinar tự động chuyên nghiệp
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-2xl)',
          padding: '36px 32px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{
              fontSize: 22, fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}>
              Đăng nhập
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              Truy cập dashboard quản lý webinar
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <label className="input-label">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="your@email.com" autoFocus autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="input-label">Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{ paddingRight: 44 }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button" onClick={() => setShowPw(!showPw)}
                  className="btn-icon"
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%', padding: '12px 0', fontSize: 14,
                fontWeight: 700, borderRadius: 'var(--radius-md)',
              }}
            >
              {loading ? (
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>Đăng nhập <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center', color: 'var(--text-dim)',
          fontSize: 11.5, marginTop: 24,
        }}>
          © 2026 The Solo Shop — Ai Webinar Platform
        </p>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
