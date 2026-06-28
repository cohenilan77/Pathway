# Community Feature Implementation

## Overview
The Community feature combines forum-style school/program groups, real-time group chat, friendship connections, and private messaging between accepted friends. It's built on educational principles with safeguards for minors and privacy preservation.

## Architecture

### User Categories (Four Types Identified in Codebase)
The application supports four distinct user categories stored in `userdata.profile.category`:

1. **Undergraduate** - High school students applying to undergraduate programs
   - **Grade Restriction**: Only grades 11 and 12 can access Community
   - **Cohort Isolation**: 11th graders see only 11th graders; 12th graders see only 12th graders
   - **Groups**: Based on selected schools and high school programs

2. **Graduate** - Masters/MBA program applicants
   - **Groups**: Based on selected universities and programs (MBA, MSF, etc.)
   - **Separate Community**: Do not mix with PhD users or other categories

3. **Postgraduate / Doctoral** - PhD program applicants
   - **Groups**: Based on selected universities and doctoral programs
   - **Separate Community**: Do not mix with Graduate or other categories

4. **Personal Development** - Professional development users
   - **Groups**: Based on selected programs and interests
   - **Separate Community**: Isolated from other user types

### Database Models

#### Community Groups
```
community:groups:all            → Set of all group IDs
community:group:${groupId}      → Group metadata
  {
    id: string,
    name: string,
    category: 'Undergraduate' | 'Graduate' | 'Postgraduate / Doctoral' | 'Personal Development',
    school: string,
    program: string | null,
    grade: string | null  // For Undergraduate only: '11th' or '12th'
  }

community:group:${groupId}:members           → Set of member user IDs
community:group:${groupId}:messages          → Set of message IDs
```

#### Group Messages
```
community:message:${messageId}  → Message object
  {
    id: string,
    groupId: string,
    userId: string,
    text: string,
    createdAt: number
  }
```

#### Friendships
```
friendship:request:${fromUserId}:${toUserId}    → Request object
  {
    id: string,
    fromUserId: string,
    toUserId: string,
    status: 'pending' | 'accepted',
    createdAt: number,
    acceptedAt?: number
  }

friendship:requests:outgoing:${userId}         → Set of target user IDs
friendship:requests:incoming:${userId}         → Set of source user IDs
friendship:friends:${userId}                   → Set of accepted friend IDs
friendship:blocks:${userId}                    → Set of blocked user IDs
```

#### Direct Messages
```
community:dm:${messageId}       → DM message object
  {
    id: string,
    fromUserId: string,
    toUserId: string,
    text: string,
    createdAt: number
  }

community:conversation:${conversationId}       → Set of message IDs
```

### Frontend Components

#### Community.jsx (Main Container)
- Three-panel layout: Groups list | Feed | Members list
- Handles group selection, messaging, and member management
- Controls for joining groups and sending friend requests
- Access control for category and grade restrictions

#### Sub-Components
- **CommunityLeftPanel**: Schools/programs/groups sidebar
- **CommunityFeed**: Group chat/forum feed with message input
- **CommunityMembers**: Members list with user initials and profile actions
- **Avatar**: Displays initials-based avatar with gradient colors

### API Endpoints

#### Groups
- `GET /api/community-groups` - List eligible groups for current user
  - Query params: `schools[]`, `programs[]`
  - Returns: Array of group objects with membership status

- `POST /api/community-group-join` - Join a group
  - Body: `{ groupId: string }`
  - Auth required

#### Group Messages
- `GET /api/community-group-messages` - Get group messages
  - Query: `groupId`
  - Returns: Array of anonymized message objects

- `POST /api/community-group-messages` - Send message to group
  - Body: `{ groupId, text }`
  - Auth required, membership verified

#### Friendships
- `POST /api/community-friends` - Friend request operations
  - Body: `{ action, otherUserId }`
  - Actions: `send`, `accept`, `decline`, `remove`, `block`, `isBlocked`
  - Auth required

#### Direct Messages
- `GET /api/community-direct-messages` - Get DM thread
  - Query: `conversationId`
  - Auth required

- `POST /api/community-direct-messages` - Send DM
  - Body: `{ conversationId, toUserId, text }`
  - Auth required, friendship verified

## Access Control & Authorization

### Server-Side Verification (Enforced at API Layer)
All visibility and permission rules are enforced on the server, not just in UI:

