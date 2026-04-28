import { useState, useEffect } from 'react';
import { BarChart3, Users, Clock, Eye, MessageSquare, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '../lib/api';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '8px 12px', boxShadow: 'var(--shadow-md)' }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{payload[0]?.value}</p>
    </div>
  );
};

export default function AnalyticsPage() {
  const [webinars, setWebinars] = useState([]);
  const [sel, setSel] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWebinars(); }, []);
  useEffect(() => { if (sel) loadAnalytics(); }, [sel]);

  const loadWebinars = async () => {
    try {
      const { data } = await api.get('/webinars');
      setWebinars(data.webinars || []);
      if (data.webinars?.length > 0) setSel(data.webinars[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadAnalytics = async () => {
    try { const { data } = await api.get(`/analytics/webinars/${sel}`); setStats(data); }
    catch (err) { console.error(err); }
  };

  const fmtDur = (s) => { if (!s) return '0m'; const m = Math.floor(s/60); return m > 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`; };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Phân tích hiệu suất chi tiết từng webinar</p>
      </div>

      <select value={sel} onChange={(e) => setSel(e.target.value)} className="input-field" style={{ width: 'auto', minWidth: 320, marginBottom: 24 }}>
        <option value="">Chọn webinar</option>
        {webinars.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
      </select>

      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { l: 'Tổng Attendees', v: stats.totalAttendees, icon: Users, c: 'var(--accent-primary-light)' },
              { l: 'Tổng Sessions', v: stats.totalSessions, icon: Eye, c: 'var(--accent-cyan)' },
              { l: 'TB Xem', v: fmtDur(stats.avgWatchDuration), icon: Clock, c: 'var(--accent-amber)' },
              { l: 'Active Chatters', v: stats.activeChatters, icon: MessageSquare, c: 'var(--accent-emerald)' },
            ].map((c, i) => (
              <div key={i} className="stat-card" style={{ padding: 18 }}>
                <c.icon size={16} style={{ color: c.c, marginBottom: 8 }} />
                <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{c.v}</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{c.l}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 className="section-title"><TrendingDown size={14} style={{ color: 'var(--accent-rose)' }} /> Retention Curve</h3>
              {stats.retentionCurve?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.retentionCurve}>
                    <defs><linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                    <XAxis dataKey="minute_mark" stroke="#475569" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="viewers" stroke="#6366f1" fill="url(#retGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 40 }}>Chưa có dữ liệu</p>}
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
              <h3 className="section-title">Exit Distribution</h3>
              {stats.exitDistribution?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.exitDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                    <XAxis dataKey="exit_minute" stroke="#475569" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" fill="#fb7185" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 40 }}>Chưa có dữ liệu</p>}
            </div>
          </div>

          {stats.eventBreakdown?.length > 0 && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 className="section-title">Event Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {stats.eventBreakdown.map((e, i) => (
                  <div key={i} style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(148,163,184,0.04)' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.event_type}</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{e.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!sel && !loading && (
        <div className="empty-state glass-card" style={{ maxWidth: 400, margin: '40px auto' }}>
          <div className="empty-state-icon"><BarChart3 size={24} style={{ color: 'var(--text-muted)' }} /></div>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Chọn một webinar để xem analytics</p>
        </div>
      )}
    </div>
  );
}
