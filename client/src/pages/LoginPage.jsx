import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const demoAccounts = [
  { role: 'Admin', email: 'admin@campuspulse.ai', password: 'Admin@123' },
  { role: 'Mentor', email: 'faculty@campuspulse.ai', password: 'Faculty@123' },
  { role: 'Student', email: 'ramya@gmail.com', password: '12345678' }
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: 'admin@campuspulse.ai', password: 'Admin@123', role: 'Admin' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center bg-slate-50 px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft lg:grid-cols-2">
        <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-600 p-10 text-white">
          <div className="mb-10 flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3"><Sparkles size={20} /></div>
            <div>
              <div className="text-2xl font-bold">CampusPulse AI</div>
            </div>
          </div>

          <div className="text-4xl font-bold leading-tight">Predict. Understand. Improve Student Success.</div>
          <div className="mt-8 space-y-4 text-indigo-100">
            {['Unified student risk intelligence', 'Actionable interventions', 'Explainable success score'].map((item) => (
              <div key={item} className="flex items-center gap-3"><CheckCircle2 size={18} /> {item}</div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-100"><ShieldCheck size={16} /> Secure access</div>
            <div className="mt-2 text-center text-3xl font-bold">3 roles</div>
          </div>
        </div>

        <div className="p-10">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Welcome back</div>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Sign in to CampusPulse</h2>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="Admin">Admin</option>
                <option value="Mentor">Mentor</option>
                <option value="Student">Student</option>
              </select>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <button type="submit" className="glass-btn w-full gap-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-700">Demo accounts</div>
            {demoAccounts.map((account) => (
              <button
                key={account.role}
                className="flex w-full justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => setForm({ email: account.email, password: account.password, role: account.role })}
              >
                <span>{account.role}</span>
                <span className="text-slate-500">{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
