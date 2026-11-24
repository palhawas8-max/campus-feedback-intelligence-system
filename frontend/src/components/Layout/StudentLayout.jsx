import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/login') }
  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm">
              CF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  Campus Feedback Intelligence System
                </h1>
                <span className="hidden md:inline-flex text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full uppercase">
                  Student Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                J.C. Bose University of Science &amp; Technology, YMCA, Faridabad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                to="/feedback"
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  isActive('/feedback')
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ✍️ Submit Feedback
              </Link>
              <Link
                to="/my-submissions"
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  isActive('/my-submissions')
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                📋 My Submissions
              </Link>
            </nav>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-slate-800">{user?.name || 'Student'}</div>
                <div className="text-[10px] text-slate-400 font-mono">Roll: 2026/CS/042</div>
              </div>

              {/* Switch Portal Button */}
              <Link
                to="/login?role=admin"
                className="hidden lg:inline-flex text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-all"
                title="Switch to Administrator View"
              >
                🛡️ Admin Mode
              </Link>

              <button
                onClick={handleLogout}
                className="btn-secondary text-xs py-1.5 px-3 shadow-none text-slate-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden px-4 pb-2.5 flex gap-2 border-t border-slate-100 pt-2">
          <Link
            to="/feedback"
            className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
              isActive('/feedback') ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
            }`}
          >
            ✍️ Submit Feedback
          </Link>
          <Link
            to="/my-submissions"
            className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
              isActive('/my-submissions') ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
            }`}
          >
            📋 My Submissions
          </Link>
          <Link
            to="/login?role=admin"
            className="px-2.5 py-1.5 text-xs font-bold bg-slate-200 rounded-lg text-slate-700"
          >
            🛡️ Admin
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full">
        <Outlet />
      </main>

      {/* College Capstone Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        <div>Campus Feedback Intelligence System &bull; B.Tech Capstone Project 2026</div>
        <div>J.C. Bose University of Science &amp; Technology, YMCA, Faridabad</div>
      </footer>
    </div>
  )
}
