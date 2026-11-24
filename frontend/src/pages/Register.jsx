import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import toast from 'react-hot-toast'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const defaultRole = searchParams.get('role') === 'admin' ? 'admin' : 'student'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: defaultRole })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const r = searchParams.get('role')
    if (r === 'admin' || r === 'student') {
      setForm((f) => ({ ...f, role: r }))
    }
  }, [searchParams])

  const validate = () => {
    const e = {}
    if (!form.name || form.name.length < 2) e.name = 'Full name is required (min 2 characters)'
    if (!form.email || !form.email.includes('@')) e.email = 'Valid university email is required'
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      // Auto-login after registration
      const loginRes = await api.post('/auth/login', { email: form.email, password: form.password })
      login(loginRes.data.access_token, loginRes.data.role, loginRes.data.name)
      toast.success(`Account registered! Welcome, ${loginRes.data.name}.`)
      navigate(loginRes.data.role === 'admin' ? '/admin' : '/feedback')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed. Please check your details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        
        {/* University Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/70 text-indigo-800 text-xs font-semibold tracking-wide border border-indigo-200">
            J.C. Bose UST, YMCA, Faridabad
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Create Your Campus Account
          </h1>
          <p className="text-xs text-slate-500">
            Join the Campus Feedback Intelligence System
          </p>
        </div>

        {/* Card */}
        <div className="card shadow-lg border-slate-200/80 bg-white">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            {/* Role Radio Picker */}
            <div>
              <label className="label">Registering As</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'student' })}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    form.role === 'student'
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl">🎓</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Student</div>
                    <div className="text-[10px] text-slate-500">Submit &amp; track</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'admin' })}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    form.role === 'admin'
                      ? 'border-slate-900 bg-slate-100 ring-2 ring-slate-900/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl">🛡️</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Admin Staff</div>
                    <div className="text-[10px] text-slate-500">Manage &amp; triage</div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="label">Full Name</label>
              <input
                id="name"
                type="text"
                className="input"
                placeholder={form.role === 'student' ? 'Amit Verma' : 'Dr. R. K. Sharma'}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="reg-email" className="label">Email Address</label>
              <input
                id="reg-email"
                type="email"
                className="input"
                placeholder={form.role === 'student' ? 'amit.verma@jcboseust.ac.in' : 'admin.estate@jcboseust.ac.in'}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="reg-password" className="label">Password</label>
              <input
                id="reg-password"
                type="password"
                className="input"
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-md transition-all ${
                form.role === 'student'
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  : 'bg-slate-900 hover:bg-slate-800 shadow-slate-300'
              }`}
            >
              {loading ? 'Creating Account…' : `Create ${form.role === 'student' ? 'Student' : 'Admin'} Account`}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-5 pt-4 border-t border-slate-100">
            Already have an account?{' '}
            <Link to={`/login?role=${form.role}`} className="text-indigo-600 hover:text-indigo-700 font-bold">
              Sign in to {form.role === 'student' ? 'Student Portal' : 'Admin Portal'}
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
