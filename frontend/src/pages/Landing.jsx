import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Briefcase, 
  ArrowRight, 
  Users, 
  Calendar, 
  Mic, 
  BarChart3,
  Bot,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 selection:bg-brand-200 selection:text-brand-900 transition-colors duration-300">
      
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-600/30">
              <Briefcase size={22} />
            </div>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white leading-none">StaffHub</h1>
              <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest">HRMS v2</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition-colors">Features</a>
            <a href="#ai" className="text-sm font-semibold text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition-colors">AI Assistant</a>
            <a href="#stats" className="text-sm font-semibold text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition-colors">Statistics</a>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              to="/login"
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand-600/25 transition-all hover:-translate-y-0.5"
            >
              Login to Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Orbs */}
        <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider mb-8 animate-fade-in">
            <Sparkles size={14} /> The Future of HR Management
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8 leading-tight animate-fade-in" style={{ animationDelay: '100ms' }}>
            AI-Powered Employee &<br className="hidden md:block"/> Leave Management System
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '200ms' }}>
            Manage employees, automate complex leave workflows, generate instant reports, and interact seamlessly using intelligent voice commands.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <Link 
              to="/login"
              className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white text-base font-bold rounded-2xl shadow-xl shadow-brand-600/25 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Sign In to Workspace <ArrowRight size={18} />
            </Link>
            <a 
              href="#features"
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 text-base font-bold rounded-2xl shadow-sm transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Explore Features
            </a>
          </div>
        </div>

        {/* Floating Mockup Preview */}
        <div className="max-w-5xl mx-auto mt-20 px-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="glass-card p-2 md:p-4 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-white/60 dark:border-slate-700/50 shadow-2xl">
            <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-700/50 flex items-center justify-center">
              {/* Abstract Dashboard Representation */}
              <div className="absolute inset-0 p-8 grid grid-cols-4 gap-6 opacity-50 pointer-events-none">
                <div className="col-span-1 border-r border-slate-300 dark:border-slate-600 space-y-4 pr-6">
                  <div className="h-8 w-2/3 bg-slate-300 dark:bg-slate-600 rounded-lg" />
                  <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-4/6 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="col-span-3 space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="h-8 w-1/3 bg-slate-300 dark:bg-slate-600 rounded-lg" />
                    <div className="h-10 w-10 bg-brand-500/30 rounded-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 bg-brand-500/20 rounded-xl" />
                    <div className="h-24 bg-emerald-500/20 rounded-xl" />
                    <div className="h-24 bg-amber-500/20 rounded-xl" />
                  </div>
                  <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                </div>
              </div>
              <div className="z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-8 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-slate-800 dark:text-white">
                <Briefcase className="text-brand-500" /> Premium Dashboard Interface
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Everything you need to manage your team</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">A comprehensive suite of tools designed to streamline HR operations and empower employees.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-8 hover:-translate-y-1 transition-transform dark:bg-slate-800/50">
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Employee Management</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Seamlessly manage employee records, organizational profiles, and department allocations all in one place.
              </p>
            </div>

            <div className="glass-card p-8 hover:-translate-y-1 transition-transform dark:bg-slate-800/50">
              <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                <Calendar size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Leave Management</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Apply, track, and approve leave requests through an intuitive, automated approval workflow system.
              </p>
            </div>

            <div className="glass-card p-8 hover:-translate-y-1 transition-transform dark:bg-slate-800/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3">
                <span className="bg-brand-500 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full">New</span>
              </div>
              <div className="h-12 w-12 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mb-6">
                <Mic size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">AI Voice Assistant</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Interact with the HR system hands-free. Perform complex actions and queries using intelligent voice commands.
              </p>
            </div>

            <div className="glass-card p-8 hover:-translate-y-1 transition-transform dark:bg-slate-800/50">
              <div className="h-12 w-12 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-2xl flex items-center justify-center mb-6">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Reports & Analytics</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Generate instant visual reports on employee distribution, leave trends, and overall organizational health.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Showcase Section */}
      <section id="ai" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              {/* Chat UI Mockup */}
              <div className="glass-card p-6 md:p-8 rounded-3xl dark:bg-slate-800/80 max-w-md mx-auto shadow-2xl relative">
                <div className="absolute -top-6 -left-6 h-20 w-20 bg-brand-500/20 blur-2xl rounded-full" />
                <div className="absolute -bottom-6 -right-6 h-20 w-20 bg-indigo-500/20 blur-2xl rounded-full" />
                
                <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-slate-700 pb-4">
                  <div className="h-12 w-12 bg-gradient-to-tr from-brand-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Bot size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Nova AI Assistant</h4>
                    <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-end">
                    <div className="bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[85%] shadow-md">
                      "Apply for sick leave tomorrow"
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 w-8 bg-gradient-to-tr from-brand-500 to-indigo-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 mt-1">
                      <Bot size={16} />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm shadow-sm">
                      I've drafted a sick leave application for tomorrow. Would you like me to submit it?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[85%] shadow-md">
                      "Show my leave balance"
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 w-8 bg-gradient-to-tr from-brand-500 to-indigo-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 mt-1">
                      <Bot size={16} />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm shadow-sm">
                      You currently have 14 days of Annual Leave and 5 days of Sick Leave remaining.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6">
                <Bot size={14} /> Meet Nova
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
                Your personal HR assistant, always ready to help.
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Interact with the system using natural language. Nova understands intent and can execute complex operations instantly, saving you time and reducing friction.
              </p>

              <div className="space-y-4">
                {['"Approve John\'s leave request"', '"Download employee leave report"', '"Create a new employee profile"'].map((cmd, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-500" size={20} />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 italic">{cmd}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="stats" className="py-20 bg-brand-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-50" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-black mb-2 tracking-tight">10k+</div>
              <div className="text-brand-100 font-semibold text-sm uppercase tracking-wider">Employees Managed</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black mb-2 tracking-tight">50k+</div>
              <div className="text-brand-100 font-semibold text-sm uppercase tracking-wider">Leave Requests Processed</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black mb-2 tracking-tight">100+</div>
              <div className="text-brand-100 font-semibold text-sm uppercase tracking-wider">Reports Generated</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black mb-2 tracking-tight">1M+</div>
              <div className="text-brand-100 font-semibold text-sm uppercase tracking-wider">AI Actions Executed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
                <Briefcase size={16} />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">StaffHub HRMS v2</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm font-medium">
              <span>Built With:</span>
              <span className="text-slate-300">React</span>
              <span className="text-slate-300">Node.js</span>
              <span className="text-slate-300">MongoDB</span>
              <span className="text-slate-300">AI Engine</span>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-800 text-sm text-center md:text-left flex flex-col md:flex-row justify-between items-center">
            <p>&copy; {new Date().getFullYear()} StaffHub HRMS. All rights reserved.</p>
            <p className="mt-2 md:mt-0 text-slate-500">Premium Enterprise Edition</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
