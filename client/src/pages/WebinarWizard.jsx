import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Upload, Video, Calendar, MessageSquare, Bell, Rocket } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const STEPS = [
  { icon: Video, label: 'Thông tin' },
  { icon: Video, label: 'Video' },
  { icon: Calendar, label: 'Lịch phát' },
  { icon: MessageSquare, label: 'Chat Script' },
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

  useEffect(() => {
    if (id) loadWebinar();
  }, [id]);

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

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const saveWebinar = async () => {
    setLoading(true);
    try {
      if (webinarId) {
        await api.patch(`/webinars/${webinarId}`, form);
      } else {
        const { data } = await api.post('/webinars', form);
        setWebinarId(data.webinar.id);
      }
      toast.success('Đã lưu!');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lỗi lưu');
      return false;
    } finally { setLoading(false); }
  };

  const uploadChat = async () => {
    if (!chatFile || !webinarId) return;
    const fd = new FormData();
    fd.append('file', chatFile);
    try {
      const { data } = await api.post(`/webinars/${webinarId}/chat-script`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Upload ${data.count} tin nhắn thành công!`);
    } catch (err) { toast.error('Lỗi upload chat script'); }
  };

  const uploadSeeding = async () => {
    if (!seedFile || !webinarId) return;
    const fd = new FormData();
    fd.append('file', seedFile);
    try {
      const { data } = await api.post(`/webinars/${webinarId}/seeding-notifications`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Upload ${data.count} notifications thành công!`);
    } catch (err) { toast.error('Lỗi upload seeding'); }
  };

  const nextStep = async () => {
    if (step === 0 && !form.title) return toast.error('Vui lòng nhập tiêu đề');
    if (step <= 2) {
      const ok = await saveWebinar();
      if (!ok) return;
    }
    if (step === 3 && chatFile) await uploadChat();
    if (step === 4 && seedFile) await uploadSeeding();
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const publish = async () => {
    setLoading(true);
    try {
      await api.patch(`/webinars/${webinarId}`, { ...form, status: 'published' });
      toast.success('Webinar đã được xuất bản!');
      navigate('/webinars');
    } catch (err) { toast.error('Lỗi xuất bản'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/webinars')} className="p-2 rounded-lg hover:bg-white/5 text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-white">{id ? 'Chỉnh sửa Webinar' : 'Tạo Webinar mới'}</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              i === step ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
              i < step ? 'text-green-400' : 'text-gray-500'
            }`} onClick={() => i < step && setStep(i)}>
              {i < step ? <Check size={16} /> : <s.icon size={16} />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`w-4 lg:w-8 h-px mx-1 ${i < step ? 'bg-green-500' : 'bg-gray-700'}`} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="glass-card p-8">
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Thông tin webinar</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Tiêu đề *</label>
              <input value={form.title} onChange={(e) => updateField('title', e.target.value)} className="input-field" placeholder="Webinar của bạn..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Mô tả</label>
              <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} className="input-field min-h-[120px] resize-y" placeholder="Mô tả chi tiết..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Display Threshold</label>
              <input type="number" value={form.displayThreshold} onChange={(e) => updateField('displayThreshold', +e.target.value)} className="input-field w-32" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Link Video</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Loại video</label>
              <div className="flex gap-3">
                {['mp4', 'youtube', 'vimeo'].map((type) => (
                  <button key={type} onClick={() => updateField('videoType', type)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      form.videoType === type ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-gray-400 border border-gray-700'
                    }`}>
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">URL Video *</label>
              <input value={form.videoUrl} onChange={(e) => updateField('videoUrl', e.target.value)} className="input-field" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Thời lượng (giây)</label>
              <input type="number" value={form.durationSeconds} onChange={(e) => updateField('durationSeconds', +e.target.value)} className="input-field w-40" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Lịch phát</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { value: 'on_demand', label: 'On-Demand', desc: 'Xem bất cứ lúc nào' },
                { value: 'recurring', label: 'Recurring', desc: 'Lặp theo lịch' },
                { value: 'jit', label: 'Just-In-Time', desc: 'Bắt đầu sớm nhất' },
              ].map((opt) => (
                <button key={opt.value} onClick={() => updateField('scheduleType', opt.value)}
                  className={`p-4 rounded-xl text-left transition-all ${
                    form.scheduleType === opt.value ? 'bg-indigo-500/20 border-indigo-500/50 border' : 'bg-white/5 border border-gray-700'
                  }`}>
                  <p className={`text-sm font-bold ${form.scheduleType === opt.value ? 'text-indigo-400' : 'text-gray-300'}`}>{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
            {form.scheduleType === 'jit' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">JIT Window (phút)</label>
                  <input type="number" value={form.jitWindow} onChange={(e) => updateField('jitWindow', +e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">JIT Rounding (phút)</label>
                  <input type="number" value={form.jitRounding} onChange={(e) => updateField('jitRounding', +e.target.value)} className="input-field" />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Chat Script</h2>
            <p className="text-gray-400 text-sm">Upload file Excel/CSV với các cột: time_offset, name, message, role, color, pin, pin_duration</p>
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-2xl cursor-pointer hover:border-indigo-500/50 transition-colors">
              <Upload size={32} className="text-gray-400 mb-2" />
              <p className="text-sm text-gray-300 font-semibold">{chatFile ? chatFile.name : 'Chọn file Excel/CSV'}</p>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => setChatFile(e.target.files[0])} />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Seeding Notifications</h2>
            <p className="text-gray-400 text-sm">Upload file Excel/CSV với các cột: time_offset, customer_name, content</p>
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-2xl cursor-pointer hover:border-indigo-500/50 transition-colors">
              <Upload size={32} className="text-gray-400 mb-2" />
              <p className="text-sm text-gray-300 font-semibold">{seedFile ? seedFile.name : 'Chọn file Excel/CSV'}</p>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => setSeedFile(e.target.files[0])} />
            </label>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 inline-block">
              <Rocket size={48} className="text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Sẵn sàng xuất bản!</h2>
            <div className="text-left space-y-3 max-w-md mx-auto">
              <div className="flex justify-between p-3 rounded-xl bg-white/5"><span className="text-gray-400">Tiêu đề</span><span className="text-white font-semibold">{form.title}</span></div>
              <div className="flex justify-between p-3 rounded-xl bg-white/5"><span className="text-gray-400">Video</span><span className="text-white font-semibold">{form.videoType?.toUpperCase()}</span></div>
              <div className="flex justify-between p-3 rounded-xl bg-white/5"><span className="text-gray-400">Lịch phát</span><span className="text-white font-semibold">{form.scheduleType}</span></div>
              <div className="flex justify-between p-3 rounded-xl bg-white/5"><span className="text-gray-400">Chat Script</span><span className="text-white font-semibold">{chatFile ? '✅ Đã upload' : '❌ Chưa có'}</span></div>
              <div className="flex justify-between p-3 rounded-xl bg-white/5"><span className="text-gray-400">Seeding</span><span className="text-white font-semibold">{seedFile ? '✅ Đã upload' : '❌ Chưa có'}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate('/webinars')}
          className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} /> {step > 0 ? 'Quay lại' : 'Hủy'}
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={nextStep} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? 'Đang lưu...' : 'Tiếp theo'} <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={publish} disabled={loading} className="btn-primary flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500">
            {loading ? 'Đang xuất bản...' : '🚀 Xuất bản Webinar'}
          </button>
        )}
      </div>
    </div>
  );
}
