import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Video, Users, BarChart3, Settings, Shield, LogOut, Menu, X, ChevronRight } from 'lucide-react';

const LOGO_URL = 'https://storage.googleapis.com/msgsndr/ZvTjUqBlrPvdA6D95vnu/media/68b44dd274ce1f13bc15f3ef.png';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Tổng quan', end: true },
    { to: '/webinars', icon: Video, label: 'Webinars' },
    { to: '/attendees', icon: Users, label: 'Người tham gia' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/settings', icon: Settings, label: 'Cài đặt' },
    ...(isSuperAdmin ? [{ to: '/admin', icon: Shield, label: 'Quản trị' }] : []),
  ];

  const NavItem = ({ item }) => (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
          isActive
            ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-indigo-400 border border-indigo-500/30'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`
      }
    >
      <item.icon size={20} />
      {sidebarOpen && <span>{item.label}</span>}
    </NavLink>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0e1a]">
      {/* Sidebar Desktop */}
      <aside className={`hidden lg:flex flex-col border-r border-gray-800 bg-[#0d1117] transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          {sidebarOpen && <img src={LOGO_URL} alt="Ai Webinar" className="h-8 object-contain" />}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400">
            {sidebarOpen ? <ChevronRight size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => <NavItem key={item.to} item={item} />)}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <img src={user.avatarUrl || 'https://storage.googleapis.com/msgsndr/ZvTjUqBlrPvdA6D95vnu/media/68b45aa9ee3c10815523bcd0.jpeg'} 
                 alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/30" />
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.fullName || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={16} />
            {sidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-[#0d1117] border-b border-gray-800">
        <img src={LOGO_URL} alt="Ai Webinar" className="h-7" />
        <button onClick={() => setMobileOpen(true)} className="p-2 text-gray-400"><Menu size={24} /></button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0d1117] p-4 flex flex-col animate-slideIn">
            <div className="flex items-center justify-between mb-6">
              <img src={LOGO_URL} alt="Ai Webinar" className="h-7" />
              <button onClick={() => setMobileOpen(false)} className="p-2 text-gray-400"><X size={20} /></button>
            </div>
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => <NavItem key={item.to} item={item} />)}
            </nav>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10">
              <LogOut size={18} /><span>Đăng xuất</span>
            </button>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
