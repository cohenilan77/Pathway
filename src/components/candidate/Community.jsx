import React, { useState, useEffect } from 'react';

// Real community members - fetched from database (placeholder for now)
const COMMUNITY_MEMBERS = [
  // Members will be loaded from real user data
  // For now, showing only real connections from your cohort
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
        background: '#f6f1e8',
        flexDirection: 'column',
        gap: '15px',
      }}>
        <div style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(140deg, #94b3fb, #b899fb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 800,
          color: '#faf7f2',
        }}>
          👥
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#141b34', textAlign: 'center' }}>Select a program</div>
          <div style={{ fontSize: '12px', color: '#9098b5', textAlign: 'center', marginTop: 4 }}>Choose a program from the left to connect</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#f6f1e8' }}>
      <div style={{
        background: '#faf7f2',
        borderBottom: '1px solid #f1eadd',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#141b34' }}>
            {group.name}
          </div>
          <div style={{ fontSize: '10px', color: '#9098b5', fontWeight: 600, marginTop: '2px' }}>
            {group.memberCount} members in cohort
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
            const isSystemMessage = msg.userId === 'system';
            if (isSystemMessage) {
              return (
                <div key={msg.id} style={{
                  padding: '8px 11px',
                  background: '#f0ebdf',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#5b46e0',
                  fontWeight: 600,
                  lineHeight: 1.5,
                  textAlign: 'center',
                  margin: '4px 0',
                }}>
                  {msg.text}
                </div>
              );
            }
            return (
              <div key={msg.id} style={{ display: 'flex', gap: '7px' }}>
                <Avatar user={{ id: msg.userId, name: 'Member' }} size={22} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#141b34' }}>Member</span>
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
        width: 200,
        background: '#faf7f2',
        borderLeft: '1px solid #f1eadd',
        overflowY: 'auto',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#9098b5',
        padding: '20px',
        textAlign: 'center',
      }}>
        Select a group to see members
      </div>
    );
  }

  return (
    <div style={{
      width: 200,
      background: '#faf7f2',
      borderLeft: '1px solid #f1eadd',
      overflowY: 'auto',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '12px 12px',
        borderBottom: '1px solid #f1eadd',
        background: '#f6f1e8',
      }}>
        <div style={{
          fontSize: '9px',
          fontWeight: 800,
          letterSpacing: '.5px',
          color: '#5b46e0',
          textTransform: 'uppercase',
        }}>
          Cohort Members
        </div>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#141b34',
          marginTop: '3px',
        }}>
          {group.memberCount} in group
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {members.length === 0 ? (
          <div style={{
            padding: '20px 8px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#9098b5',
            lineHeight: 1.6,
          }}>
            <div style={{ marginBottom: '8px' }}>Connect with real members in your cohort</div>
            <div style={{ fontSize: '11px' }}>Members from your program will appear here</div>
          </div>
        ) : (
          members.map(member => (
            <div key={member.id} style={{
              marginBottom: '8px',
              background: '#fff',
              border: '1px solid #f1eadd',
              borderRadius: '8px',
              padding: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <Avatar user={member} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#141b34', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getMemberDisplay(member, member.residency)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onOpenDM(member.id)}
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#5b46e0',
                  color: '#faf7f2',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '8.5px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => !loading && (e.target.style.background = '#4a38c4')}
                onMouseLeave={(e) => !loading && (e.target.style.background = '#5b46e0')}
              >
                Study partner →
              </button>
            </div>
          ))
        )}
      </div>
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
      setMembers([]);
      setMessages([]);
      return;
    }

    // Must have programs
    if (!programs || programs.length === 0) {
      setGroups([]);
      setMembers([]);
      setMessages([]);
      return;
    }

    const generatedGroups = [];

    // Create ONE group per program user selected
    programs.forEach(program => {
      const programName = typeof program === 'string' ? program : (program.name || program.program || String(program));

      generatedGroups.push({
        id: programName.toLowerCase().replace(/\s+/g, '-'),
        name: programName,
        program: programName,
        category,
        memberCount: 1, // Just current user until real members load
        isMember: true,
        eligibleUsers: [], // Real members will be fetched from API
      });
    });

    setGroups(generatedGroups);

    // Auto-select first group and populate its data
    if (generatedGroups.length > 0) {
      const firstGroup = generatedGroups[0];
      setSelectedGroupId(firstGroup.id);
      setMembers([]);
      setMessages([
        { id: 1, userId: 'system', text: `Welcome to ${firstGroup.name}! 👋 Connect with other members in this program by clicking "Study partner →"`, createdAt: Date.now() - 300000 },
      ]);
    }
  }, [profile?.category, programs]);

  // Update members and messages when selected group changes
  useEffect(() => {
    if (selectedGroup) {
      setMembers(selectedGroup.eligibleUsers || []);
      setMessages([
        { id: 1, userId: 'system', text: `Welcome to ${selectedGroup.name}! 👋 Connect with other members in this program by clicking "Study partner →"`, createdAt: Date.now() - 300000 },
      ]);
    }
  }, [selectedGroupId, selectedGroup?.id]);

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