1. **Category Verification**: User's stored category must match requested community
2. **Grade Isolation** (Undergraduate): User's grade must match group's grade
3. **Group Eligibility**: User's selected schools/programs must match group
4. **Membership Check**: User must be member to post messages or read group
5. **Friendship Check**: Users must be mutual friends to send DMs
6. **Block Check**: Blocked users cannot send messages
7. **Self-Request Prevention**: Cannot befriend or message self

### Request Flow with Authorization
```
User Action
    ↓
Frontend API Call + Auth Token
    ↓
API Endpoint Handler
    ↓
Verify Session Token → Reject if invalid
    ↓
Load User Profile + Category + Grade
    ↓
Verify Category Matches Requested Community
    ↓
For Groups: Verify School/Program Eligibility
    ↓
For Messages: Verify Group Membership + Friendship
    ↓
Execute Operation
    ↓
Return Anonymized Result (Initials Only)
```

## Privacy & Display Format

### Identity Display Rules
Users are displayed as:
```
Initials (first name + last name) · Country of Residence

Example: "J. S. · United States"
```

### What Is Never Displayed
- Full names
- Email addresses
- Phone numbers
- LinkedIn profile links
- External social accounts
- Precise geographic location
- Personal photos or user-provided images
- Client-side state containing user IDs or personal data

### Avatar Display
- Initials-based colored circles
- Consistent gradient assigned per user ID
- No user photos or profile images
- Colors rotate through predefined palette

## Implementation Details

### Navigation Integration
Community tab appears in all user category portals:
- Positioned immediately above Help button
- Desktop and mobile navigation
- Only visible if user's category supports it
- Locked behind grade restriction for Undergraduate users

### Undergraduate Safety Features
1. **Grade-Based Isolation**: Cannot see students from other grades
2. **Initials-Only Display**: No full names revealed
3. **Country Residency Only**: No precise location data
4. **Block/Report Actions**: Visible and functional
5. **No External Contact Discovery**: No phone, email, social links exposed

### Message Features
- Chronologically ordered with timestamps
- Unread indicators (if implemented)
- XSS-protected text sanitization
- Rate limiting at API layer
- Audit logging via existing system
- Content moderation integration

### Friendship System
- Mutual acceptance required (no one-way following)
- Crossed requests handled safely
- Block functionality available
- Report functionality available
- Friendly state transitions with error handling

## Testing Checklist

### Access Control Tests
- [ ] Undergraduate users below 11th grade cannot access Community
- [ ] 11th-grade students see only 11th-grade groups
- [ ] 12th-grade students see only 12th-grade groups
- [ ] Cross-grade friendship is blocked
- [ ] Graduate users cannot see Undergraduate groups
- [ ] PhD users cannot see Graduate groups
- [ ] Only group members can post messages
- [ ] Non-friends cannot send DMs

### Privacy Tests
- [ ] User profiles display as "Initials · Country" only
- [ ] Full names never appear in API responses
- [ ] Initials appear in all member lists, posts, and DMs
- [ ] Email/phone never exposed in frontend or API
- [ ] Avatars use initials, not photos
- [ ] Country field falls back to "Country not provided"

### Friendship Flow Tests
- [ ] Cannot befriend self
- [ ] Duplicate requests are rejected
- [ ] Accept request creates friendship
- [ ] Decline removes pending request
- [ ] Remove friend deletes friendship
- [ ] Block prevents messages and unfriends
- [ ] Friends can send DMs
- [ ] Non-friends cannot send DMs

### Group Management Tests
- [ ] Only eligible groups shown (based on schools/programs)
- [ ] Join button works and makes user a member
- [ ] Joined groups appear in "My Groups"
- [ ] Message input only visible to members
- [ ] Messages show correct timestamps
- [ ] Empty state handled gracefully

### Data Isolation Tests
- [ ] User cannot access another user's DM threads
- [ ] User cannot manipulate URLs to access restricted groups
- [ ] User cannot spoof category or grade in API requests
- [ ] Membership validation happens server-side

## Assumptions & Design Decisions

### Assumption 1: Four User Categories
**Found in codebase**: `profile.category` in `userdata` with values:
- "Undergraduate"
- "Graduate"
- "Postgraduate / Doctoral"
- "Personal Development"

