import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Link2, Trash2, Edit, Video, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function WebinarsPage() {
  const [webinars, setWebinars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => { loadWebinars(); }, []);

  const loadWebinars = async () => {
    try {
      const { data } = await api.get('/webinars');
      setWebinars(data.webinars || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const deleteWebinar = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa webinar này?')) return;
    try {
      await api.delete(`/webinars/${id}`);
      toast.success('Đã xóa webinar');
      loadWebinars();
    } catch (err) { toast.error('Lỗi xóa webinar'); }
  };

  const copyShareLink = (roomCode) => {
    const url = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(url);
    toast.success('Đã copy link!');
  };

  const filtered = webinars.filter(w => 
    w.title?.toLowerCase().includes(search.toLowerCase()) || 
    w.room_code?.includes(search)
  );

  const scheduleLabels = { on_demand: 'On-Demand', recurring: 'Recurring', jit: 'Just-In-Time' };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Webinars</h1>
          <p className="text-gray-400 mt-1">Quản lý tất cả webinar của bạn</p>
        </div>
        <button onClick={() => navigate('/webinars/new')} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Tạo Webinar
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm webinar..."
          className="input-field pl-11" />
      </div>

      {/* Webinar Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Video size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">Chưa có webinar nào</p>
          <button onClick={() => navigate('/webinars/new')} className="btn-primary mt-4">Tạo webinar đầu tiên</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((w) => (
            <div key={w.id} className="glass-card overflow-hidden group hover:border-indigo-500/40 transition-all">
              {/* Thumbnail */}
              <div className="h-40 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 relative flex items-center justify-center">
                {w.thumbnail_url ? (
                  <img src={w.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Video size={40} className="text-indigo-400" />
                )}
                <span className={`absolute top-3 right-3 badge ${w.status === 'published' ? 'badge-success' : 'badge-warning'}`}>
                  {w.status === 'published' ? '● Live' : '○ Nháp'}
                </span>
              </div>
              
              {/* Content */}
              <div className="p-5">
                <h3 className="text-base font-bold text-white truncate">{w.title}</h3>
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{w.description || 'Không có mô tả'}</p>
                
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="badge badge-info text-xs">{scheduleLabels[w.schedule_type] || w.schedule_type}</span>
                  <span>🔗 {w.room_code}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-800">
                  <button onClick={() => navigate(`/webinars/${w.id}/edit`)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                    <Edit size={14} /> Sửa
                  </button>
                  <button onClick={() => copyShareLink(w.room_code)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-semibold text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                    <Copy size={14} /> Copy Link
                  </button>
                  <a href={`/room/${w.room_code}`} target="_blank" className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors">
                    <ExternalLink size={16} />
                  </a>
                  <button onClick={() => deleteWebinar(w.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
