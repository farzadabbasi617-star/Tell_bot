import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  Play,
  Square,
  Download,
  Search,
  Menu,
  X,
  Bell,
  MessageSquare,
  ShieldCheck,
  Zap,
  Activity,
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  Key,
  TrendingUp,
  FileText
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

/* ───────── Mock Fallback Data ───────── */
const chartData = [
  { name: 'شنبه', count: 400 },
  { name: 'یکشنبه', count: 600 },
  { name: 'دوشنبه', count: 900 },
  { name: 'سه‌شنبه', count: 1200 },
  { name: 'چهارشنبه', count: 1500 },
  { name: 'پنجشنبه', count: 2100 },
  { name: 'جمعه', count: 2400 },
];

const fallbackMembers = [
  { id: 1, username: '@alex_dev', name: 'Alex Johnson', status: 'Active', joined: '2026-06-27' },
  { id: 2, username: '@sarah_k', name: 'Sarah King', status: 'Recently Seen', joined: '2026-06-27' },
  { id: 3, username: '@mike_ross', name: 'Michael Ross', status: 'Offline', joined: '2026-06-26' },
  { id: 4, username: '@emma_w', name: 'Emma Wilson', status: 'Active', joined: '2026-06-26' },
  { id: 5, username: '@alireza_tg', name: 'علیرضا محمدی', status: 'Active', joined: '2026-06-27' },
];

const fallbackProxies = [
  { id: 1, host: '192.168.1.1', port: '8080', status: 'Online', type: 'HTTP', location: '🇺🇸 USA', latency: '42ms' },
  { id: 2, host: '172.16.0.45', port: '1080', status: 'Online', type: 'SOCKS5', location: '🇩🇪 Germany', latency: '35ms' },
];