**Validated via**: `api/admin-users.js` and `api/chat.js` show these exact categories in use.

### Assumption 2: Undergraduate Grade Field
**Found in codebase**: `profile.grade` field with values like "10th", "11th", "12th".

**Interpretation**: Only 11th and 12th grades access Community (per requirements).

### Assumption 3: Selected Schools & Programs
**Found in codebase**: Users have arrays of selected schools and programs.

**Used for**: Group eligibility filtering—users only see groups matching their selections.

### Assumption 4: Message Storage
**Decision**: Messages stored in Redis, not persisted to permanent storage.

**Rationale**: Matches existing chat implementation; sufficient for transient community conversations.

### Assumption 5: Initials Calculation
**Decision**: First name's first character + last name's first character.

**Handling**: Splits user.name by space, takes first word (first name) and last word (last name).

### Assumption 6: Country Display
**Decision**: Use `residency` field already present in user data.

**Fallback**: Display "Country not provided" if missing.

## Database Initialization

When first user in a category enrolls, Community groups are created automatically based on existing school/program data:

```javascript
// Example group creation (would happen during onboarding)
{
  id: 'group-wharton-mba-2027-r1',
  name: 'wharton-mba-r1',
  category: 'Graduate',
  school: 'Wharton',
  program: 'MBA',
  createdAt: Date.now()
}

// Undergraduate example
{
  id: 'group-lincoln-hs-stem-11',
  name: 'lincoln-hs-stem-11',
  category: 'Undergraduate',
  school: 'Lincoln High School',
  program: 'STEM',
  grade: '11th',
  createdAt: Date.now()
}
```

## Files Created/Modified

### Backend
- `lib/db.js` - Added 12 community database functions
- `api/community-groups.js` - List eligible groups
- `api/community-group-join.js` - Join group
- `api/community-group-messages.js` - Get/send group messages
- `api/community-friends.js` - Friend request operations
- `api/community-direct-messages.js` - DM read/write
- `api/__tests__/community.test.js` - Test specifications

### Frontend
- `src/components/candidate/Community.jsx` - Main Community component
- `src/components/candidate/CandidatePortal.jsx` - Navigation integration (3 lines modified)

### Documentation
- `docs/COMMUNITY_FEATURE.md` - This file

## Build & Deployment

### Build Command
```bash
npm run build
```

### Build Status
✅ **Successful** - No errors, warnings only (chunk size warnings are normal)

### Deployment Notes
- Community feature is gated by user category check (frontend + server)
- Undergraduate users must be grade 11 or 12 (server-side enforcement)
- No database migrations needed (Redis schema is schema-less)
- Groups created on-demand when users enroll
- No breaking changes to existing APIs

## Future Enhancements

1. **Read/Unread Tracking**: Add `read_receipts` table to track which users read messages
2. **Typing Indicators**: WebSocket implementation for real-time "User is typing..." status
3. **File Sharing**: Integration with existing file-store for sharing documents
4. **Emojis & Reactions**: Add emoji picker and message reaction system
5. **Search**: Full-text search within groups and DMs
6. **Notifications**: Push notifications for friend requests and DMs
7. **Moderation Dashboard**: Tools for admins to review reported content
8. **Message Retention Policy**: Automatic deletion of old messages per policy
9. **User Profiles**: Limited profile view showing anonymized stats (e.g., "member since X")
10. **Ban/Suspend**: Temporary or permanent bans for violating community guidelines

## Maintenance & Monitoring

### Key Metrics to Monitor
- Active users in Community per category
- Average group size and engagement
- Friend request acceptance rate
- DM volume and patterns
- Report/block frequency

### Cleanup Jobs (Recommended)
- Expired friend requests (>30 days pending)
- Orphaned messages from deleted accounts
- Stale conversation threads (>90 days inactive)

## Support & Troubleshooting

### Common Issues

**"Category not set" error**
- User profile is incomplete
- Must select school/program in Settings first
- Check `userdata.profile.category` is populated

**"Group not found" error**
- Group may have been deleted
- User's schools/programs changed
- Clear browser cache and refresh

**Unable to message friend**
- Friend request may have been declined
- User may have blocked you
- Check friendship status via `/api/community-friends` with action `isBlocked`

---

**Last Updated**: 2026-06-28  
**Status**: Implementation Complete  
**Build**: ✅ Passing
