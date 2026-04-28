import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Users, Eye, Clock, TrendingUp, Plus, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
      borderRadius: 12, padding: '10px 14px', boxShadow: 'var(--shadow-md)',
    }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
        {label ? new Date(label).toLocaleDateString('vi') : ''}
      </p>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
        {payload[0]?.value} attendees
      </p>
    </div>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const { data } = await api.get('/analytics/overview');
      setStats(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fmtDuration = (s) => {
    if (!s) return '0m';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="skeleton" style={{ height: 32, width: 200 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
      </div>
      <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
    </div>
  );

  const statCards = [
    { label: 'Tổng Webinars', value: stats?.totalWebinars || 0, icon: Video, gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', bg: 'rgba(99,102,241,0.08)' },
    { label: 'Tổng Attendees', value: stats?.totalAttendees || 0, icon: Users, gradient: 'linear-gradient(135deg, #22d3ee, #06b6d4)', bg: 'rgba(34,211,238,0.08)' },
    { label: 'Tổng Sessions', value: stats?.totalSessions || 0, icon: Eye, gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)', bg: 'rgba(251,191,36,0.08)' },
    { label: 'Thời gian xem', value: fmtDuration(stats?.totalWatchSeconds), icon: Clock, gradient: 'linear-gradient(135deg, #fb7185, #f43f5e)', bg: 'rgba(251,113,133,0.08)' },
  ];

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Tổng quan</h1>
          <p className="page-subtitle">
            Xin chào, <span style={{ color: 'var(--accent-primary-light)', fontWeight: 600 }}>{user.fullName || 'bạn'}</span> 👋
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/webinars/new')}>
          <Plus size={16} /> Tạo Webinar
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16, marginBottom: 28 }}>
        {statCards.map((card, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 60}ms` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: card.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <card.icon size={18} style={{ color: 'var(--text-primary)' }} />
              </div>
              <TrendingUp size={14} style={{ color: 'var(--accent-emerald)', opacity: 0.6 }} />
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {card.value}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
        {/* Attendees Chart */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 className="section-title">
            <span style={{ display: 'inline-flex', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)' }} />
            Attendees 7 ngày gần nhất
          </h3>
          {stats?.dailyAttendees?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats.dailyAttendees}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString('vi', { day: '2-digit', month: '2-digit' })} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#chartGrad)" dot={false} activeDot={{ r: 4, fill: '#818cf8', stroke: '#6366f1', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Chưa có dữ liệu</p>
            </div>
          )}
        </div>

        {/* Recent Webinars */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 className="section-title" style={{ margin: 0 }}>
              <span style={{ display: 'inline-flex', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)' }} />
              Webinars gần đây
            </h3>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => navigate('/webinars')}>
              Xem tất cả <ArrowUpRight size={12} />
            </button>
          </div>
          {stats?.recentWebinars?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stats.recentWebinars.map((w) => (
                <div key={w.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 'var(--radius-md)',
                  background: 'rgba(148,163,184,0.03)',
                  transition: 'background var(--transition-fast)',
                  cursor: 'pointer',
                }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
                   onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(148,163,184,0.03)'}
                   onClick={() => navigate(`/webinars/${w.id}/edit`)}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.title}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                      {new Date(w.created_at).toLocaleDateString('vi')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12, flexShrink: 0 }}>
                    <span className={`badge badge-dot ${w.status === 'published' ? 'badge-success' : 'badge-warning'}`}>
                      {w.status === 'published' ? 'Live' : 'Nháp'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon"><Video size={24} style={{ color: 'var(--text-muted)' }} /></div>
              <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 12 }}>Chưa có webinar nào</p>
              <button className="btn btn-primary" style={{ fontSize: 12.5 }} onClick={() => navigate('/webinars/new')}>
                <Plus size={14} /> Tạo webinar đầu tiên
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
