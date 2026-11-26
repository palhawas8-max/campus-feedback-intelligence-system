import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Active portal tab: 'student' or 'admin'
  const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'student'
  const [activePortal, setActivePortal] = useState(initialRole)

  // Clean empty inputs - NO AUTO-FILL
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverStatus, setServerStatus] = useState('checking') // 'checking' | 'online' | 'waking'
  const [waitTimer, setWaitTimer] = useState(0)

  // Wake-up ping on mount to pre-warm cold backend
  useEffect(() => {
    let mounted = true
    api.get('/health', { timeout: 15000 })
      .then(() => { if (mounted) setServerStatus('online') })
      .catch(() => { if (mounted) setServerStatus('waking') })
    return () => { mounted = false }
  }, [])

  // Timer while loading to inform user of cold start
  useEffect(() => {
    let t = null
    if (loading) {
      t = setInterval(() => setWaitTimer((prev) => prev + 1), 1000)
    } else {
      setWaitTimer(0)
    }
    return () => { if (t) clearInterval(t) }
  }, [loading])

  // Switch between Student and Admin Portal tabs without auto-filling
  const switchPortal = (role) => {
    setActivePortal(role)
    setSearchParams({ role })
    setErrors({})
    setForm({ email: '', password: '' }) // Keep inputs blank
  }

  const validate = () => {
    const e = {}
    if (!form.email.trim()) {
      e.email = 'Email address is required'
    } else if (!form.email.includes('@')) {
      e.email = 'Please enter a valid email address'
    }
    if (!form.password) {
      e.password = 'Password is required'
    }
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await api.post('/auth/login', {
        email: form.email.trim(),
        password: form.password,
      })
      login(res.data.access_token, res.data.role, res.data.name)
      toast.success(`Welcome, ${res.data.name}!`)
      navigate(res.data.role === 'admin' ? '/admin' : '/feedback')
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        (err.code === 'ECONNABORTED' || err.message?.includes('Network Error') || err.message?.includes('timeout')
          ? 'Cloud server is spinning up from cold sleep mode. Please wait a few seconds and try again.'
          : 'Invalid email or password. Please try again.')
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        
        {/* University Header Badge */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold tracking-wide border border-slate-200">
            J.C. Bose University of Science &amp; Technology, YMCA
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Campus Feedback Intelligence System
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Automated Facility Complaint Analysis &amp; Departmental Dispatch
          </p>
        </div>

        {/* Backend Connectivity Status Pill */}
        <div className="flex justify-center -mb-2">
          {serverStatus === 'online' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              API Service: Online &amp; Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Checking Cloud Backend Connectivity...
            </span>
          )}
        </div>

        {/* Login Card with Portal Switcher */}
        <div className="card shadow-lg border-slate-200/80 bg-white">
          
          {/* Distinct Role Tabs for Student vs Admin */}
          <div className="flex border-b border-slate-100 mb-6 -mx-6 px-6 pb-2">
            <button
              type="button"
              onClick={() => switchPortal('student')}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
                activePortal === 'student'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="text-base">🎓</span>
              <span>Student Portal</span>
            </button>
            <button
              type="button"
              onClick={() => switchPortal('admin')}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
                activePortal === 'admin'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="text-base">🛡️</span>
              <span>Admin Portal</span>
            </button>
          </div>

          {/* Portal Subtitle & Badge */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {activePortal === 'student' ? 'Student Sign In' : 'Administrator Sign In'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activePortal === 'student'
                  ? 'Submit campus facility feedback via voice or text'
                  : 'Manage tickets, campus heatmap & department triage'}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
              activePortal === 'student'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {activePortal === 'student' ? 'Student' : 'Admin Staff'}
            </span>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate autoComplete="off">
            <div>
              <label htmlFor="email" className="label">
                {activePortal === 'student' ? 'Student University Email' : 'Administrator Email'}
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  className="input pl-10"
                  placeholder={activePortal === 'student' ? 'student@jcboseust.ac.in' : 'admin@jcboseust.ac.in'}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  autoComplete="off"
                />
                <span className="absolute left-3.5 top-3 text-slate-400 text-sm">
                  {activePortal === 'student' ? '🎓' : '✉️'}
                </span>
              </div>
              {errors.email && <p id="email-error" className="text-red-600 text-xs mt-1.5">{errors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="label mb-0">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-slate-500 hover:text-indigo-600"
                >
                  {showPassword ? 'Hide password' : 'Show password'}
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  autoComplete="new-password"
                />
                <span className="absolute left-3.5 top-3 text-slate-400 text-sm">🔒</span>
              </div>
              {errors.password && <p id="password-error" className="text-red-600 text-xs mt-1.5">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-md transition-all ${
                activePortal === 'student'
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  : 'bg-slate-900 hover:bg-slate-800 shadow-slate-300'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                `Sign in to ${activePortal === 'student' ? 'Student Portal' : 'Admin Portal'}`
              )}
            </button>

            {waitTimer >= 3 && (
              <div className="mt-2 text-center text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 animate-pulse">
                ⏳ Connecting to server... Free-tier cloud instances take ~30-45s to wake up on first visit ({waitTimer}s elapsed). Please hold on!
              </div>
            )}
          </form>

          {/* Registration Link */}
          <div className="pt-4 mt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            Need an account?{' '}
            <Link to={`/register?role=${activePortal}`} className="text-indigo-600 hover:text-indigo-700 font-bold">
              Register as {activePortal === 'student' ? 'Student' : 'Admin Staff'}
            </Link>
          </div>
        </div>

        {/* Feature Highlights Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] text-slate-500 font-medium">
          <div className="bg-white/70 rounded-xl p-2 border border-slate-200/60 shadow-xs">
            🎙️ Voice Input (en-IN)
          </div>
          <div className="bg-white/70 rounded-xl p-2 border border-slate-200/60 shadow-xs">
            🧠 KeyBERT &amp; TF-IDF
          </div>
          <div className="bg-white/70 rounded-xl p-2 border border-slate-200/60 shadow-xs">
            🚨 Hazard Urgency
          </div>
          <div className="bg-white/70 rounded-xl p-2 border border-slate-200/60 shadow-xs">
            🏢 Smart Wing Routing
          </div>
        </div>

      </div>
    </div>
  )
}
