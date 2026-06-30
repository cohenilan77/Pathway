# Candidate Engagement and Journey System

## Overview

The Candidate Engagement and Journey System guides candidates actively through their application journey instead of waiting for them to ask for help. The system manages journey progression, automates reminders, tracks assignments, and provides personalized guidance.

## Architecture

### Core Components

#### 1. Journey Definitions (`lib/candidate-journey.js`)
- Defines 5 journey types: Undergraduate, Graduate, MBA, PhD, Personal Development
- Each journey has predefined stages (7-9 stages per journey)
- Each stage includes: purpose, duration, requirements, and next actions
- Stage definitions are immutable and journey-specific

#### 2. Candidate Clock (`lib/candidate-clock.js`)
- Server-side timer tracking candidate's position in their journey
- Tracks: first login, last activity, stage duration, weekly/monthly cycles
- Manages state transitions: stage changes, cycle completions
- Detects stuck candidates (no activity, overdue work, extended stage duration)
- Used to trigger automatic reviews and reminders

#### 3. Assignment System (`lib/assignments.js`)
- Tracks actionable tasks for candidates
- Status flow: not-started → in-progress → completed/overdue/cancelled
- Automated reminder scheduling (7 days before, 2 days before, on due date, etc.)
- Supports priority levels: high, medium, low
- Can be auto-generated from AI recommendations or manually created by consultants

#### 4. Weekly and Monthly Cycles (`lib/cycle-processor.js`)
- Automatic weekly check-ins (every 7 days)
- Automatic monthly reviews (every 30 days)
- AI-generated summaries of progress
- Stored in Redis for historical tracking
- Triggers reminders and notifications

#### 5. Email Reminder System (`lib/email-reminders.js`)
- Uses Resend service for email delivery
- Smart scheduling: max 1 email per day, combined reminders
- Types: weekly check-in, monthly review, assignment reminders, inactivity reminders
- Respects timezone and quiet hours (future enhancement)
- Tracks delivery and failures

#### 6. Login Greeting Generator (`lib/greeting-generator.js`)
- AI-generated personalized greetings on login
- Considers: journey type, current stage, recent progress, pending work
- Cached per user per day to avoid redundant API calls
- Provides specific action recommendation for the day

#### 7. Next Best Action Engine (`lib/next-best-action-engine.js`)
- Calculates recommended actions based on:
  - Journey stage and stage-specific requirements
  - Score gaps and weaknesses
  - Overdue work (highest priority)
  - In-progress assignments (continuation recommended)
  - Upcoming deadlines
- Returns top 5 prioritized actions with reasoning
- Appears in: dashboard, greetings, email reminders, AI advisor

### Database Schema

All data stored in Upstash Redis using key-value store pattern:

```
candidate:setup:${userId}
  - journeyType
  - contactEmail (confirmed email for reminders)
  - timezone
  - reminderConsent
  - reminderConsentAt
  - firstLoginCompletedAt
  - unsubscribedAt (if unsubscribed)

candidate:clock:${userId}
  - userId, journeyType
  - firstLoginCompletedAt, lastLoginAt
  - lastPortalActivityAt, lastAiAdvisorInteractionAt
  - currentStageStartedAt, stage, stageNumber
  - lastWeeklyCheckInAt, nextWeeklyCheckInAt
  - lastMonthlyReviewAt, nextMonthlyReviewAt
  - currentNextBestAction
  - timezone

assignment:${assignmentId}
  - userId, journeyType, relatedStage
  - title, description, dueDate, priority, status
  - reminderSchedule (array of reminder settings)
  - completedAt, aiFeedback, feedbackProvidedAt
  - createdAt, completionRequirements

assignments:byUser:${userId} (Redis set)
  - Collection of assignment IDs

weeklycheckins:${userId} (Redis list)
  - Historical weekly check-ins with summaries

monthlyreviews:${userId} (Redis list)
  - Historical monthly reviews with summaries

greeting:${userId}:${date} (Redis key with 24h TTL)
  - Cached login greeting for the day
```

## User Flows

