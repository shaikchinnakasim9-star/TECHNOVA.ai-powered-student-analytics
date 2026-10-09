# CampusPulse AI

CampusPulse AI is a full-stack student success and risk intelligence platform for universities. It combines academic, attendance, LMS, engagement, placement, skills, and feedback data into a unified student profile and generates explainable success scores and recommended actions.

## Project structure

```text
.
├── client/
│   ├── src/
│   ├── package.json
│   ├── vercel.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── index.html
├── server/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── seed/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── README.md
└── package.json
```

## Local setup on Windows

1. Open a terminal in `client` and run:

```bash
npm install
npm run dev
```

2. Open a second terminal in `server` and run:

```bash
npm install
npm run dev
```

3. Open the frontend in the browser at `http://localhost:5173`.

## Deploy to Render

The repository-root `render.yaml` defines the client as a Render static site and the API as a Node web service. Push the repository contents, including `client`, `server`, and `render.yaml`, to GitHub. In Render, create or update the Blueprint for that repository and sync it. The Blueprint configures the frontend/API URLs, API CORS origin, and SPA route fallback automatically.

If configuring the services manually, set the frontend's `VITE_API_URL` to the API service URL (with or without a trailing `/api`), and set the API's `CLIENT_URL` to the frontend's full `https://...onrender.com` URL. The client normalizes the API URL to the `/api` base path. The API's `/api/health` endpoint should return HTTP 200 before testing the frontend.

The API starts in demo in-memory mode when `MONGODB_URI` is not set. Demo changes are not persistent across service restarts; configure a MongoDB Atlas connection as the API service's `MONGODB_URI` for persistent data. The free API service may spin down when idle.

## Deploy the frontend to Vercel

Import the GitHub repository in Vercel and set the project Root Directory to `client`. The included `client/vercel.json` configures the Vite build and SPA route fallback. To use the Vercel frontend with the API, first deploy the API (for example, with the Render Blueprint), then set Vercel's `VITE_API_URL` environment variable to the API URL ending in `/api` and redeploy. The frontend cannot use the local `localhost` API URL in production.

## MongoDB setup

- Use MongoDB Atlas or install MongoDB Community Edition locally.
- Copy `server/.env.example` to `server/.env`, then set `MONGODB_URI` to your database connection string. Keep this secret in `server/.env`; do not commit or paste it into source files.
- When MongoDB is configured, the server connects before accepting requests, seeds demo users and students only when appropriate, and uses MongoDB for student, intervention, subject-feedback, and fee-record data. Fee account records are not fabricated in the database; add/import the college's actual fee data separately.
- When MongoDB is configured but unavailable, startup fails instead of silently using temporary demo data. Without `MONGODB_URI`, the app runs in in-memory demo mode.

