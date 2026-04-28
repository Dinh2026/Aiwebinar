import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Users, Video, BarChart3, X } from 'lucide-react';
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
      const [sa, st] = await Promise.all([api.get('/admin/sub-accounts'), api.get('/admin/stats')]);
      setSubAccounts(sa.data.subAccounts || []);
      setStats(st.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const create = async (e) => {
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

  const del = async (id) => {
    if (!confirm('Xóa sub-account này?')) return;
    try { await api.delete(`/admin/sub-accounts/${id}`); toast.success('Đã xóa'); loadData(); }
    catch (err) { toast.error('Lỗi xóa'); }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={22} style={{ color: 'var(--accent-primary-light)' }} /> Quản trị hệ thống
          </h1>
          <p className="page-subtitle">Super Admin — Quản lý sub-accounts & platform</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary"><Plus size={15} /> Tạo Sub-Account</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { l: 'Sub-Accounts', v: stats.totalSubAccounts || 0, icon: Users },
          { l: 'Webinars', v: stats.totalWebinars || 0, icon: Video },
          { l: 'Attendees', v: stats.totalAttendees || 0, icon: Users },
          { l: 'Sessions', v: stats.totalSessions || 0, icon: BarChart3 },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ padding: 18 }}>
            <s.icon size={16} style={{ color: 'var(--accent-primary-light)', marginBottom: 8 }} />
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{s.v}</p>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{s.l}</p>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={create} className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Tạo Sub-Account mới</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-icon"><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div><label className="input-label">Họ tên *</label><input value={form.fullName} onChange={(e) => setForm(p=>({...p, fullName: e.target.value}))} className="input-field" /></div>
            <div><label className="input-label">Email *</label><input value={form.email} onChange={(e) => setForm(p=>({...p, email: e.target.value}))} type="email" className="input-field" /></div>
            <div><label className="input-label">Mật khẩu *</label><input value={form.password} onChange={(e) => setForm(p=>({...p, password: e.target.value}))} type="password" className="input-field" /></div>
            <div><label className="input-label">Tên workspace *</label><input value={form.name} onChange={(e) => setForm(p=>({...p, name: e.target.value}))} className="input-field" /></div>
            <div><label className="input-label">Domain prefix</label><input value={form.domainPrefix} onChange={(e) => setForm(p=>({...p, domainPrefix: e.target.value}))} className="input-field" /></div>
            <div><label className="input-label">Plan</label>
              <select value={form.plan} onChange={(e) => setForm(p=>({...p, plan: e.target.value}))} className="input-field">
                <option value="pro">Pro</option><option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">Tạo Sub-Account</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">Hủy</button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Workspace</th><th>Chủ sở hữu</th><th>Email</th><th>Plan</th><th>Webinars</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                Array(3).fill(0).map((_, i) => <tr key={i}>{Array(7).fill(0).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16 }} /></td>)}</tr>)
              ) : subAccounts.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Users size={24} style={{ color: 'var(--text-muted)' }} /></div>
                    <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Chưa có sub-account</p>
                  </div>
                </td></tr>
              ) : subAccounts.map(sa => (
                <tr key={sa.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sa.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{sa.owner_name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{sa.owner_email}</td>
                  <td><span className="badge badge-primary">{sa.plan}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{sa.webinar_count || 0}</td>
                  <td><span className={`badge badge-dot ${sa.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{sa.status}</span></td>
                  <td><button onClick={() => del(sa.id)} className="btn-icon" style={{ color: 'var(--accent-rose)' }}><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
