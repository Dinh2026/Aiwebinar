import { useState, useEffect } from 'react';
import { User, Globe, Key, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ghl, setGhl] = useState({ apiKey: '', locationId: '', enabled: false });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      setSettings(data.settings);
      const g = data.integrations?.find(i => i.provider === 'gohighlevel');
      if (g) {
        const c = typeof g.config_encrypted === 'string' ? JSON.parse(g.config_encrypted) : g.config_encrypted || {};
        setGhl({ apiKey: c.apiKey || '', locationId: c.locationId || '', enabled: g.enabled });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const saveGHL = async () => {
    try {
      await api.patch('/settings/integrations/gohighlevel', { config: { apiKey: ghl.apiKey, locationId: ghl.locationId }, enabled: ghl.enabled });
      toast.success('Đã lưu cấu hình GoHighLevel');
    } catch (err) { toast.error('Lỗi lưu'); }
  };

  if (loading) return (
    <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
    </div>
  );

  return (
    <div style={{ maxWidth: 640 }} className="animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Cài đặt</h1>
        <p className="page-subtitle">Cấu hình tài khoản và tích hợp</p>
      </div>

      {/* Account */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
        <h2 className="section-title"><User size={15} style={{ color: 'var(--accent-primary-light)' }} /> Tài khoản</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <img src={settings?.avatar_url || 'https://storage.googleapis.com/msgsndr/ZvTjUqBlrPvdA6D95vnu/media/68b45aa9ee3c10815523bcd0.jpeg'}
            alt="" style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'cover', border: '2px solid var(--border-subtle)' }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{settings?.full_name || settings?.name}</p>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{settings?.email}</p>
            <span className="badge badge-primary" style={{ marginTop: 4 }}>{settings?.plan?.toUpperCase() || 'PRO'}</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label className="input-label">Tên workspace</label><input value={settings?.name || ''} readOnly className="input-field" /></div>
          <div><label className="input-label">Domain Prefix</label><input value={settings?.domain_prefix || ''} readOnly className="input-field" /></div>
        </div>
      </div>

      {/* GoHighLevel */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
        <h2 className="section-title"><Globe size={15} style={{ color: 'var(--accent-cyan)' }} /> GoHighLevel Integration</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={ghl.enabled} onChange={(e) => setGhl(p => ({...p, enabled: e.target.checked}))}
              style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)', borderRadius: 4 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Bật gửi contact khi check-in</span>
          </label>
          <div><label className="input-label">API Key</label>
            <input type="password" value={ghl.apiKey} onChange={(e) => setGhl(p => ({...p, apiKey: e.target.value}))} className="input-field" placeholder="Bearer token..." />
          </div>
          <div><label className="input-label">Location ID</label>
            <input value={ghl.locationId} onChange={(e) => setGhl(p => ({...p, locationId: e.target.value}))} className="input-field" placeholder="Location ID..." />
          </div>
          <button onClick={saveGHL} className="btn btn-primary" style={{ width: 'fit-content' }}>
            <Save size={14} /> Lưu cấu hình
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 className="section-title"><Key size={15} style={{ color: 'var(--accent-amber)' }} /> Bảo mật</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>Đổi mật khẩu tài khoản</p>
        <button className="btn btn-secondary" onClick={() => toast('Tính năng đổi mật khẩu sẽ được cập nhật')}>Đổi mật khẩu</button>
      </div>
    </div>
  );
}