Example:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/campuspulse
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters
AI_API_KEY=
CLIENT_URL=http://localhost:5173
```

## Seed command

In the server directory:

```bash
npm run seed
```

This connects to MongoDB, seeds demo users, and seeds demo students only if the Students collection is empty. It requires `MONGODB_URI` in `server/.env`; it does not modify existing student records.

## Demo login accounts

- Admin: admin@campuspulse.ai / Admin@123
- Mentor: faculty@campuspulse.ai / Faculty@123
- Student: ramya@gmail.com / 12345678

## Demo flow

1. Log in as admin.
2. Open the dashboard to review KPI cards and risk distribution.
3. Navigate to Risk Intelligence.
4. Open a high-risk student profile.
5. Generate AI insight and create an intervention.
6. Open Segments and Analytics pages to review cohort insights.

## CampusPulse Early Success Alert

The student dashboard's **CampusPulse Early Success Alert** checks available attendance, assessment marks, pending or missed assignments, learning activity, feedback, and upcoming exams for combined early-warning patterns. It explains the recorded signals, creates a supportive student notification for Attention or Urgent Support patterns, and builds a short seven-day plan around the available subject and coursework data. Admin users can open the feature for a student from that student's profile.

Alert checks and notification history are retained in MongoDB when configured, or in the in-memory demo store for the running session. Students are rechecked on dashboard entry and every five minutes while signed in; authorized staff checks run when they open a student's alert center. Daily snapshots support progress comparisons. The combined indicator is a support aid, not a diagnosis or guaranteed prediction. Missing data is left unknown, and the system recommends a human mentor check-in when several signals warrant additional support.

## Intervention feedback loop

Admin users can use **Interventions → Completion & outcome feedback** to record status, action taken, student response, before/after support-indicator scores, a reviewed outcome, and follow-up notes. Only completed interventions with a reviewed outcome feed back into future recommendations. Similar recorded improvement can support continuing a helpful action; no change or a need for more support prompts a different or additional action to be discussed with the student. Trends are observational, not proof that an intervention caused an outcome.

## Success Score formula

Success Score =
- Academic Performance × 0.30
- Attendance × 0.20
- LMS Activity × 0.15
- Assignment Completion × 0.10
- Placement Readiness × 0.15
- Engagement × 0.05
- Skills × 0.05

All metrics are normalized to 0–100, then weighted and combined.

## Risk Intelligence

The Risk Intelligence page calculates a 0–100 support indicator from the measured academic (28%), attendance (20%), assignment (16%), engagement (10%), learning (13%), administrative/fee (5%), and performance-trend (8%) signals. Weights are renormalized over categories with available data; missing categories stay unknown and are excluded rather than treated as risk. The resulting levels are 0–30 Low, 31–60 Moderate, 61–80 High, and 81–100 Critical. Each assessment explains its contributing factors, detected signal combinations, and practical support recommendations.

Scores are support indicators, not diagnoses or permanent student labels. Mentors remain responsible for important decisions and interventions with their assigned students. Student accounts see only their own supportive progress view; Admin can review student assessments and department summaries. Administrative risk is included only when a fee record exists. Risk predictions require recorded assessments on different dates and are explicitly presented as cautious estimates, not certain outcomes. Use **Record assessment** to save a dated snapshot; the first snapshot establishes a baseline for later comparison.

Student accounts accessing **My Performance** are restricted to their own profile and performance record. Mentor requests for student overviews, scores, and insights are constrained to the mentor's current assignments on the server. Changing a student ID in a URL does not bypass either check. Campus-wide directory search remains Admin-only; mentor search results are limited to assigned students.

The student profile's **Skills** tab shows the overall skills score and itemized technical and soft-skill ratings from the latest `SkillAssessment` record. Students can add, edit, and remove up to 25 self-reported technical skills and 25 self-reported soft skills, and rate each from 0 to 100. These are identified as self-reported, not verified assessments. When no skills have been entered, the profile states that they have not been recorded rather than generating sample ratings.

Interventions store an owner, action, student response, follow-up date, status, notes, and optional before/after risk scores. Effectiveness is measured from the recorded score change and should not be interpreted as proof that an intervention caused it. Outcomes are available for human review; they do not silently train or alter the scoring formula.

## AI recommendation logic

`aiRecommendationService.js` generates an explainable recommendation by combining actual performance metrics, attendance, academic trend, placement readiness, LMS activity, and engagement signals. If an external AI key is not configured, CampusPulse uses deterministic rule-based recommendations.

## Student study planner

The chatbot's **What Should I Study Now?** tool prioritizes available subject marks, low subject-understanding feedback, upcoming exams, pending assignments, and the student's prior task check-ins. It returns one focused topic that fits the selected study window and links the relevant uploaded question paper. Study outcomes are saved in MongoDB when configured (or in memory in demo mode) and used to choose the next task. The student schema accepts `subjectScores`, `upcomingExams` (`subject`, `examDate`, optional `topics`), and `pendingAssignments` (`subject`, `title`, optional `topic`, `dueDate`, `estimatedMinutes`, `status`) so this can use real course data when supplied. If those data are not available, the planner clearly falls back to a question-paper review rather than inventing exam dates or marks.

The student sidebar's **Study Plan** calculates per-subject weekly and daily time using a transparent 0–100 priority score: performance gap (35%), trend (15%), exam urgency (20%), backlog (10%), difficulty (10%), internal/assignment/quiz weakness (5%), and low attendance when marks are weak (5%). Performance bands and weekly time ranges are defined in `server/services/studyTimeCalculator.js`. Declining marks and near exams increase study time; improved marks, high scores, and available-time limits adjust it down. The saved plan includes practice/revision splits, placement preparation, daily timetable blocks, and remaining available time. Students can enter or update their subject marks and course context directly; persisted plans are student-scoped in MongoDB when configured and in memory in demo mode otherwise.

## Notes

## Role-based student management

CampusPulse uses three application roles: **Admin**, **Mentor**, and **Student**. Existing **Faculty** accounts are treated as Mentors so current logins continue to work. Passwords for new accounts are bcrypt-hashed; legacy plaintext demo/database passwords are upgraded to hashes on login or during database initialization. Active status is checked on API requests, so deactivation revokes existing sessions.

Admins use **Students**, **Mentors**, **Events**, **Announcements**, and **Settings** to create and edit accounts, assign or reassign students, deactivate accounts, publish audience-targeted events, post announcements, and manage chatbot availability and its welcome message. Mentor permissions for notes, feedback, tasks, messages, sessions, and goals are configurable and enforced by the API. New accounts receive a generated temporary password when one is not provided; the password is shown only in the creation response and should be shared securely. Deactivating an assigned mentor is blocked until their active students are reassigned or deactivated.

Mentor APIs and dashboards only return currently assigned students. Mentors can view those students' profiles, add notes, feedback, tasks, goals, messages, and sessions, and track task and goal completion. Students can view only their own profile, assigned mentor, mentoring history, events, announcements, and notifications; they can message their mentor and record progress on their tasks and goals. Mentor changes update the relationship immediately and create notifications for the student, the old mentor, and the new mentor.

Events and announcements are stored in MongoDB when configured and in memory for demo mode. Only published events targeted to a student's department/year appear on their event page. Students can register for published events before the registration deadline and cancel their own registration; Admin can review each event's active registration list. Announcements can target all students, a department, a year, or a mentor group and create matching in-app notifications. Notification updates are polled every 30 seconds while a user is signed in.

The APIs are mounted at `/api/management`. Authentication is enforced on every endpoint; resource checks are performed server-side, and campus-wide analytics, risk assessments, interventions, and account management are Admin-only. Set `JWT_SECRET` in `server/.env` before starting the API; there is no built-in signing-secret fallback.

This project can run with in-memory demo data or connect to MongoDB when configured. Demo-mode changes last only for the lifetime of the server process. It does not silently fall back to demo data when a configured MongoDB connection fails.
