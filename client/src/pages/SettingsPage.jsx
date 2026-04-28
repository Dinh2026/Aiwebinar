import { useState, useEffect } from 'react';
import { Settings, User, Key, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ghlConfig, setGhlConfig] = useState({ apiKey: '', locationId: '', enabled: false });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      setSettings(data.settings);
      const ghl = data.integrations?.find(i => i.provider === 'gohighlevel');
      if (ghl) {
        const config = typeof ghl.config_encrypted === 'string' ? JSON.parse(ghl.config_encrypted) : ghl.config_encrypted || {};
        setGhlConfig({ apiKey: config.apiKey || '', locationId: config.locationId || '', enabled: ghl.enabled });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const saveGHL = async () => {
    try {
      await api.patch('/settings/integrations/gohighlevel', { config: { apiKey: ghlConfig.apiKey, locationId: ghlConfig.locationId }, enabled: ghlConfig.enabled });
      toast.success('Đã lưu cấu hình GoHighLevel');
    } catch (err) { toast.error('Lỗi lưu'); }
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-8 animate-fadeIn max-w-3xl">
      <h1 className="text-3xl font-bold text-white">Cài đặt</h1>

      {/* Account */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><User size={20} className="text-indigo-400" /> Tài khoản</h2>
        <div className="flex items-center gap-4 mb-6">
          <img src={settings?.avatar_url || 'https://storage.googleapis.com/msgsndr/ZvTjUqBlrPvdA6D95vnu/media/68b45aa9ee3c10815523bcd0.jpeg'}
               alt="" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-indigo-500/30" />
          <div>
            <p className="text-lg font-bold text-white">{settings?.full_name || settings?.name}</p>
            <p className="text-sm text-gray-400">{settings?.email}</p>
            <span className="badge badge-primary mt-2">{settings?.plan?.toUpperCase() || 'PRO'}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Tên workspace</label>
            <input value={settings?.name || ''} readOnly className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Domain Prefix</label>
            <input value={settings?.domain_prefix || ''} readOnly className="input-field" />
          </div>
        </div>
      </div>

      {/* GoHighLevel */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Globe size={20} className="text-cyan-400" /> GoHighLevel Integration</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={ghlConfig.enabled} onChange={(e) => setGhlConfig(p => ({...p, enabled: e.target.checked}))}
              className="w-5 h-5 rounded accent-indigo-500" />
            <span className="text-sm text-gray-300 font-semibold">Bật gửi contact khi check-in</span>
          </label>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">API Key</label>
            <input type="password" value={ghlConfig.apiKey} onChange={(e) => setGhlConfig(p => ({...p, apiKey: e.target.value}))}
              className="input-field" placeholder="Bearer token..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Location ID</label>
            <input value={ghlConfig.locationId} onChange={(e) => setGhlConfig(p => ({...p, locationId: e.target.value}))}
              className="input-field" placeholder="Location ID..." />
          </div>
          <button onClick={saveGHL} className="btn-primary">Lưu cấu hình</button>
        </div>
      </div>

      {/* Security */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Key size={20} className="text-amber-400" /> Bảo mật</h2>
        <p className="text-sm text-gray-400 mb-4">Đổi mật khẩu tài khoản</p>
        <button className="btn-secondary" onClick={() => toast('Tính năng đổi mật khẩu sẽ được cập nhật')}>Đổi mật khẩu</button>
      </div>
    </div>
  );
}
