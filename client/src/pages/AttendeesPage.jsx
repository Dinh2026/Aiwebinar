import { useState, useEffect } from 'react';
import { Search, Users, Download, Filter } from 'lucide-react';
import api from '../lib/api';

export default function AttendeesPage() {
  const [attendees, setAttendees] = useState([]);
  const [webinars, setWebinars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [webinarFilter, setWebinarFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [webinarFilter]);

  const loadData = async () => {
    try {
      const [attRes, webRes] = await Promise.all([
        api.get('/attendees', { params: { webinarId: webinarFilter || undefined, search: search || undefined } }),
        api.get('/webinars'),
      ]);
      setAttendees(attRes.data.attendees || []);
      setWebinars(webRes.data.webinars || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const statusColors = {
    registered: 'badge-info', joined: 'badge-primary', watching: 'badge-success',
    completed: 'badge-success', dropped: 'badge-danger',
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Người tham gia</h1>
          <p className="text-gray-400 mt-1">Quản lý attendees từ tất cả webinar</p>
        </div>
        <span className="badge badge-primary">{attendees.length} người</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên, email, SĐT..."
            className="input-field pl-11" />
        </div>
        <select value={webinarFilter} onChange={(e) => setWebinarFilter(e.target.value)}
          className="input-field w-auto min-w-[200px]">
          <option value="">Tất cả webinar</option>
          {webinars.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Họ tên</th><th>Email</th><th>SĐT</th><th>Webinar</th><th>Trạng thái</th><th>Check-in</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>{Array(6).fill(0).map((_, j) => <td key={j}><div className="skeleton h-4 w-full" /></td>)}</tr>
                ))
              ) : attendees.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  Chưa có người tham gia
                </td></tr>
              ) : (
                attendees.map((a) => (
                  <tr key={a.id}>
                    <td className="font-semibold text-white">{a.full_name}</td>
                    <td className="text-gray-300">{a.email}</td>
                    <td className="text-gray-300">{a.phone || '—'}</td>
                    <td className="text-gray-400 text-sm">{a.webinar_title}</td>
                    <td><span className={`badge ${statusColors[a.status] || 'badge-info'}`}>{a.status}</span></td>
                    <td className="text-gray-400 text-sm">{a.checked_in_at ? new Date(a.checked_in_at).toLocaleString('vi') : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
