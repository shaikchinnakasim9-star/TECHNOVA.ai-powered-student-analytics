import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowUpRight, BookOpen, BriefcaseBusiness, CheckCircle2, Gauge, Users, TrendingUp } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts'
import api from '../services/api'
import EarlySuccessPage from './EarlySuccessPage'
import { useAuth } from '../context/AuthContext'

const kpiIcons = {
  totalStudents: Users,
  atRisk: AlertTriangle,
  averageSuccessScore: TrendingUp,
  placementReady: BriefcaseBusiness,
  attendanceAverage: BookOpen,
  interventionsRequired: CheckCircle2
}

export default function DashboardPage() {
  const { auth } = useAuth()
  const [summary, setSummary] = useState(null)
  const [riskDistribution, setRiskDistribution] = useState([])
  const [departmentAnalysis, setDepartmentAnalysis] = useState([])
  const [trendSeries, setTrendSeries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [summaryRes, riskRes, deptRes, trendRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/risk-distribution'),
          api.get('/dashboard/department-analysis'),
          api.get('/dashboard/trends')
        ])

        setSummary(summaryRes.data)
        setRiskDistribution(riskRes.data)
        setDepartmentAnalysis(deptRes.data)
        setTrendSeries(trendRes.data)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  if (loading) return <div className="rounded-2xl bg-white p-10 text-center text-slate-500">Loading dashboard metrics...</div>

  const KPI_ITEMS = [
    { label: 'Total Students', value: summary.totalStudents.toLocaleString(), icon: kpiIcons.totalStudents, accentClass: 'bg-indigo-100 text-indigo-700' },
    { label: 'Students At Risk', value: summary.atRisk.toLocaleString(), icon: kpiIcons.atRisk, accentClass: 'bg-rose-100 text-rose-700' },
    { label: 'Average Success Score', value: `${summary.averageSuccessScore}`, icon: Gauge, accentClass: 'bg-emerald-100 text-emerald-700' },
    { label: 'Placement Ready', value: `${summary.placementReady}%`, icon: kpiIcons.placementReady, accentClass: 'bg-sky-100 text-sky-700' },
    { label: 'Attendance Average', value: `${summary.attendanceAverage}%`, icon: kpiIcons.attendanceAverage, accentClass: 'bg-amber-100 text-amber-700' },
    { label: 'Interventions Required', value: summary.interventionsRequired.toLocaleString(), icon: kpiIcons.interventionsRequired, accentClass: 'bg-violet-100 text-violet-700' }
  ]

  const pieColors = ['#22c55e', '#f59e0b', '#ef4444']

  return (
    <div className="space-y-6">
      {auth?.user?.role === 'Student' && <EarlySuccessPage compact />}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-indigo-100">AI Campus Summary</div>
            <h1 className="mt-2 text-2xl font-bold">Overall student success has improved by 4.8% compared with the previous semester.</h1>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
            <div className="text-xs uppercase text-indigo-100">Risk Snapshot</div>
            <div className="text-2xl font-bold">{summary.atRisk}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {KPI_ITEMS.map(({ label, value, icon: Icon, accentClass }) => (
          <div key={label} className="metric-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">{label}</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
              </div>
                <div className={`rounded-xl p-3 ${accentClass}`}>
                <Icon size={22} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
              <span>vs last term</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600"><ArrowUpRight size={16} /> +4.8%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="chart-panel">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Risk Distribution</h3>
            <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">Live Data</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskDistribution} innerRadius={60} outerRadius={95} dataKey="percent" nameKey="name" paddingAngle={3}>
                  {riskDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            {riskDistribution.map((item) => (
              <div key={item.name} className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="mx-auto mb-2 h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <div className="font-semibold text-slate-700">{item.name}</div>
                <div className="text-slate-500">{item.percent}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-panel">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Success Score Distribution</h3>
            <span className="text-sm text-slate-500">0–100 bands</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { label: '0–20', value: 8 },
                { label: '21–40', value: 12 },
                { label: '41–60', value: 22 },
                { label: '61–80', value: 38 },
                { label: '81–100', value: 20 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#4f46e5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="chart-panel">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Department Analysis</h3>
          <span className="text-sm text-slate-500">Current semester snapshot</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departmentAnalysis.map((item) => (
            <div key={item.department} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-800">{item.department}</div>
                <div className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">{item.atRiskPercentage}% at risk</div>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between"><span>Avg CGPA</span><strong>{item.averageCGPA}</strong></div>
                <div className="flex justify-between"><span>Attendance</span><strong>{item.averageAttendance}%</strong></div>
                <div className="flex justify-between"><span>Success Score</span><strong>{item.averageSuccessScore}</strong></div>
                <div className="flex justify-between"><span>Placement ready</span><strong>{item.placementReadiness}%</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-panel">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Student Success Trend</h3>
          <span className="text-sm text-slate-500">Academic and attendance trend</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendSeries}>
              <defs>
                <linearGradient id="successGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.65} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="success" stroke="#4f46e5" fill="url(#successGradient)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
