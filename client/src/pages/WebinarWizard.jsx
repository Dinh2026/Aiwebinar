import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Upload, Video, Calendar, MessageSquare, Bell, Rocket, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const STEPS = [
  { icon: Video, label: 'Thông tin' },
  { icon: Video, label: 'Video' },
  { icon: Calendar, label: 'Lịch phát' },
  { icon: MessageSquare, label: 'Chat' },
  { icon: Bell, label: 'Seeding' },
  { icon: Rocket, label: 'Xuất bản' },
];

export default function WebinarWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', displayThreshold: 0, videoType: 'mp4', videoUrl: '',
    thumbnailUrl: '', scheduleType: 'on_demand', rrule: '', jitWindow: 15, jitRounding: 5,
    ctaEnabled: false, ctaText: '', ctaUrl: '', ctaTimeSeconds: 0, durationSeconds: 0,
  });
  const [chatFile, setChatFile] = useState(null);
  const [seedFile, setSeedFile] = useState(null);
  const [webinarId, setWebinarId] = useState(id || null);

  useEffect(() => { if (id) loadWebinar(); }, [id]);

  const loadWebinar = async () => {
    try {
      const { data } = await api.get(`/webinars/${id}`);
      const w = data.webinar;
      setForm({
        title: w.title || '', description: w.description || '', displayThreshold: w.display_threshold || 0,
        videoType: w.video_type || 'mp4', videoUrl: w.video_url || '', thumbnailUrl: w.thumbnail_url || '',
        scheduleType: w.schedule_type || 'on_demand', rrule: w.rrule || '', jitWindow: w.jit_window || 15,
        jitRounding: w.jit_rounding || 5, ctaEnabled: w.cta_enabled, ctaText: w.cta_text || '',
        ctaUrl: w.cta_url || '', ctaTimeSeconds: w.cta_time_seconds || 0, durationSeconds: w.duration_seconds || 0,
      });
    } catch (err) { toast.error('Lỗi tải webinar'); }
  };

  const u = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const saveWebinar = async () => {
    setLoading(true);
    try {
      if (webinarId) { await api.patch(`/webinars/${webinarId}`, form); }
      else { const { data } = await api.post('/webinars', form); setWebinarId(data.webinar.id); }
      toast.success('Đã lưu!');
      return true;
    } catch (err) { toast.error(err.response?.data?.error || 'Lỗi lưu'); return false; }
    finally { setLoading(false); }
  };

  const uploadFile = async (type, file) => {
    if (!file || !webinarId) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data } = await api.post(`/webinars/${webinarId}/${type}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Upload ${data.count} items thành công!`);
    } catch (err) { toast.error(`Lỗi upload ${type}`); }
  };

  const nextStep = async () => {
    if (step === 0 && !form.title) return toast.error('Vui lòng nhập tiêu đề');
    if (step <= 2) { if (!(await saveWebinar())) return; }
    if (step === 3 && chatFile) await uploadFile('chat-script', chatFile);
    if (step === 4 && seedFile) await uploadFile('seeding-notifications', seedFile);
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const publish = async () => {
    setLoading(true);
    try {
      await api.patch(`/webinars/${webinarId}`, { ...form, status: 'published' });
      toast.success('🚀 Webinar đã xuất bản!');
      navigate('/webinars');
    } catch (err) { toast.error('Lỗi xuất bản'); }
    finally { setLoading(false); }
  };

  const FieldGroup = ({ label, children, hint }) => (
    <div style={{ marginBottom: 18 }}>
      <label className="input-label">{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{hint}</p>}
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="animate-fadeIn">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/webinars')} className="btn-icon"><ArrowLeft size={18} /></button>
        <h1 className="page-title" style={{ fontSize: 20 }}>{id ? 'Chỉnh sửa Webinar' : 'Tạo Webinar mới'}</h1>
      </div>

      {/* Step Progress */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        marginBottom: 28, padding: '14px 16px',
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
      }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => i < step && setStep(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 'var(--radius-md)',
                border: 'none', cursor: i <= step ? 'pointer' : 'default',
                background: i === step ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: i < step ? 'var(--accent-emerald)' : i === step ? 'var(--accent-primary-light)' : 'var(--text-dim)',
                fontSize: 12, fontWeight: i === step ? 700 : 500, fontFamily: 'inherit',
                transition: 'all var(--transition-fast)',
              }}
            >
              {i < step ? <Check size={13} /> : <s.icon size={13} />}
              <span className="step-label-text">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 16, height: 1.5, margin: '0 2px',
                background: i < step ? 'var(--accent-emerald)' : 'var(--border-default)',
                borderRadius: 1,
              }} />
            )}
          </div>
        ))}
        <style>{`@media(max-width:640px){.step-label-text{display:none}}`}</style>
      </div>

      {/* Step Content */}
      <div className="glass-card" style={{ padding: '28px 28px 24px' }}>
        {step === 0 && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Thông tin webinar</h2>
            <FieldGroup label="Tiêu đề *">
              <input value={form.title} onChange={(e) => u('title', e.target.value)} className="input-field" placeholder="Tên webinar..." />
            </FieldGroup>
            <FieldGroup label="Mô tả">
              <textarea value={form.description} onChange={(e) => u('description', e.target.value)}
                className="input-field" style={{ minHeight: 100, resize: 'vertical' }} placeholder="Mô tả chi tiết..." />
            </FieldGroup>
            <FieldGroup label="Display Threshold" hint="Số người xem ảo hiển thị trong phòng">
              <input type="number" value={form.displayThreshold} onChange={(e) => u('displayThreshold', +e.target.value)}
                className="input-field" style={{ width: 140 }} />
            </FieldGroup>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Link Video</h2>
            <FieldGroup label="Loại video">
              <div style={{ display: 'flex', gap: 8 }}>
                {['mp4', 'youtube', 'vimeo'].map(t => (
                  <button key={t} onClick={() => u('videoType', t)} style={{
                    padding: '8px 18px', borderRadius: 'var(--radius-md)', border: 'none',
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    background: form.videoType === t ? 'rgba(99,102,241,0.15)' : 'var(--bg-elevated)',
                    color: form.videoType === t ? 'var(--accent-primary-light)' : 'var(--text-muted)',
                    transition: 'all var(--transition-fast)',
                  }}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </FieldGroup>
            <FieldGroup label="URL Video *">
              <input value={form.videoUrl} onChange={(e) => u('videoUrl', e.target.value)} className="input-field" placeholder="https://..." />
            </FieldGroup>
            <FieldGroup label="Thời lượng (giây)">
              <input type="number" value={form.durationSeconds} onChange={(e) => u('durationSeconds', +e.target.value)}
                className="input-field" style={{ width: 160 }} />
            </FieldGroup>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Lịch phát</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
              {[
                { v: 'on_demand', l: 'On-Demand', d: 'Xem bất cứ lúc nào' },
                { v: 'recurring', l: 'Recurring', d: 'Lặp theo lịch' },
                { v: 'jit', l: 'Just-In-Time', d: 'Bắt đầu sớm nhất' },
              ].map(o => (
                <button key={o.v} onClick={() => u('scheduleType', o.v)} style={{
                  padding: '16px', borderRadius: 'var(--radius-lg)', textAlign: 'left',
                  border: form.scheduleType === o.v ? '1.5px solid var(--accent-primary)' : '1.5px solid var(--border-default)',
                  background: form.scheduleType === o.v ? 'rgba(99,102,241,0.08)' : 'var(--bg-elevated)',
                  cursor: 'pointer', transition: 'all var(--transition-fast)',
                }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: form.scheduleType === o.v ? 'var(--accent-primary-light)' : 'var(--text-secondary)' }}>{o.l}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{o.d}</p>
                </button>
              ))}
            </div>
            {form.scheduleType === 'jit' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FieldGroup label="JIT Window (phút)">
                  <input type="number" value={form.jitWindow} onChange={(e) => u('jitWindow', +e.target.value)} className="input-field" />
                </FieldGroup>
                <FieldGroup label="JIT Rounding (phút)">
                  <input type="number" value={form.jitRounding} onChange={(e) => u('jitRounding', +e.target.value)} className="input-field" />
                </FieldGroup>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Chat Script</h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>
              Upload Excel/CSV: <code style={{ fontSize: 11, background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>time_offset, name, message, role, color, pin, pin_duration</code>
            </p>
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '40px 20px', border: '2px dashed var(--border-default)', borderRadius: 'var(--radius-lg)',
              cursor: 'pointer', transition: 'all var(--transition-fast)',
              background: chatFile ? 'rgba(99,102,241,0.05)' : 'transparent',
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
            >
              <Upload size={28} style={{ color: chatFile ? 'var(--accent-primary-light)' : 'var(--text-dim)', marginBottom: 8 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: chatFile ? 'var(--accent-primary-light)' : 'var(--text-muted)' }}>
                {chatFile ? `✅ ${chatFile.name}` : 'Chọn file Excel/CSV'}
              </p>
              <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => setChatFile(e.target.files[0])} />
            </label>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Seeding Notifications</h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>
              Upload Excel/CSV: <code style={{ fontSize: 11, background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>time_offset, customer_name, content</code>
            </p>
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '40px 20px', border: '2px dashed var(--border-default)', borderRadius: 'var(--radius-lg)',
              cursor: 'pointer', transition: 'all var(--transition-fast)',
              background: seedFile ? 'rgba(99,102,241,0.05)' : 'transparent',
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
            >
              <Upload size={28} style={{ color: seedFile ? 'var(--accent-primary-light)' : 'var(--text-dim)', marginBottom: 8 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: seedFile ? 'var(--accent-primary-light)' : 'var(--text-muted)' }}>
                {seedFile ? `✅ ${seedFile.name}` : 'Chọn file Excel/CSV'}
              </p>
              <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => setSeedFile(e.target.files[0])} />
            </label>
          </div>
        )}

        {step === 5 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 'var(--radius-xl)', margin: '0 auto 16px',
              background: 'var(--gradient-card)', border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Rocket size={28} style={{ color: 'var(--accent-primary-light)' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Sẵn sàng xuất bản!</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Xem lại thông tin trước khi publish</p>
            <div style={{ textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
              {[
                ['Tiêu đề', form.title],
                ['Video', form.videoType?.toUpperCase()],
                ['Lịch phát', form.scheduleType],
                ['Chat Script', chatFile ? '✅ Đã upload' : '⚪ Chưa có'],
                ['Seeding', seedFile ? '✅ Đã upload' : '⚪ Chưa có'],
              ].map(([label, val], i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: i % 2 === 0 ? 'rgba(148,163,184,0.04)' : 'transparent',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nav Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate('/webinars')} className="btn btn-secondary">
          <ArrowLeft size={15} /> {step > 0 ? 'Quay lại' : 'Hủy'}
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={nextStep} disabled={loading} className="btn btn-primary">
            {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {loading ? 'Đang lưu...' : 'Tiếp theo'} <ArrowRight size={15} />
          </button>
        ) : (
          <button onClick={publish} disabled={loading} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }}>
            {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Rocket size={15} />}
            {loading ? 'Đang xuất bản...' : 'Xuất bản Webinar'}
          </button>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
