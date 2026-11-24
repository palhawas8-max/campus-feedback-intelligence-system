import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { path: '/admin', label: 'Executive Dashboard', icon: '📊', exact: true },
  { path: '/admin/tickets', label: 'Issue Tickets & Queue', icon: '🎫' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/login?role=admin') }
  const isActive = (path, exact) =>
    exact ? location.pathname === path : location.pathname.startsWith(path)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-20 hidden md:flex border-r border-slate-800">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm">
              CF
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Admin Command
            </span>
          </div>
          <h1 className="text-sm font-black text-white leading-tight">
            Campus Feedback Intelligence
          </h1>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">
            J.C. Bose UST, YMCA
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-slate-400 px-3 pb-1 tracking-wider">
            Management &amp; Triage
          </div>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive(item.path, item.exact)
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* Quick Switch to Student Portal */}
          <div className="pt-4 mt-4 border-t border-slate-800/80">
            <div className="text-[10px] uppercase font-bold text-slate-400 px-3 pb-1 tracking-wider">
              Quick Switch
            </div>
            <Link
              to="/feedback"
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
            >
              <span>🎓</span>
              <span>Open Student Portal</span>
            </Link>
          </div>

          {/* MongoDB Atlas Live Status */}
          <div className="mx-2 mt-4 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                <span>🍃 MongoDB Atlas</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-800/70 text-emerald-200 rounded font-semibold">Active</span>
              </div>
              <div className="text-[10px] text-emerald-400/80 font-mono truncate">cluster0.1bx8exf</div>
            </div>
          </div>
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-black">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">Facility Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs font-bold py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all border border-slate-700"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-slate-900 text-white border-b border-slate-800 z-20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs">
              CF
            </div>
            <span className="text-xs font-black">Admin Command</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className={`px-2.5 py-1 text-xs rounded-lg font-bold ${
                isActive('/admin', true) ? 'bg-indigo-600 text-white' : 'text-slate-300 bg-slate-800'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/admin/tickets"
              className={`px-2.5 py-1 text-xs rounded-lg font-bold ${
                isActive('/admin/tickets') ? 'bg-indigo-600 text-white' : 'text-slate-300 bg-slate-800'
              }`}
            >
              Tickets
            </Link>
            <button
              onClick={handleLogout}
              className="px-2 py-1 text-xs bg-slate-800 text-slate-300 rounded-lg"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 sm:p-6 md:p-8 mt-12 md:mt-0 max-w-7xl">
        <Outlet />
      </main>
    </div>
  )
}