### First Login Setup
1. User logs in (OAuth or password)
2. System checks `oauthDetailsConfirmed` and journey setup status
3. If not setup complete, show `FirstLoginSetup` modal (blocking)
4. Modal: Full name → Email confirmation → Profile (country, age, timezone) → Journey type selection
5. On submit:
   - Save profile details to user object
   - Initialize candidate clock
   - Save setup metadata
   - Unlock portal
   - Auto-advance to dashboard

### Daily Login
1. User logs in
2. System fetches user, journey state, and assignments
3. Generate or retrieve cached login greeting
4. Fetch next best action recommendations
5. Display dashboard with:
   - Login greeting banner
   - Journey progress (current stage, days in stage)
   - Next best action (prominent CTA)
   - Pending assignments (sorted by priority/due date)
   - Latest weekly/monthly summaries

### Weekly Cycle (Automatic)
1. Every 7 days (or on login if overdue)
2. System detects week boundary via candidate clock
3. Generates AI summary of week's progress
4. Creates notification on dashboard
5. Optionally sends email reminder if candidate inactive
6. Updates clock with next week check-in date

### Monthly Cycle (Automatic)
1. Every 30 days (same day as journey start)
2. System detects month boundary
3. Generates comprehensive monthly review via AI
4. Updates dashboard with summary
5. May trigger stage advancement if all requirements met
6. Sends email with progress report and priorities
7. Updates clock with next month review date

### Assignment Lifecycle
1. Assignment created (auto or manual)
2. Candidate sees it in dashboard/assignments page
3. Can mark as "in progress"
4. System sends reminders: 7 days before, 2 days before, on due date
5. After due date: overdue reminders at 2 days, 7 days
6. Candidate marks complete
7. All remaining reminders cancelled

### Inactivity Detection
- 3 days inactive: Gentle reminder ("we haven't seen you in a few days")
- 7 days inactive: Action-focused reminder (with next best action)
- 14 days inactive: Progress-risk reminder ("your work is at risk")
- 30 days inactive: Intervention invitation ("let's restart your journey")

## API Endpoints

### New Endpoints

```
POST /api/candidate/first-login-setup
  - Accepts: {data: {fullName, contactEmail, contactEmailConfirm, countryOfResidence, age, timezone, journeyType, reminderConsent}}
  - Returns: {ok: true, journey: {type, label}}

GET /api/greeting
  - Returns: {greeting, nextFocusArea, generatedAt, stage, daysInStage}

GET|PATCH /api/candidate/assignments
  - GET: List candidate's assignments with filters (status, sort)
  - PATCH: Update assignment status ({assignmentId, status})

GET /api/candidate/cycles
  - Query: ?type=weekly|monthly|latest, ?limit=10
  - Returns: history or latest cycle reviews

GET /api/session (MODIFIED)
  - Now returns journey, assignmentStats in addition to user and data
```

### Session Endpoint Enhancement

```javascript
// Session now returns:
{
  user: {...},
  data: {...},
  journey: {
    type: 'undergraduate',
    stage: 'Testing',
    stageNumber: 4,
    currentStageStartedAt: 1719734400000,
    daysInStage: 14,
    nextBestAction: 'Complete a GMAT practice test'
  },
  assignmentStats: {
    total: 5,
    overdue: 1,
    inProgress: 2,
    completed: 2
  }
}
```

## Frontend Components

### New Components

- **FirstLoginSetup.jsx**: Multi-step form for onboarding (blocking modal)
  - Step 1: Full name
  - Step 2: Email confirmation
  - Step 3: Profile (country, age, timezone)
  - Step 4: Journey type + reminder consent

### Modified Components

- **CandidatePortal.jsx**: 
  - Add check for journey setup completion
  - Show FirstLoginSetup if not complete
  - Display loading state while fetching journey data

- **Dashboard.jsx**: 
  - Add journey progress widget
  - Add login greeting banner
  - Add next best action prominent display
  - Add assignments/tasks widget
  - Add latest cycle review summary

- **App.jsx**: 
  - Add journey state management
  - Pass journey data to CandidatePortal
  - Handle first-login setup completion

## Scheduled Tasks (Future Backend Service)

A background service should run these jobs:

