import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Video, Users, BarChart3, Settings, Shield,
  LogOut, Menu, X, ChevronLeft, ChevronRight, Zap, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

const LOGO_FULL = 'https://storage.googleapis.com/msgsndr/ZvTjUqBlrPvdA6D95vnu/media/68b44dd274ce1f13bc15f3ef.png';
const AVATAR_DEFAULT = 'https://storage.googleapis.com/msgsndr/ZvTjUqBlrPvdA6D95vnu/media/68b45aa9ee3c10815523bcd0.jpeg';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1200 && window.innerWidth >= 1024) setCollapsed(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

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
    ...(isSuperAdmin ? [{ to: '/admin', icon: Shield, label: 'Quản trị hệ thống' }] : []),
  ];

  const SidebarContent = ({ isMobile = false }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{
        padding: collapsed && !isMobile ? '16px 12px' : '16px 20px',
        borderBottom: `1px solid var(--sidebar-border)`,
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
        minHeight: 60,
      }}>
        {(!collapsed || isMobile) ? (
          <img src={LOGO_FULL} alt="Ai Webinar" style={{ height: 28, objectFit: 'contain' }} />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} color="white" />
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="btn-icon"><X size={20} /></button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to} to={item.to} end={item.end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: collapsed && !isMobile ? '10px 0' : '10px 14px',
                justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                borderRadius: 'var(--radius-md)',
                fontSize: 13.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                background: isActive ? 'var(--nav-active-bg)' : 'transparent',
                textDecoration: 'none',
                transition: 'all var(--transition-fast)',
              })}
              onMouseEnter={(e) => {
                if (e.currentTarget.getAttribute('aria-current') !== 'page')
                  e.currentTarget.style.background = 'var(--nav-hover-bg)';
              }}
              onMouseLeave={(e) => {
                if (e.currentTarget.getAttribute('aria-current') !== 'page')
                  e.currentTarget.style.background = 'transparent';
              }}
            >
              <item.icon size={18} style={{ flexShrink: 0 }} />
              {(!collapsed || isMobile) && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Theme Toggle + Collapse */}
      <div style={{ padding: '8px', borderTop: `1px solid var(--sidebar-border)` }}>
        {/* Theme Toggle */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
          padding: collapsed && !isMobile ? '6px 0' : '6px 10px',
          marginBottom: 4,
        }}>
          {(!collapsed || isMobile) && (
            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500 }}>
              {isDark ? 'Giao diện tối' : 'Giao diện sáng'}
            </span>
          )}
          <button onClick={toggle} className="theme-toggle" title={isDark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}>
            <div className="theme-toggle-knob">
              {isDark ? <Moon size={10} color="white" /> : <Sun size={10} color="white" />}
            </div>
          </button>
        </div>

        {/* Collapse Toggle (desktop only) */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="btn-icon"
            style={{ width: '100%', justifyContent: 'center', padding: 8 }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* User */}
      <div style={{
        padding: collapsed && !isMobile ? '12px 8px' : '12px 16px',
        borderTop: `1px solid var(--sidebar-border)`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
          marginBottom: 10,
        }}>
          <img
            src={user.avatarUrl || AVATAR_DEFAULT} alt=""
            style={{
              width: 34, height: 34, borderRadius: 10, objectFit: 'cover',
              border: '2px solid var(--avatar-border)', flexShrink: 0,
            }}
          />
          {(!collapsed || isMobile) && (
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.fullName || 'User'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </p>
            </div>
          )}
        </div>
        <button onClick={handleLogout} className="btn-icon" style={{
          width: '100%', gap: 8, fontSize: 12.5, color: 'var(--text-dim)',
          justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
          padding: '8px 12px',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--badge-bg-danger)'; e.currentTarget.style.color = 'var(--accent-rose)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-dim)'; }}
        >
          <LogOut size={15} />
          {(!collapsed || isMobile) && <span>Đăng xuất</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Desktop Sidebar */}
      <aside style={{
        width: collapsed ? 68 : 250, flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: `1px solid var(--sidebar-border)`,
        transition: 'width var(--transition-normal)',
        display: 'none',
      }} className="sidebar-desktop">
        <SidebarContent />
      </aside>
      <style>{`@media(min-width:1024px){.sidebar-desktop{display:flex!important;flex-direction:column}}`}</style>

      {/* Mobile Header */}
      <div className="mobile-header" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 56,
        background: 'var(--sidebar-bg)', borderBottom: `1px solid var(--sidebar-border)`,
      }}>
        <img src={LOGO_FULL} alt="Ai Webinar" style={{ height: 24 }} />
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button onClick={toggle} className="theme-toggle" style={{ transform: 'scale(0.9)' }}>
            <div className="theme-toggle-knob">
              {isDark ? <Moon size={9} color="white" /> : <Sun size={9} color="white" />}
            </div>
          </button>
          <button onClick={() => setMobileOpen(true)} className="btn-icon"><Menu size={22} /></button>
        </div>
      </div>
      <style>{`@media(min-width:1024px){.mobile-header{display:none!important}}`}</style>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileOpen(false)} />
          <aside style={{
            position: 'relative', width: 280,
            background: 'var(--sidebar-bg)', borderRight: `1px solid var(--sidebar-border)`,
            display: 'flex', flexDirection: 'column',
          }} className="animate-slideIn">
            <SidebarContent isMobile={true} />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} className="main-content">
        <div style={{ padding: '28px 32px', maxWidth: 1340, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
      <style>{`@media(max-width:1023px){.main-content{padding-top:56px!important}}`}</style>
      <style>{`@media(max-width:768px){.main-content>div{padding:20px 16px!important}}`}</style>
    </div>
  );
}
