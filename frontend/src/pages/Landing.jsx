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
  ChevronRight,
  TrendingUp,
  FileSpreadsheet
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
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-brand-200 selection:text-brand-900 transition-colors duration-300">
      
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/80 backdrop-blur-md border-b border-slate-800 shadow-sm py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-600/30">
              <Briefcase size={22} />
            </div>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight text-white leading-none">StaffHub</h1>
              <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest">HRMS</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-slate-300 hover:text-brand-400 transition-colors">Features</a>
            <a href="#ai" className="text-sm font-semibold text-slate-300 hover:text-brand-400 transition-colors">AI Assistant</a>
            <a href="#stats" className="text-sm font-semibold text-slate-300 hover:text-brand-400 transition-colors">Statistics</a>
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
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-900">
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center bg-fixed opacity-30" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/60 to-slate-950" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-wider mb-8 animate-fade-in backdrop-blur-md">
            <Sparkles size={14} /> The Future of HR Management
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight animate-fade-in" style={{ animationDelay: '100ms' }}>
            AI-Powered Employee &<br className="hidden md:block"/> Leave Management System
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-300 mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '200ms' }}>
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
              className="w-full sm:w-auto px-8 py-4 bg-slate-900/60 hover:bg-slate-800 backdrop-blur-md text-white border border-slate-700/50 text-base font-bold rounded-2xl shadow-sm transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Explore Features
            </a>
          </div>
        </div>

        {/* Floating Mockup Preview */}
        <div className="max-w-5xl mx-auto mt-20 px-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="p-2 md:p-4 rounded-3xl bg-slate-900/40 border border-slate-700/50 shadow-2xl backdrop-blur-xl">
            <div className="w-full aspect-[16/9] bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800 flex items-center justify-center">
              <div className="absolute inset-0 p-8 grid grid-cols-4 gap-6 opacity-40 pointer-events-none">
                <div className="col-span-1 border-r border-slate-800 space-y-4 pr-6">
                  <div className="h-8 w-2/3 bg-slate-800 rounded-lg" />
                  <div className="h-4 w-full bg-slate-800 rounded" />
                  <div className="h-4 w-5/6 bg-slate-800 rounded" />
                </div>
                <div className="col-span-3 space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="h-8 w-1/3 bg-slate-800 rounded-lg" />
                    <div className="h-10 w-10 bg-brand-500/20 rounded-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 bg-brand-500/20 rounded-xl" />
                    <div className="h-24 bg-emerald-500/20 rounded-xl" />
                    <div className="h-24 bg-amber-500/20 rounded-xl" />
                  </div>
                  <div className="h-64 bg-slate-800 rounded-xl" />
                </div>
              </div>
              <div className="z-10 bg-slate-900/90 backdrop-blur-md px-8 py-4 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-3 font-bold text-white">
                <Briefcase className="text-brand-500" /> Premium Dashboard Interface
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: Employee Management */}
      <section id="features" className="relative py-24 lg:py-32 overflow-hidden bg-slate-950 border-t border-slate-800">
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80')] bg-cover bg-center bg-fixed opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="h-14 w-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md border border-blue-500/20 shadow-xl">
                <Users size={28} />
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                Streamlined Employee Management
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Seamlessly manage your entire workforce. Keep track of employee records, profiles, roles, and department allocations all in one secure, centralized directory.
              </p>
              <ul className="space-y-4 text-slate-300">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-brand-500" size={20} /> Advanced search and filtering
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-brand-500" size={20} /> Secure role-based access control
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-brand-500" size={20} /> Comprehensive profile management
                </li>
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/30">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 font-bold">{i}</div>
                        <div>
                          <div className="h-4 w-24 bg-slate-600 rounded mb-2"></div>
                          <div className="h-3 w-16 bg-slate-700 rounded"></div>
                        </div>
                      </div>
                      <div className="h-8 w-20 bg-brand-500/20 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Leave Management */}
      <section className="relative py-24 lg:py-32 overflow-hidden bg-slate-950 border-t border-slate-800">
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80')] bg-cover bg-center bg-fixed opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/30 text-center">
                      <div className="text-2xl font-black text-white">12</div>
                      <div className="text-xs text-slate-400 mt-1 uppercase">Annual</div>
                    </div>
                    <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center">
                      <div className="text-2xl font-black text-emerald-400">Approved</div>
                      <div className="text-xs text-emerald-500/80 mt-1 uppercase">Status</div>
                    </div>
                 </div>
                 <div className="h-32 bg-slate-800/50 rounded-2xl border border-slate-700/30 flex items-center justify-center text-slate-500">
                   Leave Request Timeline
                 </div>
              </div>
            </div>
            <div>
              <div className="h-14 w-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md border border-emerald-500/20 shadow-xl">
                <Calendar size={28} />
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                Automated Leave Workflows
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Simplify time-off requests. Employees can easily apply for leaves, check balances, and managers can approve or reject with a single click.
              </p>
              <ul className="space-y-4 text-slate-300">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-500" size={20} /> Multi-tier approval system
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-500" size={20} /> Real-time balance tracking
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-500" size={20} /> Historical leave audit trails
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Reports & Analytics */}
      <section className="relative py-24 lg:py-32 overflow-hidden bg-slate-950 border-t border-slate-800">
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80')] bg-cover bg-center bg-fixed opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="h-14 w-14 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md border border-amber-500/20 shadow-xl">
                <TrendingUp size={28} />
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                Deep Insights & Analytics
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Make data-driven HR decisions. Generate instant visual reports on employee distribution, leave trends, and overall organizational health.
              </p>
              <ul className="space-y-4 text-slate-300">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-amber-500" size={20} /> Department distribution metrics
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-amber-500" size={20} /> Leave trend analysis
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-amber-500" size={20} /> Export data to Excel/CSV instantly
                </li>
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
                 <div className="h-48 bg-slate-800/50 rounded-2xl border border-slate-700/30 flex items-end justify-between p-6 mb-4">
                    {[40, 70, 45, 90, 65, 85].map((h, i) => (
                      <div key={i} className="w-8 bg-brand-500/80 rounded-t-lg transition-all" style={{ height: `${h}%` }}></div>
                    ))}
                 </div>
                 <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="text-emerald-500" />
                      <span className="font-semibold text-white">Q3_Leave_Report.xlsx</span>
                    </div>
                    <span className="text-xs text-slate-400 font-bold bg-slate-700 px-3 py-1 rounded-full">Exported</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Showcase Section */}
      <section id="ai" className="relative py-24 lg:py-32 overflow-hidden bg-slate-950 border-t border-slate-800">
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80')] bg-cover bg-center bg-fixed opacity-15"
        />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              {/* Chat UI Mockup */}
              <div className="bg-slate-900/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-slate-700/60 max-w-md mx-auto shadow-2xl relative">
                <div className="absolute -top-6 -left-6 h-20 w-20 bg-brand-500/20 blur-2xl rounded-full" />
                <div className="absolute -bottom-6 -right-6 h-20 w-20 bg-indigo-500/20 blur-2xl rounded-full" />
                
                <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-4">
                  <div className="h-12 w-12 bg-gradient-to-tr from-brand-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                    <Bot size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Nova AI Assistant</h4>
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
                    <div className="h-8 w-8 bg-gradient-to-tr from-brand-500 to-indigo-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-md">
                      <Bot size={16} />
                    </div>
                    <div className="bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm shadow-sm backdrop-blur-md">
                      I've drafted a sick leave application for tomorrow. Would you like me to submit it?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[85%] shadow-md">
                      "Show my leave balance"
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 w-8 bg-gradient-to-tr from-brand-500 to-indigo-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-md">
                      <Bot size={16} />
                    </div>
                    <div className="bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm shadow-sm backdrop-blur-md">
                      You currently have 14 days of Annual Leave and 5 days of Sick Leave remaining.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-md">
                <Bot size={14} /> Meet Nova
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                Your personal HR assistant, always ready to help.
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Interact with the system using natural language. Nova understands intent and can execute complex operations instantly, saving you time and reducing friction.
              </p>

              <div className="space-y-4">
                {['"Approve John\'s leave request"', '"Download employee leave report"', '"Create a new employee profile"'].map((cmd, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 backdrop-blur-sm">
                    <Mic className="text-brand-500" size={20} />
                    <span className="font-semibold text-slate-300 italic">{cmd}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="stats" className="relative py-24 lg:py-32 bg-slate-950 border-t border-slate-800 overflow-hidden">
        {/* Background Image & Gradient */}
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-5 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
              Trusted By Growing Organizations
            </h2>
            <p className="text-lg text-slate-400">
              Intelligent workforce management powered by AI.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="text-4xl md:text-5xl font-black mb-3 text-white tracking-tight">10k+</div>
              <div className="text-slate-400 font-semibold text-xs uppercase tracking-widest">Employees Managed</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="text-4xl md:text-5xl font-black mb-3 text-white tracking-tight">50k+</div>
              <div className="text-slate-400 font-semibold text-xs uppercase tracking-widest">Leave Requests</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="text-4xl md:text-5xl font-black mb-3 text-white tracking-tight">100+</div>
              <div className="text-slate-400 font-semibold text-xs uppercase tracking-widest">Reports Generated</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="text-4xl md:text-5xl font-black mb-3 text-white tracking-tight">1M+</div>
              <div className="text-slate-400 font-semibold text-xs uppercase tracking-widest">AI Actions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 border-t border-slate-800 overflow-hidden bg-slate-950">
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-5"
        />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-600/20">
                <Briefcase size={16} />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">StaffHub HRMS</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm font-medium">
              <span className="text-slate-500">Built With:</span>
              <span className="text-slate-300">React</span>
              <span className="text-slate-300">Node.js</span>
              <span className="text-slate-300">MongoDB</span>
              <span className="text-slate-300 flex items-center gap-1"><Sparkles size={12} className="text-brand-500" /> AI Engine</span>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-800 text-sm text-center md:text-left flex flex-col md:flex-row justify-between items-center text-slate-500">
            <p>&copy; {new Date().getFullYear()} StaffHub HRMS. All rights reserved.</p>
            <p className="mt-2 md:mt-0 font-semibold text-slate-400">Premium Enterprise Edition</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
