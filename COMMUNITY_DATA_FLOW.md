# Community Feature - Complete Data Flow Guide

## Problem
Community tab exists but shows blank page. No groups, no data. The system isn't connected.

## Solution
Wire up these data points in this exact order:

---

## 1. USER DATA → Community Component

### Current State
- User selects schools/programs in Settings or Analysis
- This data stored in `userData` in app state
- Community component receives `props` but doesn't access user selections

### What needs to happen
```jsx
// In App.jsx or wherever user data is stored:
const userData = {
  profile: {
    category: "Graduate",        // Undergraduate, Graduate, Postgraduate/Doctoral, Personal Development
    grade: "12th",              // For undergraduates only
  },
  selectedSchools: [            // User's selected schools
    "Harvard",
    "Stanford", 
    "MIT"
  ],
  selectedPrograms: [           // User's selected programs
    "MBA",
    "MS Computer Science"
  ]
}

// This data must be passed to CandidatePortal as props:
// → chosenSchools (already being passed)
// → programs (already being passed)
// → need to also pass: selectedSchools OR access from localStorage
```

### Fix Required
Find where `chosenSchools` and `programs` come from in App.jsx.
Verify they contain the user's actual selections.
Pass them to CandidatePortal → Community component.

---

## 2. COMMUNITY COMPONENT → Receive Data

### Current State
```jsx
export default function Community(props) {
  // Community receives props but doesn't destructure what it needs
}
```

### What needs to happen
```jsx
export default function Community(props) {
  const {
    profile,              // ← Contains category, grade
    programs,             // ← Array of programs
    chosenSchools,        // ← Array of school names
    authToken,            // ← For API calls
    authUser,             // ← Current user data
    showToast,            // ← For notifications
  } = props;

  // Now we have: profile.category, profile.grade, chosenSchools[], programs[]
  // This is the DATA the Community needs to work
}
```

### The Flow
```
User's Profile
  ↓
App.jsx state (userData)
  ↓
Pass chosenSchools + programs to CandidatePortal
  ↓
CandidatePortal passes {...props} to Community
  ↓
Community destructures chosenSchools + programs
  ↓
Community uses this to generate groups
```

---

## 3. GENERATE GROUPS From User Data

### Current State
Community tries to fetch groups from API that don't exist

### What needs to happen
```jsx
// In Community.jsx useEffect:

useEffect(() => {
  // Step 1: Validate we have user category
  if (!profile?.category) {
    setGroups([]);
    return;
  }

  // Step 2: Get user's selections
  const schools = chosenSchools || [];      // ["Harvard", "Stanford", "MIT"]
  const progs = programs || [];              // ["MBA", "MS CS", etc.]
  const category = profile.category;         // "Graduate"
  const grade = profile.grade;               // "12th" (for undergrad only)

  // Step 3: Validate we have schools
  if (schools.length === 0) {
    setGroups([]);  // No groups without schools
    return;
  }

  // Step 4: Generate groups from school × program combinations
  const generatedGroups = [];

  schools.forEach(school => {
    if (progs.length > 0) {
      progs.forEach(program => {
        // Create one group per school+program combo
        generatedGroups.push({
          id: `${school.toLowerCase()}-${program.toLowerCase()}`,
          name: `${school} - ${program}`,
          school,
          program,
          category,
          grade,
          memberCount: 15,          // Mock data
          isMember: false,          // User not member yet
        });
      });
    } else {
      // No programs? Create school-only group
      generatedGroups.push({
        id: `${school.toLowerCase()}-general`,
        name: `${school} Community`,
        school,
        program: null,
        category,
        grade,
        memberCount: 20,
        isMember: false,
      });
    }
  });

  // Step 5: Set groups in state
  setGroups(generatedGroups);

  // Step 6: Select first group by default
  if (generatedGroups.length > 0) {
    setSelectedGroupId(generatedGroups[0].id);
  }
}, [profile, chosenSchools, programs]);
```

---

## 4. DISPLAY GROUPS in Left Panel

### Current State
Left panel exists but receives empty groups array

### What needs to happen
```jsx
// CommunityLeftPanel already renders:
// - groups.filter(g => g.isMember)     // "My Groups"
// - groups.filter(g => !g.isMember)    // "Available"

// So if groups array has data from Step 3, it will display automatically
// No changes needed here - it just needs data from Step 3
```

---

