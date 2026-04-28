import { useState, useEffect } from 'react';
import { Search, Users } from 'lucide-react';
import api from '../lib/api';

export default function AttendeesPage() {
  const [attendees, setAttendees] = useState([]);
  const [webinars, setWebinars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [wFilter, setWFilter] = useState('');

  useEffect(() => { loadData(); }, [wFilter]);

  const loadData = async () => {
    try {
      const [a, w] = await Promise.all([
        api.get('/attendees', { params: { webinarId: wFilter || undefined, search: search || undefined } }),
        api.get('/webinars'),
      ]);
      setAttendees(a.data.attendees || []);
      setWebinars(w.data.webinars || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { const t = setTimeout(loadData, 300); return () => clearTimeout(t); }, [search]);

  const statusMap = {
    registered: 'badge-info', joined: 'badge-primary', watching: 'badge-success',
    completed: 'badge-success', dropped: 'badge-danger',
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Người tham gia</h1>
          <p className="page-subtitle">Quản lý attendees từ tất cả webinar</p>
        </div>
        <span className="badge badge-primary" style={{ fontSize: 12, padding: '5px 14px' }}>{attendees.length} người</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 380 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên, email, SĐT..."
            className="input-field" style={{ paddingLeft: 40 }} />
        </div>
        <select value={wFilter} onChange={(e) => setWFilter(e.target.value)}
          className="input-field" style={{ width: 'auto', minWidth: 200 }}>
          <option value="">Tất cả webinar</option>
          {webinars.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Webinar</th><th>Trạng thái</th><th>Check-in</th></tr></thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>{Array(6).fill(0).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>)}</tr>
                ))
              ) : attendees.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Users size={24} style={{ color: 'var(--text-muted)' }} /></div>
                    <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Chưa có người tham gia</p>
                  </div>
                </td></tr>
              ) : attendees.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.full_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{a.email}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{a.phone || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.webinar_title}</td>
                  <td><span className={`badge badge-dot ${statusMap[a.status] || 'badge-info'}`}>{a.status}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.checked_in_at ? new Date(a.checked_in_at).toLocaleString('vi') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
