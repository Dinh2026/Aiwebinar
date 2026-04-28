import { useState, useEffect } from 'react';
import { BarChart3, Users, Clock, Eye, MessageSquare, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import api from '../lib/api';

export default function AnalyticsPage() {
  const [webinars, setWebinars] = useState([]);
  const [selectedWebinar, setSelectedWebinar] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWebinars(); }, []);
  useEffect(() => { if (selectedWebinar) loadAnalytics(); }, [selectedWebinar]);

  const loadWebinars = async () => {
    try {
      const { data } = await api.get('/webinars');
      setWebinars(data.webinars || []);
      if (data.webinars?.length > 0) setSelectedWebinar(data.webinars[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadAnalytics = async () => {
    try {
      const { data } = await api.get(`/analytics/webinars/${selectedWebinar}`);
      setStats(data);
    } catch (err) { console.error(err); }
  };

  const formatDuration = (s) => {
    if (!s) return '0m';
    const m = Math.floor(s / 60);
    return m > 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`;
  };

  const chartStyle = { background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#f9fafb' };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics & Reports</h1>
        <p className="text-gray-400 mt-1">Phân tích hiệu suất từng webinar</p>
      </div>

      {/* Webinar Selector */}
      <select value={selectedWebinar} onChange={(e) => setSelectedWebinar(e.target.value)}
        className="input-field w-auto min-w-[300px]">
        <option value="">Chọn webinar</option>
        {webinars.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
      </select>

      {stats && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Tổng Attendees', value: stats.totalAttendees, icon: Users, color: 'text-indigo-400' },
              { label: 'Tổng Sessions', value: stats.totalSessions, icon: Eye, color: 'text-cyan-400' },
              { label: 'TB Xem', value: formatDuration(stats.avgWatchDuration), icon: Clock, color: 'text-amber-400' },
              { label: 'Active Chatters', value: stats.activeChatters, icon: MessageSquare, color: 'text-green-400' },
            ].map((c, i) => (
              <div key={i} className="stat-card">
                <c.icon size={20} className={`${c.color} mb-2`} />
                <p className="text-2xl font-bold text-white">{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Retention Curve */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingDown size={18} className="text-rose-400" /> Retention Curve
              </h3>
              {stats.retentionCurve?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={stats.retentionCurve}>
                    <defs><linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="minute_mark" stroke="#6b7280" tick={{ fontSize: 12 }} label={{ value: 'Phút', position: 'bottom' }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={chartStyle} />
                    <Area type="monotone" dataKey="viewers" stroke="#6366f1" fill="url(#retGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-500 text-center py-12">Chưa có dữ liệu</p>}
            </div>

            {/* Exit Distribution */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Exit Time Distribution</h3>
              {stats.exitDistribution?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.exitDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="exit_minute" stroke="#6b7280" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={chartStyle} />
                    <Bar dataKey="count" fill="#ef4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-500 text-center py-12">Chưa có dữ liệu</p>}
            </div>
          </div>

          {/* Event Breakdown */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Event Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(stats.eventBreakdown || []).map((e, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-gray-400 truncate">{e.event_type}</p>
                  <p className="text-xl font-bold text-white mt-1">{e.count}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!selectedWebinar && !loading && (
        <div className="text-center py-20">
          <BarChart3 size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">Chọn một webinar để xem analytics</p>
        </div>
      )}
    </div>
  );
}
