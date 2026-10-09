import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Faculty', 'Mentor', 'Student'], default: 'Student' },
  studentId: { type: String },
  department: String,
  phone: String,
  mentorPermissions: {
    canAddNotes: { type: Boolean, default: true },
    canGiveFeedback: { type: Boolean, default: true },
    canCreateTasks: { type: Boolean, default: true },
    canMessageStudents: { type: Boolean, default: true },
    canScheduleSessions: { type: Boolean, default: true },
    canManageGoals: { type: Boolean, default: true }
  },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true })

const academicRecordSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  semester: Number,
  cgpa: Number,
  subjectScores: [{
    subject: String,
    score: Number,
    currentScore: Number,
    internalScore: Number,
    previousExamScore: Number,
    assignmentScore: Number,
    quizScore: Number,
    attendance: Number,
    trend: { type: String, enum: ['auto', 'declining', 'stable', 'improving'] },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'very hard'] },
    targetScore: Number,
    examDate: Date,
    backlog: Boolean
  }],
  backlogs: Number,
  internalAssessment: Number
}, { timestamps: true })

const attendanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  overallAttendance: Number,
  subjectAttendance: [{ subject: String, percentage: Number }],
  monthlyTrend: [{ month: String, percentage: Number }]
}, { timestamps: true })

const lmsActivitySchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  loginFrequency: Number,
  timeSpent: Number,
  assignmentsCompleted: Number,
  assignmentsMissed: Number,
  quizScores: [{ quiz: String, score: Number }],
  courseProgress: Number
}, { timestamps: true })

const engagementSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  hackathons: Number,
  clubs: Number,
  events: Number,
  certifications: Number,
  workshops: Number,
  projects: Number,
  engagementScore: Number
}, { timestamps: true })

const placementSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  aptitudeScore: Number,
  codingScore: Number,
  communicationScore: Number,
  mockInterviewScore: Number,
  resumeScore: Number,
  applications: Number,
  interviews: Number,
  placementReadiness: Number
}, { timestamps: true })

const skillAssessmentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  technical: [{ skill: String, score: Number }],
  softSkills: [{ skill: String, score: Number }]
}, { timestamps: true })

const feedbackSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  sentiment: String,
  comments: String,
  moraleScore: Number,
  facultyComment: String
}, { timestamps: true })

const riskAssessmentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  overallRisk: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
  assessedDay: String,
  assessedAt: Date,
  riskScore: { type: Number, min: 0, max: 100 },
  riskLevel: { type: String, enum: ['Low', 'Moderate', 'High', 'Critical'] },
  categoryRisks: {
    academic: { type: Number, min: 0, max: 100 },
    attendance: { type: Number, min: 0, max: 100 },
    assignments: { type: Number, min: 0, max: 100 },
    engagement: { type: Number, min: 0, max: 100 },
    learning: { type: Number, min: 0, max: 100 },
    administrative: { type: Number, min: 0, max: 100 },
    performanceTrend: { type: Number, min: 0, max: 100 }
  },
  dataCoverage: {
    availableCategories: Number,
    totalCategories: Number,
    missingCategories: [String]
  },
  reasons: [String],
  assessedBy: String,
  academicRisk: String,
  attendanceRisk: String,
  placementRisk: String,
  engagementRisk: String,
  successScore: Number,
  factors: [{ name: String, weight: Number, score: Number, contribution: Number, impact: String }]
}, { timestamps: true })

const earlySuccessCheckSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  dateKey: { type: String, required: true },
  riskScore: { type: Number, min: 0, max: 100 },
  priority: { type: String, enum: ['Information', 'Attention', 'Urgent Support'], required: true },
  attendance: Number,
  academicScore: Number,
  previousAcademicScore: Number,
  pendingAssignments: Number,
  signals: [{ key: String, label: String, detail: String }],
  trend: String,
  assessedAt: { type: Date, default: Date.now }
}, { timestamps: true })
earlySuccessCheckSchema.index({ studentId: 1, dateKey: 1 }, { unique: true })

const earlySuccessNotificationSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  priority: { type: String, enum: ['Information', 'Attention', 'Urgent Support'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  reasons: [{ type: String }],
  signature: { type: String, required: true },
  status: { type: String, enum: ['Unread', 'Read'], default: 'Unread' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true })

const interventionSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: String,
  riskType: String,
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
  recommendation: String,
  assignedFaculty: String,
  createdDate: Date,
  dueDate: Date,
  status: { type: String, enum: ['Open', 'In Progress', 'Completed', 'Escalated'] },
  notes: String,
  actionTaken: String,
  studentResponse: String,
  followUpDate: Date,
  riskBeforeIntervention: { type: Number, min: 0, max: 100 },
  outcomeRiskScore: { type: Number, min: 0, max: 100 },
  outcome: String,
  outcomeAssessment: { type: String, enum: ['Improved', 'No Change', 'Needs More Support', 'Not Yet Reviewed'], default: 'Not Yet Reviewed' },
  outcomeReviewedAt: Date
}, { timestamps: true })

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  department: String,
  year: Number,
  semester: Number,
  gender: String,
  subjectScores: [{
    subject: String,
    score: Number,
    currentScore: Number,
    internalScore: Number,
    previousExamScore: Number,
    assignmentScore: Number,
    quizScore: Number,
    attendance: Number,
    trend: { type: String, enum: ['auto', 'declining', 'stable', 'improving'] },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'very hard'] },
    targetScore: Number,
    examDate: Date,
    backlog: Boolean
  }],
  upcomingExams: [{
    subject: String,
    examDate: Date,
    topics: [String]
  }],
  pendingAssignments: [{
    subject: String,
    title: String,
    score: Number,
    dueDate: Date,
    topic: String,
    estimatedMinutes: Number,
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
  }],
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
  successScore: Number,
  academicPerformance: Number,
  attendance: Number,
  lmsActivity: Number,
  assignmentCompletion: Number,
  subjectAttendance: [{ subject: String, percentage: Number }],
  placementReadiness: Number,
  engagement: Number,
  skills: Number,
  cgpa: Number,
  aptitudeScore: Number,
  codingScore: Number,
  communicationScore: Number,
  mockInterviewScore: Number,
  resumeScore: Number,
  projects: Number,
  hackathons: Number,
  clubs: Number,
  events: Number,
  certifications: Number,
  workshops: Number,
  assignmentMissed: Number,
  courseProgress: Number,
  lastLogin: String,
  engagementScore: Number,
  placementReadinessScore: Number,
  trend: { academic: String, attendance: String, placement: String },
  riskFactors: [{ name: String, value: Number, impact: String }],
  assignedFaculty: String,
  mentorId: { type: String, index: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true })

const campusEventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, maxlength: 3000 },
  date: { type: Date, required: true },
  time: { type: String, required: true, maxlength: 40 },
  location: { type: String, required: true, maxlength: 300 },
  imageUrl: { type: String, default: '', maxlength: 1000 },
  department: { type: String, default: 'All' },
  year: { type: String, default: 'All' },
  registrationDeadline: Date,
  published: { type: Boolean, default: false },
  createdBy: String
}, { timestamps: true })

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 3000 },
  priority: { type: String, enum: ['Information', 'Attention', 'Urgent Support'], default: 'Information' },
  audience: {
    type: { type: String, enum: ['All Students', 'Department', 'Year', 'Mentor Group'], default: 'All Students' },
    value: { type: String, default: 'All' }
  },
  published: { type: Boolean, default: true },
  createdBy: String
}, { timestamps: true })

const campusNotificationSchema = new mongoose.Schema({
  recipientId: { type: String, required: true, index: true },
  studentId: String,
  title: { type: String, required: true, maxlength: 160 },
  message: { type: String, required: true, maxlength: 1000 },
  type: { type: String, enum: ['assignment', 'announcement', 'message', 'system'], default: 'system' },
  priority: { type: String, enum: ['Information', 'Attention', 'Urgent Support'], default: 'Information' },
  readAt: Date
}, { timestamps: true })

const mentorRecordSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  mentorId: { type: String, required: true, index: true },
  type: { type: String, enum: ['Note', 'Feedback', 'Task', 'Message', 'Session', 'Goal'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 3000 },
  dueDate: Date,
  status: { type: String, enum: ['Open', 'In Progress', 'Completed'], default: 'Open' },
  createdByRole: { type: String, enum: ['Mentor', 'Student'], required: true }
}, { timestamps: true })

const campusSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'platform' },
  chatbotEnabled: { type: Boolean, default: true },
  assistantWelcome: { type: String, default: 'Hi! Ask about your progress or request support.', maxlength: 500 },
  updatedBy: String
}, { timestamps: true })

const eventRegistrationSchema = new mongoose.Schema({
  eventId: { type: String, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  registeredAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['Registered', 'Cancelled'], default: 'Registered' }
}, { timestamps: true })
eventRegistrationSchema.index({ eventId: 1, studentId: 1 }, { unique: true })

const subjectFeedbackSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  subject: { type: String, required: true, trim: true },
  understanding: { type: Number, required: true, min: 1, max: 5 },
  understandingLabel: { type: String, required: true },
  notes: { type: String, default: '' },
  reportedBy: { type: String, required: true }
}, { timestamps: true })

const feeRecordSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  academicYear: { type: String, required: true },
  tuitionFee: { type: Number, required: true, min: 0 },
  activityFee: { type: Number, default: 0, min: 0 },
  examinationFee: { type: Number, default: 0, min: 0 },
  paidAmount: { type: Number, required: true, min: 0 },
  dueDate: Date
}, { timestamps: true })

const studyProgressSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  taskId: { type: String, required: true },
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  status: { type: String, enum: ['Completed', 'Partially Completed', 'Not Completed'], required: true },
  availableMinutes: { type: Number, required: true, min: 10, max: 180 }
}, { timestamps: true })

const studyPlanSubjectSchema = new mongoose.Schema({
  subject: { type: String, required: true, trim: true, maxlength: 80 },
  currentScore: { type: Number, required: true, min: 0, max: 100 },
  targetScore: { type: Number, default: 80, min: 0, max: 100 },
  internalScore: { type: Number, min: 0, max: 100 },
  previousExamScore: { type: Number, min: 0, max: 100 },
  assignmentScore: { type: Number, min: 0, max: 100 },
  quizScore: { type: Number, min: 0, max: 100 },
  attendance: { type: Number, min: 0, max: 100 },
  trend: { type: String, enum: ['auto', 'declining', 'stable', 'improving'], default: 'auto' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'very hard'], default: 'medium' },
  examDate: Date,
  backlog: { type: Boolean, default: false }
}, { _id: false })

const studyPlanSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, index: true },
  availableDailyHours: { type: Number, required: true, min: 0.5, max: 16, default: 3 },
  placementMinutesPerDay: { type: Number, min: 0, max: 240, default: 20 },
  startTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '18:00' },
  subjects: { type: [studyPlanSubjectSchema], default: [] },
  recalculatedAt: Date
}, { timestamps: true })

export const User = mongoose.models.User || mongoose.model('User', userSchema)
export const Student = mongoose.models.Student || mongoose.model('Student', studentSchema)
export const AcademicRecord = mongoose.models.AcademicRecord || mongoose.model('AcademicRecord', academicRecordSchema)
export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema)
export const LMSActivity = mongoose.models.LMSActivity || mongoose.model('LMSActivity', lmsActivitySchema)
export const Engagement = mongoose.models.Engagement || mongoose.model('Engagement', engagementSchema)
export const Placement = mongoose.models.Placement || mongoose.model('Placement', placementSchema)
export const SkillAssessment = mongoose.models.SkillAssessment || mongoose.model('SkillAssessment', skillAssessmentSchema)
export const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema)
export const RiskAssessment = mongoose.models.RiskAssessment || mongoose.model('RiskAssessment', riskAssessmentSchema)
export const EarlySuccessCheck = mongoose.models.EarlySuccessCheck || mongoose.model('EarlySuccessCheck', earlySuccessCheckSchema)
export const EarlySuccessNotification = mongoose.models.EarlySuccessNotification || mongoose.model('EarlySuccessNotification', earlySuccessNotificationSchema)
export const Intervention = mongoose.models.Intervention || mongoose.model('Intervention', interventionSchema)
export const SubjectFeedback = mongoose.models.SubjectFeedback || mongoose.model('SubjectFeedback', subjectFeedbackSchema)
export const FeeRecord = mongoose.models.FeeRecord || mongoose.model('FeeRecord', feeRecordSchema)
export const StudyProgress = mongoose.models.StudyProgress || mongoose.model('StudyProgress', studyProgressSchema)
export const StudyPlan = mongoose.models.StudyPlan || mongoose.model('StudyPlan', studyPlanSchema)
export const CampusEvent = mongoose.models.CampusEvent || mongoose.model('CampusEvent', campusEventSchema)
export const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema)
export const CampusNotification = mongoose.models.CampusNotification || mongoose.model('CampusNotification', campusNotificationSchema)
export const MentorRecord = mongoose.models.MentorRecord || mongoose.model('MentorRecord', mentorRecordSchema)
export const CampusSettings = mongoose.models.CampusSettings || mongoose.model('CampusSettings', campusSettingsSchema)
export const EventRegistration = mongoose.models.EventRegistration || mongoose.model('EventRegistration', eventRegistrationSchema)