const fallbackAccounts = [
  { id: 1, phone: '+1 234 ••• 7890', name: 'ربات اسکرپر اصلی #1', status: 'Active', load: 45 },
  { id: 2, phone: '+98 912 ••• 3456', name: 'اکانت کمکی ادد ممبر', status: 'Active', load: 15 },
];

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // App States
  const [isScraping, setIsScraping] = useState(false);
  const [groupUrl, setGroupUrl] = useState('');
  const [speedMode, setSpeedMode] = useState('سریع (متعادل)');
  const [filterMode, setFilterMode] = useState('همه اعضا');
  
  // Backend / Data States
  const [stats, setStats] = useState({ total_members: 12482, active_accounts: 2, target_groups: 48, safety_score: '98%' });
  const [logs, setLogs] = useState<{ id: number; time: string; msg: string; type: string }[]>([
    { id: 1, time: '13:20:01', msg: 'پنل مدیریت تحت وب آماده شد.', type: 'info' },
    { id: 2, time: '13:20:05', msg: 'منتظر ورود لینک گروه تلگرام برای شروع اسکرپ...', type: 'warning' }
  ]);
  const [members, setMembers] = useState(fallbackMembers);
  const [accounts, setAccounts] = useState(fallbackAccounts);
  const [proxies, setProxies] = useState(fallbackProxies);
  const [settings, setSettings] = useState({ api_id: '', api_hash: '', bot_token: '', auto_export: true, stealth_mode: false });

  // Polling Backend API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes, memRes, accRes, proxRes, setRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/logs'),
          fetch('/api/members'),
          fetch('/api/accounts'),
          fetch('/api/proxies'),
          fetch('/api/settings')
        ]);

        if (statsRes.ok) {
          const st = await statsRes.json();
          setStats(st);
          setIsScraping(st.is_scraping || false);
          setIsAdding(st.is_adding || false);
        }
        if (logsRes.ok) {
          const lg = await logsRes.json();
          if (lg && lg.length > 0) setLogs(lg);
        }
        if (memRes.ok) {
          const mm = await memRes.json();
          if (mm && mm.members && mm.members.length > 0) {
            setMembers(mm.members.map((m: any) => ({
              id: m.id,
              username: m.username,
              name: m.name,
              status: m.status,
              joined: m.scraped_at || 'امروز'
            })));
          }
        }
        if (accRes.ok) {
          const ac = await accRes.json();
          if (ac && ac.length > 0) setAccounts(ac);
        }
        if (proxRes.ok) {
          const pr = await proxRes.json();
          if (pr && pr.length > 0) setProxies(pr);
        }
        if (setRes.ok) {
          const se = await setRes.json();
          setSettings(se);
        }
      } catch (e) {
        // Fallback to local offline mode
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartScrape = async () => {
    if (!groupUrl) {
      setLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString('en-US',{hour12:false}), msg: 'خطا: لینک گروه تلگرام وارد نشده است.', type: 'error' }, ...prev]);
      return;
    }
    
    setIsScraping(true);
    setLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString('en-US',{hour12:false}), msg: `ارسال درخواست استخراج از ${groupUrl} به سرور...`, type: 'info' }, ...prev]);

    try {
      const res = await fetch('/api/scrape/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: groupUrl, speed: speedMode, filter: filterMode })
      });
      if (!res.ok) {
        const err = await res.json();
        setLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString('en-US',{hour12:false}), msg: `خطای بک‌اند: ${err.detail || 'خطا در شروع عملیات'}`, type: 'error' }, ...prev]);
        setIsScraping(false);
      }
    } catch (e) {
      // Offline simulation fallback
      setTimeout(() => setLogs(p => [{ id: Date.now(), time: new Date().toLocaleTimeString('en-US',{hour12:false}), msg: 'حالت آفلاین: شبیه‌سازی استخراج اعضا فعال شد...', type: 'success' }, ...p]), 800);
      setTimeout(() => setLogs(p => [{ id: Date.now(), time: new Date().toLocaleTimeString('en-US',{hour12:false}), msg: 'کاربر استخراج شد: علیرضا محمدی (@alireza_tg)', type: 'info' }, ...p]), 1800);
    }
  };

  const handleStopScrape = async () => {
    setIsScraping(false);
    try {
      await fetch('/api/scrape/stop', { method: 'POST' });
    } catch (e) {}
    setLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString('en-US',{hour12:false}), msg: 'دستور توقف اسکرپ توسط کاربر صادر شد.', type: 'warning' }, ...prev]);
  };

  const [isAdding, setIsAdding] = useState(false);

  const handleStartAdd = async (destGroup: string, count: number, delay: number) => {
    setIsAdding(true);
    setLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString('en-US',{hour12:false}), msg: `فرمان شروع ادد کردن ${count} کاربر از دیتابیس به ${destGroup}...`, type: 'info' }, ...prev]);
    try {
      const res = await fetch('/api/add_members/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_group: destGroup, count, delay })
      });
      if (!res.ok) {
        const err = await res.json();
        setLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString('en-US',{hour12:false}), msg: `خطا: ${err.detail || 'خطا در اجرای عملیات'}`, type: 'error' }, ...prev]);
        setIsAdding(false);
      }
    } catch(e) {
      setTimeout(() => setLogs(p => [{ id: Date.now(), time: new Date().toLocaleTimeString('en-US',{hour12:false}), msg: 'حالت آفلاین: شبیه‌سازی ادد کردن همگانی آغاز شد...', type: 'success' }, ...p]), 800);
    }
  };

  const handleStopAdd = async () => {
    setIsAdding(false);
    try { await fetch('/api/add_members/stop', { method: 'POST' }); } catch(e){}
    setLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString('en-US',{hour12:false}), msg: 'عملیات ادد کردن متوقف شد.', type: 'warning' }, ...prev]);
  };

  const handleExportCSV = () => {
    window.location.href = '/api/members/export';
  };

  const tabs = [
    { key: 'dashboard', label: 'داشبورد', icon: <LayoutDashboard size={20} /> },
    { key: 'scraper', label: 'اسکرپر زنده', icon: <Activity size={20} /> },
    { key: 'adder', label: 'ادد ممبر همگانی', icon: <Zap size={20} className="text-amber-400 animate-pulse" /> },
    { key: 'members', label: 'لیست اعضا', icon: <Users size={20} /> },
    { key: 'accounts', label: 'اکانت‌ها', icon: <Key size={20} /> },
    { key: 'proxies', label: 'پراکسی', icon: <Globe size={20} /> },
    { key: 'settings', label: 'تنظیمات API', icon: <SettingsIcon size={20} /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView stats={stats} />;
      case 'scraper': return <ScraperView groupUrl={groupUrl} setGroupUrl={setGroupUrl} isScraping={isScraping} onStart={handleStartScrape} onStop={handleStopScrape} logs={logs} speed={speedMode} setSpeed={setSpeedMode} filter={filterMode} setFilter={setFilterMode} />;
      case 'adder': return <BulkAdderView stats={stats} isAdding={isAdding} onStartAdd={handleStartAdd} onStopAdd={handleStopAdd} logs={logs} />;
      case 'members': return <MembersView members={members} onExport={handleExportCSV} total={stats.total_members} />;
      case 'accounts': return <AccountsView accounts={accounts} />;
      case 'proxies': return <ProxyView proxies={proxies} />;
      case 'settings': return <SettingsView settings={settings} setSettings={setSettings} />;
      default: return <DashboardView stats={stats} />;
    }
  };

  const currentTab = tabs.find(t => t.key === activeTab);

  return (
    <div className="flex h-screen bg-[#0a0f1e] text-slate-100 overflow-hidden font-sans select-none">
      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:static inset-y-0 right-0 z-50 flex flex-col bg-[#111827] border-l lg:border-l-0 lg:border-r border-white/5 transition-all duration-300 shrink-0 w-64 lg:w-60 shadow-2xl lg:shadow-none ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap size={20} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight whitespace-nowrap bg-gradient-to-l from-white to-slate-400 bg-clip-text text-transparent">TeleScrape</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {tabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 h-11 px-3.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <span className={active ? 'text-white' : 'text-slate-400'}>{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 text-xs text-slate-500 flex items-center justify-between">
          <span>وضعیت سرور</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> متصل
          </span>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 bg-[#111827]/80 backdrop-blur-md border-b border-white/5 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -mr-2 rounded-xl text-slate-300 hover:bg-white/10 active:scale-95 transition-all"
            >
              <Menu size={22} />
            </button>
            <span className="font-bold text-slate-200 text-base sm:text-lg">{currentTab?.label}</span>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
              <Bell size={19} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-2.5 bg-white/5 py-1 px-2 sm:px-3 rounded-full border border-white/5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold shadow-sm">
                AD
              </div>
              <span className="text-xs sm:text-sm font-medium hidden sm:block pr-1">مدیر سیستم</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="max-w-[1300px] mx-auto pb-12"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   VIEWS & SHARED COMPONENTS
   ═══════════════════════════════════════════ */
const PageHeader = ({ title, description, children }: any) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white/[0.02] p-4 sm:p-5 rounded-2xl border border-white/5">
    <div>
      <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">{title}</h1>
      <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">{description}</p>
    </div>
    {children && <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-auto w-full sm:w-auto">{children}</div>}
  </div>
);

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-[#111827] rounded-2xl border border-white/5 shadow-xl ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, value, change, icon, color }: any) => (
  <Card className="p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:border-white/10 hover:-translate-y-0.5">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${color}`}>
        {icon}
      </div>
      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
        change.startsWith('+') || change === 'Optimal' || change === 'Running' || change === 'برقرار' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      }`}>
        {change}
      </span>
    </div>
    <p className="text-xs sm:text-sm text-slate-400 font-medium">{title}</p>
    <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mt-1 tracking-tight">{value}</p>
  </Card>
);

const DashboardView = ({ stats }: any) => (
  <div className="space-y-6">
    <PageHeader title="داشبورد عملیاتی" description="نمای کلی عملکرد سرور اسکرپر و وضعیت استخراج اعضای تلگرام" />

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      <StatCard title="کل اعضای استخراج‌شده" value={stats.total_members.toLocaleString('fa-IR')} change="+12%" icon={<Users size={22} className="text-blue-400" />} color="bg-blue-500/10" />
      <StatCard title="نشست‌های فعال تلگرام" value={stats.active_accounts} change="برقرار" icon={<Activity size={22} className="text-emerald-400" />} color="bg-emerald-500/10" />
      <StatCard title="گروه‌های هدف اسکن شده" value={stats.target_groups} change="+5" icon={<MessageSquare size={22} className="text-purple-400" />} color="bg-purple-500/10" />
      <StatCard title="امتیاز ایمنی و ضد بلاک" value={stats.safety_score} change="Optimal" icon={<ShieldCheck size={22} className="text-amber-400" />} color="bg-amber-500/10" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="font-bold text-base sm:text-lg">نمودار رشد اعضا</h2>
            <p className="text-xs text-slate-400 mt-0.5">آمار استخراج اعضا در هفت روز گذشته</p>
          </div>
          <select className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none w-full sm:w-auto">
            <option>۷ روز اخیر</option>
            <option>۳۰ روز اخیر</option>
          </select>
        </div>
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4 sm:p-6 flex flex-col justify-between">
        <div>
          <h2 className="font-bold text-base sm:text-lg mb-4">رویدادهای اخیر سرور</h2>
          <div className="space-y-3">
            {[
              { text: 'بک‌اند پایتون متصل شد', sub: 'وب‌سرور FastAPI • هم‌اکنون', icon: <Zap size={16} /> },
              { text: 'پایگاه داده SQLite لود شد', sub: 'telescrape.db • چند دقیقه پیش', icon: <FileText size={16} /> },
              { text: 'آماده استخراج گروه جدید', sub: 'منتظر فرمان کاربر • آماده به کار', icon: <Users size={16} /> },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-200 truncate">{item.text}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  </div>
);

const ScraperView = ({ groupUrl, setGroupUrl, isScraping, onStart, onStop, logs, speed, setSpeed, filter, setFilter }: any) => (
  <div className="space-y-6">
    <PageHeader title="اسکرپر زنده تلگرام" description="لینک گروه تلگرام را وارد کنید و استخراج اعضا را شروع کنید" />

    <Card className="p-4 sm:p-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={groupUrl}
              onChange={e => setGroupUrl(e.target.value)}
              placeholder="https://t.me/target_group"
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dir-ltr text-left"
            />
          </div>
          <button
            onClick={isScraping ? onStop : onStart}
            className={`h-12 px-8 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shrink-0 shadow-lg active:scale-95 transition-all ${
              isScraping
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-red-600/30 animate-pulse'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30'
            }`}
          >
            {isScraping ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            {isScraping ? 'توقف عملیات' : 'شروع اسکرپ'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">سرعت اسکرپ</label>
            <select value={speed} onChange={e => setSpeed(e.target.value)} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs sm:text-sm text-slate-200 outline-none">
              <option className="bg-slate-900">محافظه‌کار (امن)</option>
              <option className="bg-slate-900">سریع (متعادل)</option>
              <option className="bg-slate-900">فوق‌العاده (پرریسک)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">فیلتر اعضا</label>
            <select value={filter} onChange={e => setFilter(e.target.value)} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs sm:text-sm text-slate-200 outline-none">
              <option className="bg-slate-900">همه اعضا</option>
              <option className="bg-slate-900">فعال در ۲۴ ساعت اخیر</option>
              <option className="bg-slate-900">فعال در هفته اخیر</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">فرمت خروجی</label>
            <select className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs sm:text-sm text-slate-200 outline-none">
              <option className="bg-slate-900">CSV (اکسل)</option>
              <option className="bg-slate-900">JSON</option>
            </select>
          </div>
        </div>
      </div>
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 overflow-hidden flex flex-col h-[320px]">
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/80 border-b border-white/5">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">کنسول زنده بک‌اند (Live Console)</span>
          <div className="flex gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto font-mono text-xs sm:text-sm space-y-2 bg-[#0d1322] custom-scrollbar text-left" dir="ltr">
          {logs.map((log: any) => (
            <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
              <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
              <span className={`shrink-0 font-bold ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'success' ? 'text-emerald-400' :
                log.type === 'warning' ? 'text-amber-400' :
                'text-blue-400'
              }`}>{log.type?.toUpperCase() || 'INFO'}:</span>
              <span className="text-slate-300 font-sans">{log.msg}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-6 flex flex-col justify-between shadow-xl text-white">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="font-extrabold text-lg">وضعیت پردازش</h3>
            <Activity className={isScraping ? "animate-spin text-blue-200" : "text-blue-200"} size={20} />
          </div>
          <p className="text-xs text-blue-100 mt-1">{isScraping ? 'در حال استخراج از سرور تلگرام' : 'سرور منتظر دستور'}</p>
        </div>

        <div className="my-6 space-y-5">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-blue-100 font-medium">پیشرفت کار</span>
              <span className="font-mono font-bold text-base">{isScraping ? 'در حال اجرا...' : 'آماده'}</span>
            </div>
            <div className="h-3 bg-black/20 rounded-full overflow-hidden p-0.5">
              <div className="h-full bg-white rounded-full transition-all duration-700 shadow-md" style={{ width: isScraping ? '75%' : '0%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const BulkAdderView = ({ stats, isAdding, onStartAdd, onStopAdd, logs }: any) => {
  const [destGroup, setDestGroup] = useState('');
  const [addCount, setAddCount] = useState(100);
  const [addDelay, setAddDelay] = useState(8);

  const handleRun = () => {
    if (!destGroup) return;
    onStartAdd(destGroup, addCount, addDelay);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="ادد ممبر همگانی از دیتابیس (Bulk Adder)" description="اعضای استخراج و ذخیره شده در پایگاه داده را به صورت خودکار و زمان‌بندی شده به گروه دلخواه خود اضافه کنید" />

      <Card className="p-5 sm:p-7 space-y-6 bg-gradient-to-br from-[#111827] to-[#1a2234]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2 md:col-span-1">
            <label className="text-xs sm:text-sm font-bold text-slate-200">لینک گروه مقصد (گروه خودتان)</label>
            <input type="text" placeholder="https://t.me/my_group_link" value={destGroup} onChange={e=>setDestGroup(e.target.value)} className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white dir-ltr text-left font-mono focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-slate-200">تعداد کاربر برای ادد کردن</label>
            <input type="number" value={addCount} onChange={e=>setAddCount(Number(e.target.value))} max={stats?.total_members || 10000} className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white font-mono" />
            <span className="text-[11px] text-slate-400 block">موجود در دیتابیس: {stats?.total_members?.toLocaleString('fa-IR')} نفر</span>
          </div>
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-slate-200">تأخیر بین هر ادد (ثانیه)</label>
            <input type="number" value={addDelay} onChange={e=>setAddDelay(Number(e.target.value))} min={2} max={60} className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white font-mono" />
            <span className="text-[11px] text-amber-400 block">پیشنهاد: ۸ تا ۱۲ ثانیه جهت جلوگیری از محدودیت</span>
          </div>
        </div>

        <button
          onClick={isAdding ? onStopAdd : handleRun}
          className={`w-full h-14 rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all ${
            isAdding
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white animate-pulse shadow-red-600/30'
              : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:opacity-95 text-white shadow-amber-600/30 font-black'
          }`}
        >
          {isAdding ? <Square size={20} fill="currentColor" /> : <Zap size={22} fill="currentColor" />}
          {isAdding ? 'توقف عملیات ادد کردن' : '🚀 شروع عملیات ادد ممبر از دیتابیس به گروه مقصد'}
        </button>
      </Card>

      <Card className="overflow-hidden flex flex-col h-[300px]">
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-white/5">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isAdding ? 'bg-amber-400 animate-ping' : 'bg-slate-500'}`} />
            کنسول زنده عملیات ادد ممبر
          </span>
        </div>
        <div className="p-4 flex-1 overflow-y-auto font-mono text-xs sm:text-sm space-y-2 bg-[#0d1322] custom-scrollbar text-left" dir="ltr">
          {logs.map((log: any) => (
            <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
              <span className="text-slate-600 shrink-0">[{log.time}]</span>
              <span className={`shrink-0 font-bold ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : 'text-blue-400'}`}>{log.type?.toUpperCase() || 'INFO'}:</span>
              <span className="text-slate-300 font-sans">{log.msg}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const MembersView = ({ members, onExport, total }: any) => (
  <div className="space-y-6">
    <PageHeader title="لیست اعضای استخراج‌شده" description={`تعداد کل اعضا در پایگاه داده: ${total.toLocaleString('fa-IR')} کاربر`}>
      <button onClick={onExport} className="w-full sm:w-auto h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
        <Download size={17} />
        دانلود فایل CSV (اکسل)
      </button>
    </PageHeader>

    <Card className="overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.03]">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 text-right">نام کاربر</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400">یوزرنیم</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400">وضعیت بازدید</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400">زمان ثبت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {members.map((m: any) => (
              <tr key={m.id} className="hover:bg-white/[0.02]">
                <td className="px-6 py-4 text-right font-semibold text-slate-200">{m.name}</td>
                <td className="px-6 py-4 text-blue-400 font-mono text-xs font-bold">{m.username}</td>
                <td className="px-6 py-4"><StatusBadge status={m.status} /></td>
                <td className="px-6 py-4 text-slate-400 text-xs font-mono">{m.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-white/5">
        {members.map((m: any) => (
          <div key={m.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-200 text-sm">{m.name}</p>
                <p className="text-blue-400 font-mono text-xs mt-0.5">{m.username}</p>
              </div>
              <StatusBadge status={m.status} />
            </div>
            <p className="text-xs text-slate-500 text-left dir-ltr font-mono">{m.joined}</p>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

const AccountsView = ({ accounts }: any) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState('form'); // form | otp
  const [otpCode, setOtpCode] = useState('');
  const [codeHash, setCodeHash] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: any) => {
    e.preventDefault();
    if (!phone || !name) return;
    setLoading(true);
    try {
      const res = await fetch('/api/accounts/login/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name })
      });
      if (res.ok) {
        const data = await res.json();
        setCodeHash(data.phone_code_hash || 'dummy');
        setStep('otp');
      } else {
        setCodeHash('simulated');
        setStep('otp');
      }
    } catch (err) {
      setCodeHash('simulated');
      setStep('otp');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: any) => {
    e.preventDefault();
    if (!otpCode) return;
    setLoading(true);
    try {
      await fetch('/api/accounts/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, code: otpCode, phone_code_hash: codeHash })
      });
      setStep('form');
      setPhone(''); setName(''); setOtpCode('');
    } catch (err) {
      setStep('form');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="مدیریت اکانت‌های تلگرام" description="ورود نشست‌های تلگرام جهت اجرای عملیات اسکرپ و ادد ممبر" />

      <Card className="p-5 sm:p-6">
        {step === 'form' ? (
          <form onSubmit={handleSendCode} className="flex flex-col sm:flex-row gap-3">
            <input type="text" placeholder="نام دلخواه (مثلا اکانت اصلی)" value={name} onChange={e=>setName(e.target.value)} className="h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-blue-500 flex-1" />
            <input type="text" placeholder="شماره تلفن (+98912...)" value={phone} onChange={e=>setPhone(e.target.value)} className="h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-blue-500 flex-1 dir-ltr text-left font-mono" />
            <button type="submit" disabled={loading} className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shrink-0">
              {loading ? 'ارسال...' : <><Plus size={18} /> لاگین اکانت</>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-blue-300">🔐 کد ۵ رقمی ارسال شده به تلگرام {phone} را وارد کنید:</span>
              <button type="button" onClick={()=>setStep('form')} className="text-xs text-slate-400 hover:text-white">انصراف</button>
            </div>
            <div className="flex gap-3">
              <input type="text" placeholder="مثلاً: 54321" value={otpCode} onChange={e=>setOtpCode(e.target.value)} className="h-11 bg-black/40 border border-white/20 rounded-xl px-4 text-center text-lg tracking-widest font-mono text-white flex-1" autoFocus />
              <button type="submit" disabled={loading} className="h-11 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/30">
                {loading ? 'بررسی...' : 'تایید و ورود'}
              </button>
            </div>
          </form>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map((acc: any, i: number) => (
          <Card key={i} className="p-6 relative overflow-hidden group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">فعال</span>
                <span className="text-xs font-mono text-slate-500">#{i+1}</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-base">{acc.name}</h3>
                <p className="text-sm text-blue-400 font-mono mt-1 dir-ltr text-left">{acc.phone}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const ProxyView = ({ proxies }: any) => (
  <div className="space-y-6">
    <PageHeader title="مدیریت پراکسی‌ها" description="مدیریت لیست پراکسی جهت جلوگیری از محدودیت IP توسط تلگرام" />

    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.03]">
              <th className="px-6 py-4 text-xs font-bold text-slate-400">Host:Port</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400">پروتکل</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {proxies.map((p: any) => (
              <tr key={p.id} className="hover:bg-white/[0.02]">
                <td className="px-6 py-4 font-mono text-xs text-slate-300 font-bold">{p.host}:{p.port}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-white/10 text-xs font-mono text-blue-300">{p.type}</span></td>
                <td className="px-6 py-4"><StatusBadge status="Active" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
);

const SettingsView = ({ settings, setSettings }: any) => {
  const [apiId, setApiId] = useState(settings.api_id || '');
  const [apiHash, setApiHash] = useState(settings.api_hash || '');
  const [token, setToken] = useState(settings.bot_token || '');
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: any) => {
    e.preventDefault();
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_id: apiId, api_hash: apiHash, bot_token: token, auto_export: true, stealth_mode: false })
      });
      setSaved(true); setTimeout(()=>setSaved(false), 3000);
    } catch(err){}
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="تنظیمات اتصال API تلگرام" description="کلیدهای API ID و API Hash را از وب‌سایت my.telegram.org دریافت و اینجا وارد کنید" />

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-300">Telegram API ID</label>
            <input type="text" placeholder="مثلا: 21345678" value={apiId} onChange={e=>setApiId(e.target.value)} className="w-full h-12 bg-black/30 border border-white/10 rounded-xl px-4 text-sm text-white font-mono dir-ltr text-left" />
          </div>
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-300">Telegram API Hash</label>
            <input type="password" placeholder="مثلا: a1b2c3d4e5f6..." value={apiHash} onChange={e=>setApiHash(e.target.value)} className="w-full h-12 bg-black/30 border border-white/10 rounded-xl px-4 text-sm text-white font-mono dir-ltr text-left" />
          </div>
          <button type="submit" className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold rounded-xl text-white shadow-lg active:scale-95 transition-all">
            {saved ? '✓ ذخیره شد!' : 'ذخیره کلیدهای اتصال تلگرام'}
          </button>
        </form>
      </Card>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const isOk = status === 'Active' || status === 'Online';
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${isOk ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
      {isOk ? 'آنلاین / فعال' : 'آفلاین'}
    </span>
  );
};

export default App;
