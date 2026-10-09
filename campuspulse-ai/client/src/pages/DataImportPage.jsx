import { useState } from 'react'
import { UploadCloud, CheckCircle2 } from 'lucide-react'
import api from '../services/api'

export default function DataImportPage() {
  const [fileName, setFileName] = useState('student_data.csv')
  const [records, setRecords] = useState([
    { studentId: 'STU1000', department: 'CSE', year: 3 },
    { studentId: 'STU1001', department: 'ECE', year: 2 },
    { studentId: 'STU1002', department: 'AI & DS', year: 4 }
  ])
  const [result, setResult] = useState(null)

  const handleImport = async () => {
    const response = await api.post('/data/import', { fileName, records })
    setResult(response.data)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-indigo-600">Data Integration</div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Import Academic and Risk Data</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <div className="chart-panel space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <UploadCloud size={36} className="mx-auto text-indigo-500" />
            <div className="mt-3 text-lg font-semibold text-slate-700">Upload file</div>
            <p className="text-sm text-slate-500">CSV, Excel, or JSON supported</p>
          </div>
          <label className="block text-sm font-medium text-slate-700">Select dataset type</label>
          <select defaultValue="Academic">
            <option value="Academic">Academic</option>
            <option value="Attendance">Attendance</option>
            <option value="LMS">LMS</option>
            <option value="Engagement">Engagement</option>
            <option value="Placement">Placement</option>
            <option value="Skills">Skills</option>
          </select>
          <input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="File name" />
          <button className="glass-btn w-full" onClick={handleImport}>Validate & Import</button>
        </div>

        <div className="chart-panel">
          <div className="mb-4 text-lg font-semibold text-slate-800">Preview data</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="py-3 pr-4">Student ID</th>
                  <th className="py-3 pr-4">Department</th>
                  <th className="py-3 pr-4">Year</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.studentId} className="border-b border-slate-100">
                    <td className="py-3 pr-4">{row.studentId}</td>
                    <td className="py-3 pr-4">{row.department}</td>
                    <td className="py-3 pr-4">{row.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result && (
            <div className="mt-6 rounded-2xl bg-emerald-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-700"><CheckCircle2 size={18} /> Import complete</div>
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                <div><span className="font-medium">Records:</span> {result.records}</div>
                <div><span className="font-medium">Valid:</span> {result.validRecords}</div>
                <div><span className="font-medium">Invalid:</span> {result.invalidRecords}</div>
                <div><span className="font-medium">Duplicates:</span> {result.duplicateRecords}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
