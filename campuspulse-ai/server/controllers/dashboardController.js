import { getDashboardSummary, getRiskDistribution, getDepartmentAnalysis, getTrendSeries } from '../services/demoDataService.js'
import { dbState } from '../services/demoDataService.js'
import { Student } from '../models/index.js'
import { isDatabaseConfigured } from '../services/databaseService.js'

async function getStudents() {
  return isDatabaseConfigured() ? Student.find().lean() : dbState.students
}

export async function getSummary(req, res) {
  res.json(getDashboardSummary(await getStudents()))
}

export async function getRiskDistributionData(req, res) {
  res.json(getRiskDistribution(await getStudents()))
}

export async function getDepartmentAnalysisData(req, res) {
  res.json(getDepartmentAnalysis(await getStudents()))
}

export async function getAnalyticsTrends(req, res) {
  res.json(getTrendSeries(await getStudents()))
}
