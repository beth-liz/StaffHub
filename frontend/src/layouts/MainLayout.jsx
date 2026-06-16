import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications } from '../services/api';
import { 
  LayoutDashboard, 
  Users, 
  Menu, 
  X, 
  Briefcase, 
  Clock,
  LogOut,
  Bell,
  CalendarPlus,
  History,
  User,
  Settings,
  ShieldCheck,
  Moon,
  Sun,
  Cpu
} from 'lucide-react';
import AIAssistant from '../components/AIAssistant';

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' || 
    document.documentElement.classList.contains('dark')
  );

  // Apply dark class on mount based on local storage
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Sync unread notification count
  useEffect(() => {
    if (user) {
      const fetchUnreadCount = async () => {
        try {
          const res = await getNotifications();
          if (res.success) {
            setUnreadNotifications(res.unreadCount);
          }
        } catch (err) {
          console.error(err);
        }
      };

      fetchUnreadCount();
      // Poll notifications count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Listen for AI-triggered dark mode toggle
  useEffect(() => {
    const handleAIToggle = (e) => {
      const { enabled } = e.detail;
      setDarkMode(enabled);
      if (enabled) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    };
    
    window.addEventListener('staffhub:toggleDarkMode', handleAIToggle);
    return () => window.removeEventListener('staffhub:toggleDarkMode', handleAIToggle);
  }, []);

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // NavLink styling helper
  const linkClass = ({ isActive }) => 
    `flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group text-xs font-semibold ${
      isActive 
        ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' 
        : 'text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-200 hover:bg-slate-800/60'
    }`;

  // Role-based Nav Items
  const navItems = user.role === 'Admin' 
    ? [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Employee Directory', path: '/employees', icon: Users },
        { name: 'Leave Approvals', path: '/leaves', icon: History },
        { name: 'System Logs', path: '/audit-logs', icon: ShieldCheck },
        { name: 'AI Assistant Logs', path: '/ai-history', icon: Cpu },
        { name: 'Notifications', path: '/notifications', icon: Bell, badge: true },
        { name: 'Portal Settings', path: '/settings', icon: Settings },
      ]
    : [
        { name: 'My Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Apply For Leave', path: '/leaves/apply', icon: CalendarPlus },
        { name: 'My Leave History', path: '/leaves', icon: History },
        { name: 'My Profile', path: '/profile', icon: User },
        { name: 'Notifications', path: '/notifications', icon: Bell, badge: true },
        { name: 'Preferences', path: '/settings', icon: Settings },
      ];

  const initials = `${user.firstName?.[0] || 'E'}${user.lastName?.[0] || 'A'}`.toUpperCase();
  const avatarSrc = user.profilePhoto 
    ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${user.profilePhoto}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-200">
      
      {/* --- Sidebar Desktop --- */}
      <aside className="hidden md:flex flex-col w-64 glass-sidebar p-5 fixed top-0 bottom-0 z-30 select-none">
        <div className="flex items-center gap-2.5 px-2 py-4 mb-8">
          <div className="h-9 w-9 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-lg tracking-wide leading-none">StaffHub</h1>
            <span className="text-xs font-semibold text-brand-400 tracking-wider uppercase">Portal</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} className={linkClass}>
                <span className="flex items-center gap-3">
                  <Icon size={16} className="group-hover:scale-110 transition-transform duration-200" />
                  {item.name}
                </span>
                {item.badge && unreadNotifications > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                    {unreadNotifications}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1.5">
            {avatarSrc ? (
              <img src={avatarSrc} alt={user.name} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-red-500/10 hover:text-red-400 transition-colors text-xs font-semibold"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      {/* --- Sidebar Mobile Drawer --- */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setSidebarOpen(false)}
          />

          <aside className="relative flex flex-col w-64 glass-sidebar p-5 h-full animate-fade-in select-none">
            <div className="flex items-center justify-between px-2 py-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-brand-500 rounded-lg flex items-center justify-center text-white">
                  <Briefcase size={18} />
                </div>
                <h1 className="font-extrabold text-white text-md tracking-wide">StaffHub</h1>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink 
                    key={item.path} 
                    to={item.path} 
                    className={linkClass}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={16} />
                      {item.name}
                    </span>
                    {item.badge && unreadNotifications > 0 && (
                      <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                        {unreadNotifications}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-3 px-2 py-1.5">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={user.name} className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-semibold"
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* --- Main Workspace --- */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
            >
              <Menu size={20} />
            </button>
            
            {/* Clock Widget */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3.5 py-1.5 rounded-full border border-slate-100 dark:border-slate-800/60">
              <Clock size={12} className="text-brand-500" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 select-none">
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleDarkMode}
              className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-805 rounded-xl border border-slate-100 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 transition-colors"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Profile Info */}
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800 dark:text-white leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-400 mt-1">{user.designation}</p>
            </div>
            
            {/* Short Avatar */}
            {avatarSrc ? (
              <img src={avatarSrc} alt={user.name} className="h-9 w-9 rounded-xl object-cover border border-slate-200 dark:border-slate-800" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-brand-500/10">
                {initials}
              </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full animate-fade-in text-slate-800 dark:text-slate-200">
          {children}
        </main>
      </div>
      <AIAssistant />
    </div>
  );
};

export default MainLayout;
