import { useState, useEffect } from 'react';
import { Video, Users, Eye, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '../lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await api.get('/analytics/overview');
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0 phút';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} phút`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="skeleton h-80 rounded-2xl mt-6" />
      </div>
    );
  }

  const statCards = [
    { label: 'Tổng Webinars', value: stats?.totalWebinars || 0, icon: Video, color: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-500/10' },
    { label: 'Tổng Attendees', value: stats?.totalAttendees || 0, icon: Users, color: 'from-cyan-500 to-teal-500', bg: 'bg-cyan-500/10' },
    { label: 'Tổng Sessions', value: stats?.totalSessions || 0, icon: Eye, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10' },
    { label: 'Tổng Xem', value: formatDuration(stats?.totalWatchSeconds), icon: Clock, color: 'from-rose-500 to-pink-500', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Tổng quan</h1>
        <p className="text-gray-400 mt-1">
          Xin chào, <span className="text-indigo-400 font-semibold">{user.fullName}</span> 👋
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.bg}`}>
                <card.icon size={22} className="text-white" />
              </div>
              <TrendingUp size={16} className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-3xl font-bold text-white">{card.value}</p>
            <p className="text-sm text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Attendees Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-400" />
            Attendees 7 ngày gần nhất
          </h3>
          {stats?.dailyAttendees?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats.dailyAttendees}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} tickFormatter={(v) => new Date(v).toLocaleDateString('vi')} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#f9fafb' }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              <p>Chưa có dữ liệu</p>
            </div>
          )}
        </div>

        {/* Recent Webinars */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Video size={20} className="text-cyan-400" />
            Webinars gần đây
          </h3>
          {stats?.recentWebinars?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentWebinars.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{w.title}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(w.created_at).toLocaleDateString('vi')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className={`badge ${w.status === 'published' ? 'badge-success' : 'badge-warning'}`}>
                      {w.status === 'published' ? 'Live' : 'Nháp'}
                    </span>
                    <span className="text-sm font-semibold text-indigo-400">{w.attendee_count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              <p>Chưa có webinar nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
