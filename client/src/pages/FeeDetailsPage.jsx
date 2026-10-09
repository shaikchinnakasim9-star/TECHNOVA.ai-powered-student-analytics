import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Search, Wallet } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const money = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
}).format(amount)

export default function FeeDetailsPage() {
  const { auth } = useAuth()
  const [feeData, setFeeData] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadFees = async () => {
      try {
        const response = await api.get('/fees')
        setFeeData(response.data)
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Could not load fee details.')
      }
    }
    loadFees()
  }, [])

  const records = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return feeData?.data || []
    return (feeData?.data || []).filter((record) =>
      record.studentId.toLowerCase().includes(query) ||
      record.studentName.toLowerCase().includes(query) ||
      record.department.toLowerCase().includes(query)
    )
  }, [feeData, search])

  if (error) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
  if (!feeData) return <div className="rounded-2xl bg-white p-10 text-center text-slate-500">Loading fee details...</div>

  const { summary } = feeData
  const isStudent = auth?.user?.role === 'Student'

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-700 to-blue-600 p-6 text-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-indigo-100">Fee Details</div>
            <h1 className="mt-2 text-3xl font-bold">{isStudent ? 'Your fee overview' : 'Student fee overview'}</h1>
            <p className="mt-2 text-indigo-100">{feeData.demoData ? 'Illustrative 2026–27 fee records. This demo does not process payments.' : 'Fee account records from the connected database. Payments are not processed here.'}</p>
          </div>
          <CreditCard size={42} className="text-white/80" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total fees', value: money(summary.totalFees), icon: CreditCard, style: 'bg-indigo-100 text-indigo-700' },
          { label: 'Paid', value: money(summary.totalPaid), icon: Wallet, style: 'bg-emerald-100 text-emerald-700' },
          { label: 'Outstanding', value: money(summary.totalBalance), icon: CreditCard, style: 'bg-amber-100 text-amber-700' },
          { label: 'Accounts with balance', value: summary.unpaidAccounts, icon: Search, style: 'bg-rose-100 text-rose-700' }
        ].map(({ label, value, icon: Icon, style }) => (
          <div key={label} className="metric-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">{label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
              </div>
              <div className={`rounded-xl p-3 ${style}`}><Icon size={21} /></div>
            </div>
          </div>
        ))}
      </div>

      <section className="chart-panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{isStudent ? 'Fee breakdown' : 'Student accounts'}</h2>
            <p className="mt-1 text-sm text-slate-500">Academic year and due date are shown for each recorded account.</p>
          </div>
          {!isStudent && (
            <label className="relative block w-full sm:w-72">
              <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <input aria-label="Search fee records" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, ID, department" className="pl-9" />
            </label>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                {!isStudent && <th className="py-3 pr-4">Student</th>}
                {!isStudent && <th className="py-3 pr-4">Department</th>}
                <th className="py-3 pr-4">Tuition</th>
                <th className="py-3 pr-4">Other fees</th>
                <th className="py-3 pr-4">Total</th>
                <th className="py-3 pr-4">Paid</th>
                <th className="py-3 pr-4">Balance</th>
                <th className="py-3 pr-4">Due date</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.studentId} className="border-b border-slate-100 text-sm">
                  {!isStudent && <td className="py-3 pr-4"><div className="font-medium text-slate-800">{record.studentName}</div><div className="text-xs text-slate-500">{record.studentId}</div></td>}
                  {!isStudent && <td className="py-3 pr-4">{record.department}</td>}
                  <td className="py-3 pr-4">{money(record.tuitionFee)}</td>
                  <td className="py-3 pr-4">{money(record.activityFee + record.examinationFee)}</td>
                  <td className="py-3 pr-4 font-medium">{money(record.totalFee)}</td>
                  <td className="py-3 pr-4 text-emerald-700">{money(record.paidAmount)}</td>
                  <td className="py-3 pr-4 text-amber-700">{money(record.balance)}</td>
                  <td className="py-3 pr-4">{record.dueDate ? new Date(record.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${record.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : record.status === 'Unpaid' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{record.status}</span>
                  </td>
                </tr>
              ))}
              {records.length === 0 && <tr><td colSpan={isStudent ? 7 : 9} className="py-8 text-center text-sm text-slate-500">{feeData.demoData ? 'No fee records match this search.' : 'No fee records are stored for this account yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