## 5. DISPLAY GROUP FEED in Center Panel

### Current State
CommunityFeed shows empty even when group is selected

### What needs to happen
```jsx
// In CommunityFeed component:

function CommunityFeed({ groupId, group, messages, onSendMessage, loading }) {
  // group comes from props - it's the selected group object
  // Should have: group.name, group.memberCount, etc.
  
  // For now, mock messages since API endpoints don't exist yet
  const mockMessages = [
    { id: 1, userId: 'user1', text: 'Welcome!', createdAt: Date.now() },
    { id: 2, userId: 'user2', text: 'Hi everyone', createdAt: Date.now() },
  ];

  return (
    <div>
      <div>{group?.name || 'Select a group'}</div>
      <div>
        {messages.length > 0 ? messages : mockMessages}
      </div>
      <input placeholder="Type message..." />
    </div>
  );
}
```

---

## 6. DISPLAY MEMBERS in Right Panel

### Current State
Members panel exists but shows no members

### What needs to happen
```jsx
// For now, generate mock members from group:
useEffect(() => {
  if (!selectedGroup) {
    setMembers([]);
    return;
  }

  // Mock members - in real version, fetch from API
  const mockMembers = [
    {
      id: 'user1',
      name: 'John Smith',
      residency: 'United States',
      tags: [selectedGroup.school, selectedGroup.program],
      isFriend: false,
    },
    {
      id: 'user2',
      name: 'Sarah Chen',
      residency: 'Taiwan',
      tags: [selectedGroup.school, selectedGroup.program],
      isFriend: false,
    },
    {
      id: 'user3',
      name: 'Alex Rodriguez',
      residency: 'Spain',
      tags: [selectedGroup.school, selectedGroup.program],
      isFriend: true,
    },
  ];

  setMembers(mockMembers);
}, [selectedGroup]);
```

---

## 7. WIRE UP BUTTON ACTIONS

### What needs to happen
```jsx
// Join Group button
const handleJoinGroup = async (groupId) => {
  // For now: just update isMember in local state
  setGroups(groups.map(g =>
    g.id === groupId ? { ...g, isMember: true } : g
  ));
};

// Send Message button
const handleSendMessage = async (groupId, text) => {
  // For now: just add to local messages array
  setMessages([...messages, {
    id: Date.now(),
    userId: authUser.id,
    text,
    createdAt: Date.now(),
  }]);
};

// Send Friend Request button
const handleFriendRequest = async (memberId) => {
  console.log('Friend request to:', memberId);
  // Will implement later
};
```

---

## CHECKLIST: What needs to be coded

- [ ] **Step 1**: Verify `chosenSchools` and `programs` are being passed to CandidatePortal from App.jsx
- [ ] **Step 2**: Community component destructures `chosenSchools`, `programs` from props
- [ ] **Step 3**: Community.jsx useEffect generates groups from chosenSchools × programs
- [ ] **Step 4**: Left panel receives and displays generated groups (already coded)
- [ ] **Step 5**: Center panel displays selected group with mock messages
- [ ] **Step 6**: Right panel displays mock members based on selected group
- [ ] **Step 7**: Join/Message/Friend buttons trigger local state updates

---

## PRIORITY ORDER (do this to get it working)

### Phase 1: Make it visible (2 hours)
1. Verify chosenSchools + programs reach Community component
2. Add console.log to check what data is available
3. If data is there, remove all API calls - use local state only
4. Generate groups from user selections (Step 3)
5. Display them (Steps 4-5-6)
6. Add mock data for messages and members

### Phase 2: Make it functional (4 hours)
1. Wire button handlers to update local state
2. Add join/unjoin group logic
3. Add message posting logic
4. Add friendship request logic

### Phase 3: Make it persistent (8 hours)
1. Create actual API endpoints (groups, messages, friendships)
2. Replace mock data with API calls
3. Add Redis storage
4. Add authorization checks

---

## Summary

**The core issue**: Community component isn't getting `chosenSchools` and `programs` data from App.jsx, so it has nothing to display.

**The fix**: 
1. Trace where chosenSchools/programs come from in App.jsx
2. Confirm they're being passed to CandidatePortal
3. Community component destructures them
4. Generate groups from this data
5. Display in UI

Once that works, the rest is just wiring up button handlers and adding mock/real data.

---

**Next step**: Check App.jsx to see how chosenSchools and programs are stored and passed. That's the root of the problem.
