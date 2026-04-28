import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Edit3, Video, Copy, ExternalLink, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function WebinarsPage() {
  const [webinars, setWebinars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => { loadWebinars(); }, []);

  const loadWebinars = async () => {
    try { const { data } = await api.get('/webinars'); setWebinars(data.webinars || []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const deleteWebinar = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa webinar này?')) return;
    try { await api.delete(`/webinars/${id}`); toast.success('Đã xóa webinar'); loadWebinars(); }
    catch (err) { toast.error('Lỗi xóa webinar'); }
  };

  const copyShareLink = (roomCode) => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
    toast.success('Đã copy link chia sẻ!');
  };

  const filtered = webinars.filter(w =>
    w.title?.toLowerCase().includes(search.toLowerCase()) ||
    w.room_code?.includes(search)
  );

  const scheduleLabels = { on_demand: 'On-Demand', recurring: 'Recurring', jit: 'Just-In-Time' };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Webinars</h1>
          <p className="page-subtitle">Quản lý tất cả webinar của bạn</p>
        </div>
        <button onClick={() => navigate('/webinars/new')} className="btn btn-primary">
          <Plus size={16} /> Tạo Webinar
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: 380, marginBottom: 24 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm webinar..."
          className="input-field"
          style={{ paddingLeft: 40 }}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 280, borderRadius: 20 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state glass-card" style={{ maxWidth: 460, margin: '0 auto' }}>
          <div className="empty-state-icon"><Video size={28} style={{ color: 'var(--text-muted)' }} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            {search ? 'Không tìm thấy kết quả' : 'Chưa có webinar nào'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            {search ? 'Thử tìm kiếm với từ khóa khác' : 'Tạo webinar đầu tiên để bắt đầu'}
          </p>
          {!search && (
            <button onClick={() => navigate('/webinars/new')} className="btn btn-primary">
              <Plus size={14} /> Tạo webinar đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filtered.map((w) => (
            <div key={w.id} className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Thumbnail */}
              <div style={{
                height: 160, position: 'relative',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {w.thumbnail_url ? (
                  <img src={w.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Video size={36} style={{ color: 'var(--accent-primary)', opacity: 0.5 }} />
                )}
                <span
                  className={`badge badge-dot ${w.status === 'published' ? 'badge-success' : 'badge-warning'}`}
                  style={{ position: 'absolute', top: 12, right: 12 }}
                >
                  {w.status === 'published' ? 'Live' : 'Nháp'}
                </span>
              </div>

              {/* Content */}
              <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{
                  fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4,
                }}>
                  {w.title}
                </h3>
                <p style={{
                  fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {w.description || 'Không có mô tả'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0, marginTop: 'auto' }}>
                  <span className="badge badge-info" style={{ fontSize: 10.5 }}>{scheduleLabels[w.schedule_type] || w.schedule_type}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>🔗 {w.room_code}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex', alignItems: 'center', borderTop: '1px solid var(--border-default)',
              }}>
                <button
                  onClick={() => navigate(`/webinars/${w.id}/edit`)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '11px 0', fontSize: 12.5, fontWeight: 600,
                    color: 'var(--text-muted)', background: 'transparent', border: 'none',
                    cursor: 'pointer', transition: 'color var(--transition-fast)', fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <Edit3 size={13} /> Sửa
                </button>
                <div style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
                <button
                  onClick={() => copyShareLink(w.room_code)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '11px 0', fontSize: 12.5, fontWeight: 600,
                    color: 'var(--accent-primary-light)', background: 'transparent', border: 'none',
                    cursor: 'pointer', transition: 'opacity var(--transition-fast)', fontFamily: 'inherit',
                  }}
                >
                  <Copy size={13} /> Copy Link
                </button>
                <div style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
                <a
                  href={`/room/${w.room_code}`} target="_blank"
                  className="btn-icon" style={{ padding: '11px 14px' }}
                >
                  <ExternalLink size={14} />
                </a>
                <div style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
                <button
                  onClick={() => deleteWebinar(w.id)}
                  className="btn-icon" style={{ padding: '11px 14px', color: 'var(--accent-rose)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
