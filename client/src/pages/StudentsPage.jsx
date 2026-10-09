import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Search, SlidersHorizontal } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function StudentsPage() {
  const { auth } = useAuth()
  const studentView = auth?.user?.role === 'Student'
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ department: '', year: '', risk: '', search: '' })
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, pages: 1 })

  const loadStudents = async (nextPage = page) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: nextPage, limit: 10 })
      if (!studentView) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value)
        })
      }
      const response = await api.get(`/students?${params.toString()}`)
      setStudents(response.data.data || [])
      setMeta({ total: response.data.total, pages: response.data.pages })
    } catch (requestError) {
      setStudents([])
      setError(requestError.response?.data?.message || 'Student information could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudents(1)
  }, [filters, studentView])

  useEffect(() => {
    if (page > 1) loadStudents(page)
  }, [page])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-indigo-600">{studentView ? 'My Student Profile' : 'Student Directory'}</div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{studentView ? 'My Overview' : 'Student Overview'}</h1>
        </div>
        {!studentView && <button type="button" className="secondary-btn gap-2"><SlidersHorizontal size={16} /> Filter</button>}
      </div>

      {!studentView && (
        <div className="chart-panel">
          <div className="grid gap-4 md:grid-cols-4">
            <input aria-label="Search students" placeholder="Search" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
            <select aria-label="Filter by department" value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })}>
              <option value="">Department</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Civil">Civil</option>
              <option value="AI & DS">AI & DS</option>
            </select>
            <select aria-label="Filter by year" value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })}>
              <option value="">Year</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
            <select aria-label="Filter by risk" value={filters.risk} onChange={(event) => setFilters({ ...filters, risk: event.target.value })}>
              <option value="">Risk</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      )}

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      <div className="chart-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm uppercase tracking-wide text-slate-500">
                <th className="py-3 pr-4">Student ID</th>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Department</th>
                <th className="py-3 pr-4">Year</th>
                <th className="py-3 pr-4">Success Score</th>
                <th className="py-3 pr-4">Risk</th>
                <th className="py-3 pr-4">Top Risk Factor</th>
                <th className="py-3 pr-4">{studentView ? 'My Profile' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.studentId} className="border-b border-slate-100 text-sm">
                  <td className="py-3 pr-4 font-medium text-slate-800">{student.studentId}</td>
                  <td className="py-3 pr-4">{student.name}</td>
                  <td className="py-3 pr-4">{student.department}</td>
                  <td className="py-3 pr-4">{student.year}</td>
                  <td className="py-3 pr-4 font-semibold">{student.successScore}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${student.riskLevel === 'HIGH' ? 'bg-rose-100 text-rose-700' : student.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {student.riskLevel}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{student.riskFactors[0]?.name || 'Academic'}</td>
                  <td className="py-3 pr-4">
                    <Link to={`/students/${student.studentId}`} className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                      <Eye size={14} /> {studentView ? 'My profile' : 'View'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && <p className="py-8 text-center text-sm text-slate-500">Loading your profile…</p>}
        {!loading && students.length === 0 && !error && <p className="py-8 text-center text-sm text-slate-500">No student profile is available.</p>}
        {!studentView && <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-500">{meta.total} records</div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="secondary-btn px-3 py-2 text-sm">Prev</button>
            <span className="text-sm font-medium text-slate-700">Page {page} / {meta.pages}</span>
            <button disabled={page >= meta.pages} onClick={() => setPage((current) => current + 1)} className="secondary-btn px-3 py-2 text-sm">Next</button>
          </div>
        </div>}
      </div>
    </div>
  )
}