```javascript
// Every 6 hours
/api/reminders/process-batch
  - Check all active candidates
  - Identify overdue assignments
  - Detect stuck candidates
  - Queue email reminders
  - Dedupe recent reminders

// Every 7 days (or on weekly boundary)
/api/cycles/weekly-processor
  - Find candidates with weekly check-in due
  - Generate check-in summaries
  - Store in database
  - Queue notifications

// Every 30 days (or on monthly boundary)
/api/cycles/monthly-processor
  - Find candidates with monthly review due
  - Generate comprehensive reviews
  - Store in database
  - Evaluate stage completion
  - Advance stage if qualified
  - Queue notifications
```

## Implementation Status

### Completed ✅
- [x] Journey definitions and stage system
- [x] Candidate clock system
- [x] Assignment management
- [x] Email reminder templates and sending
- [x] Cycle processor (weekly/monthly)
- [x] Login greeting generator
- [x] Next best action engine
- [x] First-login setup API
- [x] Assignment management APIs
- [x] Cycle history APIs
- [x] Greeting API
- [x] Session endpoint enhancement
- [x] FirstLoginSetup React component

### In Progress / Todo
- [ ] Integration: Show FirstLoginSetup in CandidatePortal when needed
- [ ] Integration: Update CandidatePortal to display journey info
- [ ] Integration: Update Dashboard with journey widgets
- [ ] Integration: Add greeting display to dashboard
- [ ] Integration: Add assignments widget to dashboard
- [ ] Scheduler: Set up background jobs for reminders/cycles
- [ ] Email: Set up Resend webhook for delivery tracking
- [ ] Admin: Create admin panel for managing candidate journeys
- [ ] Analytics: Track journey progression and metrics
- [ ] Documentation: Update user documentation

## Configuration

### Environment Variables Required

```
RESEND_API_KEY=xxx
RESEND_FROM_EMAIL=pathway@example.com
ANTHROPIC_API_KEY=xxx (already configured)
```

### Optional Enhancements

- Time-zone aware email scheduling
- Quiet hours (don't send emails 9pm-7am in candidate's timezone)
- Customizable reminder frequency per candidate
- Integration with calendar (Google Calendar, Outlook)
- SMS reminders via Twilio (already available)
- Slack notifications for consultants
- Analytics dashboard for advisors

## Testing

### Manual Testing

1. **First Login Setup**:
   - Create new OAuth account
   - Verify setup modal appears
   - Fill out all steps
   - Verify journey initializes

2. **Dashboard**:
   - Login as existing candidate
   - Verify journey info displays
   - Verify next best action shows
   - Verify assignments list displays

3. **Weekly Cycle**:
   - Create candidate with stale clock date
   - Trigger `/api/cycles/weekly-processor`
   - Verify check-in appears on dashboard
   - Verify email sent if configured

4. **Assignments**:
   - Create test assignment
   - Verify reminders queue at correct times
   - Mark as complete
   - Verify reminders stop

5. **Email Reminders**:
   - Configure test candidate
   - Verify emails send via Resend
   - Check delivery in Resend dashboard
   - Test unsubscribe flow

## Performance Considerations

- Greeting cached per user per day (avoid redundant AI calls)
- Journey clock updated on login (single write per session)
- Assignment queries indexed by userId (Redis set membership)
- Email reminders deduplicated (check last send time)
- Cycle reviews paginated (list-based storage)

## Security Considerations

- Contact email required for reminders (user-confirmed)
- Unsubscribe flow mandatory
- No sensitive data in emails
- Links in emails use short URLs (future: link tracking)
- Rate limiting on API endpoints (future enhancement)

## Future Enhancements

1. **AI-Driven Stage Progression**: Automatically advance stages when criteria met
2. **Predictive Warnings**: Alert candidates 2 weeks before deadline using velocity analysis
3. **Customizable Reminders**: Per-candidate reminder frequency preferences
4. **Integration with Document Review**: Auto-create assignments when documents need review
5. **Peer Comparison**: Show how candidate's progress compares to others (anonymized)
6. **SMS Reminders**: Use Twilio for time-sensitive alerts
7. **Slack Integration**: Consultant notifications for stuck candidates
8. **Mobile App**: Native mobile reminders and journey tracking
