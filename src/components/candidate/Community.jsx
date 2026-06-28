import React, { useState, useEffect } from 'react';

// Mock users for community (in real version, fetch from API)
const MOCK_USERS = [
  { id: 'u1', name: 'John Smith', residency: 'USA', programs: ['MBA', 'MS Finance'] },
  { id: 'u2', name: 'Sarah Chen', residency: 'Taiwan', programs: ['MBA', 'MS CS'] },
  { id: 'u3', name: 'Alex Rodriguez', residency: 'Spain', programs: ['MS CS', 'MS AI'] },
  { id: 'u4', name: 'Maria Garcia', residency: 'Mexico', programs: ['MBA'] },
  { id: 'u5', name: 'James Brown', residency: 'UK', programs: ['MS Finance', 'MBA'] },
  { id: 'u6', name: 'Li Wei', residency: 'China', programs: ['MS CS', 'MS AI'] },
];

function getInitials(firstName, lastName) {
  return `${(firstName || '').charAt(0).toUpperCase()}.${(lastName || '').charAt(0).toUpperCase()}`;
}

function getMemberDisplay(user, residency = 'Country not provided') {
  if (!user) return '';
  const names = (user.name || '').split(' ');
  const first = names[0] || '';
  const last = names[names.length - 1] || '';
  const initials = getInitials(first, last);
  return `${initials} · ${residency || 'Country not provided'}`;
}

