import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Users, Video, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function AdminPage() {
  const [subAccounts, setSubAccounts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', name: '', domainPrefix: '', plan: 'pro' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [saRes, statsRes] = await Promise.all([
        api.get('/admin/sub-accounts'),
        api.get('/admin/stats'),
      ]);
      setSubAccounts(saRes.data.subAccounts || []);
      setStats(statsRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createSubAccount = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password || !form.name) return toast.error('Điền đầy đủ thông tin');
    try {
      await api.post('/admin/sub-accounts', form);
      toast.success('Tạo sub-account thành công!');
      setShowCreate(false);
      setForm({ fullName: '', email: '', password: '', name: '', domainPrefix: '', plan: 'pro' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Lỗi tạo'); }
  };

  const deleteSubAccount = async (id) => {
    if (!confirm('Xóa sub-account này?')) return;
    try {
      await api.delete(`/admin/sub-accounts/${id}`);
      toast.success('Đã xóa');
      loadData();
    } catch (err) { toast.error('Lỗi xóa'); }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Shield size={28} className="text-indigo-400" /> Quản trị hệ thống</h1>
          <p className="text-gray-400 mt-1">Super Admin — Quản lý sub-accounts</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Tạo Sub-Account
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sub-Accounts', value: stats.totalSubAccounts || 0, icon: Users },
          { label: 'Webinars', value: stats.totalWebinars || 0, icon: Video },
          { label: 'Attendees', value: stats.totalAttendees || 0, icon: Users },
          { label: 'Sessions', value: stats.totalSessions || 0, icon: BarChart3 },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <s.icon size={18} className="text-indigo-400 mb-2" />
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={createSubAccount} className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Tạo Sub-Account mới</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input value={form.fullName} onChange={(e) => setForm(p=>({...p, fullName: e.target.value}))} placeholder="Họ tên chủ tài khoản" className="input-field" />
            <input value={form.email} onChange={(e) => setForm(p=>({...p, email: e.target.value}))} placeholder="Email" type="email" className="input-field" />
            <input value={form.password} onChange={(e) => setForm(p=>({...p, password: e.target.value}))} placeholder="Mật khẩu" type="password" className="input-field" />
            <input value={form.name} onChange={(e) => setForm(p=>({...p, name: e.target.value}))} placeholder="Tên workspace" className="input-field" />
            <input value={form.domainPrefix} onChange={(e) => setForm(p=>({...p, domainPrefix: e.target.value}))} placeholder="Domain prefix" className="input-field" />
            <select value={form.plan} onChange={(e) => setForm(p=>({...p, plan: e.target.value}))} className="input-field">
              <option value="pro">Pro</option><option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary">Tạo</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Hủy</button>
          </div>
        </form>
      )}

      {/* Sub-Accounts Table */}
      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr><th>Tên</th><th>Chủ sở hữu</th><th>Email</th><th>Plan</th><th>Webinars</th><th>Attendees</th><th>Trạng thái</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              Array(3).fill(0).map((_, i) => <tr key={i}>{Array(8).fill(0).map((_, j) => <td key={j}><div className="skeleton h-4" /></td>)}</tr>)
            ) : subAccounts.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500">Chưa có sub-account</td></tr>
            ) : (
              subAccounts.map((sa) => (
                <tr key={sa.id}>
                  <td className="font-semibold text-white">{sa.name}</td>
                  <td className="text-gray-300">{sa.owner_name}</td>
                  <td className="text-gray-400">{sa.owner_email}</td>
                  <td><span className="badge badge-primary">{sa.plan}</span></td>
                  <td className="text-gray-300">{sa.webinar_count || 0}</td>
                  <td className="text-gray-300">{sa.attendee_count || 0}</td>
                  <td><span className={`badge ${sa.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{sa.status}</span></td>
                  <td><button onClick={() => deleteSubAccount(sa.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