function Avatar({ user, size = 32 }) {
  if (!user) return null;
  const names = (user.name || '').split(' ');
  const first = names[0] || '';
  const last = names[names.length - 1] || '';
  const initials = getInitials(first, last);
  const colors = ['#94b3fb', '#b899fb', '#fbd2a2', '#fcbfcf', '#b8f0de', '#ffd6b2', '#f7c1c1'];
  const hash = (user.id || '').charCodeAt(0) || 0;
  const color = colors[hash % colors.length];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size / 3),
        background: `linear-gradient(140deg, ${color}, ${colors[(hash + 1) % colors.length]})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.35),
        fontWeight: 800,
        color: '#faf7f2',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function CommunityLeftPanel({ groups, selectedGroupId, onSelectGroup, onJoinGroup, loading }) {
  return (
    <div style={{
      width: 160,
      background: '#faf7f2',
      borderRight: '1px solid #f1eadd',
      overflowY: 'auto',
      flexShrink: 0,
      padding: '7px 0',
    }}>
      {groups.length > 0 && (
        <>
          <div style={{
            fontSize: '8.5px',
            fontWeight: 800,
            letterSpacing: '.6px',
            color: '#9098b5',
            textTransform: 'uppercase',
            padding: '9px 11px 3px',
          }}>Programs</div>
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 9px 5px 11px',
                cursor: 'pointer',
                borderLeft: selectedGroupId === group.id ? '2px solid #5b46e0' : '2px solid transparent',
                background: selectedGroupId === group.id ? 'rgba(91,70,224,.06)' : 'transparent',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                fontFamily: 'inherit',
              }}
            >
              <span style={{
                fontSize: '10.5px',
                fontWeight: selectedGroupId === group.id ? 800 : 600,
                color: selectedGroupId === group.id ? '#5b46e0' : '#33405e',
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {group.name}
              </span>
              <span style={{
                background: '#5b46e0',
                color: '#faf7f2',
                fontSize: '8px',
                fontWeight: 800,
                borderRadius: '999px',
                padding: '1.5px 4.5px',
                flexShrink: 0,
              }}>
                {group.memberCount}
              </span>
            </button>
          ))}
        </>
      )}

      {groups.length === 0 && (
        <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: '12px', color: '#9098b5' }}>
          Select programs in Settings to see communities.
        </div>
      )}
    </div>
  );
}

function CommunityFeed({ groupId, group, messages, onSendMessage, loading, currentUser }) {
  const [messageText, setMessageText] = useState('');

  const handleSend = async () => {
    if (!messageText.trim()) return;
    await onSendMessage(groupId, messageText);
    setMessageText('');
  };

  if (!group) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#eef1fc',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#141b34' }}>Select a group</div>
        <div style={{ fontSize: '12px', color: '#9098b5' }}>Choose a group to start chatting</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#eef1fc' }}>
      <div style={{
        background: '#faf7f2',
        borderBottom: '1px solid #f1eadd',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#141b34' }}>
            # {group.name}
          </div>
          <div style={{ fontSize: '9.5px', color: '#9098b5', fontWeight: 600, marginTop: '2px' }}>
            {group.memberCount} members
          </div>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px 11px',
        display: 'flex',
        flexDirection: 'column',
        gap: '11px',
      }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9098b5', fontSize: '12px' }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map(msg => {
            const user = MOCK_USERS.find(u => u.id === msg.userId);
            const displayName = user ? user.name.split(' ')[0] : 'Anon';
            const displayUser = user || { id: msg.userId, name: displayName };
            return (
              <div key={msg.id} style={{ display: 'flex', gap: '7px' }}>
                <Avatar user={displayUser} size={22} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#141b34' }}>{displayName}</span>
                    <span style={{ fontSize: '8.5px', color: '#b2bad2' }}>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#33405e',
                    lineHeight: 1.55,
                    background: '#faf7f2',
                    borderRadius: '3px 10px 10px 10px',
                    padding: '6px 9px',
                    border: '1px solid #f1eadd',
                    display: 'inline-block',
                    maxWidth: '100%',
                  }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{
        background: '#faf7f2',
        borderTop: '1px solid #f1eadd',
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexShrink: 0,
      }}>
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder={`Message # ${group.name}...`}
          style={{
            flex: 1,
            background: '#f6f1e8',
            border: '1px solid #f1eadd',
            borderRadius: '10px',
            padding: '6px 10px',
            fontSize: '11px',
            color: '#141b34',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !messageText.trim()}
          style={{
            background: '#5b46e0',
            border: 'none',
            borderRadius: '8px',
            width: '27px',
            height: '27px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#faf7f2',
            opacity: loading || !messageText.trim() ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function CommunityMembers({ groupId, group, members, onOpenDM, loading }) {
  if (!group) {
    return (
      <div style={{
        width: 160,
        background: '#faf7f2',
        borderLeft: '1px solid #f1eadd',
        overflowY: 'auto',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#9098b5',
      }}>
        Select a group
      </div>
    );
  }

  return (
    <div style={{
      width: 160,
      background: '#faf7f2',
      borderLeft: '1px solid #f1eadd',
      overflowY: 'auto',
      flexShrink: 0,
    }}>
      <div style={{ padding: '8px 8px 5px', borderBottom: '1px solid #f1eadd' }}>
        <div style={{
          fontSize: '8.5px',
          fontWeight: 800,
          letterSpacing: '.6px',
          color: '#9098b5',
          textTransform: 'uppercase',
        }}>
          Members — {group.memberCount}
        </div>
      </div>

      {members.length === 0 ? (
        <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: '12px', color: '#9098b5' }}>
          No members yet
        </div>
      ) : (
        members.map(member => (
          <div key={member.id} style={{
            margin: '6px 6px 0',
            background: '#f6f1e8',
            border: '1px solid #f1eadd',
            borderRadius: '11px',
            padding: '8px',
          }}>
            <Avatar user={member} size={22} />
            <div style={{ marginTop: '5px', fontSize: '9px', color: '#9098b5', fontWeight: 700 }}>
              {getMemberDisplay(member, member.residency)}
            </div>
            <button
              onClick={() => onOpenDM(member.id)}
              disabled={loading}
              style={{
                marginTop: '6px',
                width: '100%',
                background: '#5b46e0',
                color: '#faf7f2',
                border: 'none',
                borderRadius: '7px',
                padding: '5px',
                fontSize: '9.5px',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              Message →
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default function Community(props) {
  const { authToken, authUser, profile, showToast, setCandTab, send, programs = [] } = props;
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  // Generate groups ONLY from user's selected programs
  useEffect(() => {
    const category = profile?.category;

    // Must have category
    if (!category) {
      setGroups([]);
      return;
    }

    // Must have programs
    if (!programs || programs.length === 0) {
      setGroups([]);
      return;
    }

    const generatedGroups = [];

    // Create ONE group per program user selected
    programs.forEach(program => {
      const programName = typeof program === 'string' ? program : (program.name || program.program || String(program));

      // Find other users in this program
      const usersInProgram = MOCK_USERS.filter(u => u.programs.includes(programName));

      generatedGroups.push({
        id: programName.toLowerCase().replace(/\s+/g, '-'),
        name: programName,
        program: programName,
        category,
        memberCount: usersInProgram.length + 1, // +1 for current user
        isMember: true, // User is automatically in groups for their programs
        eligibleUsers: usersInProgram,
      });
    });

    setGroups(generatedGroups);
    if (generatedGroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(generatedGroups[0].id);
    }
  }, [profile?.category, programs]);

  // Update members when selected group changes
  useEffect(() => {
    if (selectedGroup && selectedGroup.eligibleUsers) {
      setMembers(selectedGroup.eligibleUsers);
      // Load mock messages for this group
      setMessages([
        { id: 1, userId: 'u1', text: 'Welcome to ' + selectedGroup.name + '! Great to connect with everyone here.', createdAt: Date.now() - 300000 },
        { id: 2, userId: 'u3', text: 'Hi all! Looking forward to collaborating with this group.', createdAt: Date.now() - 120000 },
      ]);
    } else {
      setMembers([]);
      setMessages([]);
    }
  }, [selectedGroup?.id]);

  const handleJoinGroup = async (groupId) => {
    // User is automatically member of program groups, so just show success
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setMembers(group.eligibleUsers || []);
      showToast('You are now part of this community!', 'success');
    }
  };

  const handleSendMessage = async (groupId, text) => {
    setLoading(true);
    try {
      // For now, use mock data - in production, this would call an API
      const newMessage = {
        id: Date.now(),
        userId: authUser?.id || 'current-user',
        text: text,
        createdAt: Date.now(),
      };

      setMessages([...messages, newMessage]);
      showToast('Message sent!', 'success');
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDM = (memberId) => {
    showToast('Direct messaging coming soon', 'info');
  };

  const category = profile?.category;
  const canAccessCommunity = category && ['Undergraduate', 'Graduate', 'Postgraduate / Doctoral', 'Personal Development'].includes(category);

  if (!canAccessCommunity) {
    return (
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '10px',
        background: '#f6f1e8',
      }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#141b34' }}>Community not available</div>
        <div style={{ fontSize: '12px', color: '#9098b5', maxWidth: 400, textAlign: 'center' }}>
          {category ? 'Please complete your profile to access the community.' : 'This feature is not available for your user type.'}
        </div>
      </div>
    );
  }

  if (category === 'Undergraduate') {
    const grade = profile?.grade;
    if (!grade || !['11th', '12th'].includes(grade)) {
      return (
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#141b34' }}>Community available for grades 11–12</div>
          <div style={{ fontSize: '12px', color: '#9098b5', maxWidth: 400, textAlign: 'center' }}>
            Community is available to high school students in 11th or 12th grade only.
          </div>
        </div>
      );
    }
  }

  if (loading && groups.length === 0) {
    return (
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f6f1e8',
      }}>
        <div style={{ textAlign: 'center', fontSize: '14px', color: '#9098b5' }}>
          Loading Community...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: 'flex',
      background: '#eef1fc',
    }}>
      <CommunityLeftPanel
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
        onJoinGroup={handleJoinGroup}
        loading={loading}
      />
      <CommunityFeed
        groupId={selectedGroupId}
        group={selectedGroup}
        messages={messages}
        onSendMessage={handleSendMessage}
        loading={loading}
        currentUser={authUser}
      />
      <CommunityMembers
        groupId={selectedGroupId}
        group={selectedGroup}
        members={members}
        onOpenDM={handleOpenDM}
        loading={loading}
      />
    </div>
  );
}
