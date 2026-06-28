import React, { useState, useEffect, useRef } from 'react';

// Real community members - fetched from database (placeholder for now)
const COMMUNITY_MEMBERS = [
  // Members will be loaded from real user data
  // For now, showing only real connections from your cohort
];

function getInitials(firstName, lastName) {
  return `${(firstName || '').charAt(0).toUpperCase()}.${(lastName || '').charAt(0).toUpperCase()}`;
}

function getMemberDisplay(user, residency = '') {
  if (!user) return '';
  const names = (user.name || '').split(' ');
  const first = names[0] || '';
  const last = names[names.length - 1] || '';
  const initials = getInitials(first, last);
  return `${initials}${residency ? ' · ' + residency : ''}`;
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

function CommunityLeftPanel({ groups, personalChats, selectedGroupId, onSelectGroup, loading }) {
  return (
    <div style={{
      width: 180,
      background: '#faf7f2',
      borderRight: '1px solid #f1eadd',
      overflowY: 'auto',
      flexShrink: 0,
      padding: '8px 0',
    }}>
      {groups.length > 0 && (
        <>
          <div style={{
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '.6px',
            color: '#5b46e0',
            textTransform: 'uppercase',
            padding: '12px 13px 6px',
          }}>
            📚 Programs
          </div>
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 11px 8px 13px',
                cursor: 'pointer',
                borderLeft: selectedGroupId === group.id ? '3px solid #5b46e0' : '3px solid transparent',
                background: selectedGroupId === group.id ? 'rgba(91,70,224,.08)' : 'transparent',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{
                fontSize: '12px',
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
                background: selectedGroupId === group.id ? '#5b46e0' : '#e8ddd1',
                color: selectedGroupId === group.id ? '#faf7f2' : '#33405e',
                fontSize: '9px',
                fontWeight: 700,
                borderRadius: '999px',
                padding: '2px 6px',
                flexShrink: 0,
              }}>
                {group.memberCount}
              </span>
            </button>
          ))}
        </>
      )}

      {personalChats.length > 0 && (
        <>
          <div style={{
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '.6px',
            color: '#5b46e0',
            textTransform: 'uppercase',
            padding: '12px 13px 6px',
            marginTop: '8px',
            borderTop: '1px solid #f1eadd',
          }}>
            💬 Personal Chats
          </div>
          {personalChats.map(chat => (
            <button
              key={chat.id}
              onClick={() => onSelectGroup(chat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 11px 8px 13px',
                cursor: 'pointer',
                borderLeft: selectedGroupId === chat.id ? '3px solid #5b46e0' : '3px solid transparent',
                background: selectedGroupId === chat.id ? 'rgba(91,70,224,.08)' : 'transparent',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{
                fontSize: '12px',
                fontWeight: selectedGroupId === chat.id ? 800 : 600,
                color: selectedGroupId === chat.id ? '#5b46e0' : '#33405e',
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {chat.name}
              </span>
            </button>
          ))}
        </>
      )}

      {groups.length === 0 && personalChats.length === 0 && (
        <div style={{ padding: '30px 14px', textAlign: 'center', fontSize: '13px', color: '#9098b5', lineHeight: 1.6 }}>
          <div style={{ fontSize: 24, marginBottom: '10px' }}>📚</div>
          Select programs in Settings to see communities.
        </div>
      )}
    </div>
  );
}

function CommunityFeed({ groupId, group, messages, onSendMessage, loading, currentUser }) {
  const [messageText, setMessageText] = useState('');

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text) return;

    console.log('[SEND] Sending message to', groupId, ':', text);
    setMessageText('');
    await onSendMessage(groupId, text);
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
        background: 'linear-gradient(135deg, #faf7f2 0%, #f6f1e8 100%)',
        borderBottom: '1px solid #f1eadd',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#141b34' }}>
            📚 {group.name}
          </div>
          <div style={{ fontSize: '11px', color: '#9098b5', fontWeight: 600, marginTop: '3px' }}>
            {group.memberCount} members in your cohort
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
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}>
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder={`Message ${group.name}...`}
          style={{
            flex: 1,
            background: '#f6f1e8',
            border: '1px solid #f1eadd',
            borderRadius: '10px',
            padding: '9px 12px',
            fontSize: '12px',
            color: '#141b34',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'all 0.2s ease',
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !messageText.trim()}
          title="Send message"
          style={{
            background: '#5b46e0',
            border: 'none',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            cursor: loading || !messageText.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#faf7f2',
            opacity: loading || !messageText.trim() ? 0.6 : 1,
            flexShrink: 0,
            fontSize: '16px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => !loading && messageText.trim() && (e.target.style.background = '#4a38c4')}
          onMouseLeave={(e) => (e.target.style.background = '#5b46e0')}
        >
          ✈️
        </button>
      </div>
    </div>
  );
}

function CommunityMembers({ groupId, group, members, onOpenDM, loading }) {
  if (!group) {
    return (
      <div style={{
        width: 220,
        background: '#faf7f2',
        borderLeft: '1px solid #f1eadd',
        overflowY: 'auto',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        color: '#9098b5',
        padding: '24px',
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        Select a program to see members
      </div>
    );
  }

  return (
    <div style={{
      width: 220,
      background: '#faf7f2',
      borderLeft: '1px solid #f1eadd',
      overflowY: 'auto',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '14px 14px',
        borderBottom: '1px solid #f1eadd',
        background: '#f6f1e8',
      }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '.6px',
          color: '#5b46e0',
          textTransform: 'uppercase',
        }}>
          👥 Cohort Members
        </div>
        <div style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#141b34',
          marginTop: '4px',
        }}>
          {members.length} connected
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {members.length === 0 ? (
          <div style={{
            padding: '30px 12px',
            textAlign: 'center',
            fontSize: '13px',
            color: '#9098b5',
            lineHeight: 1.7,
          }}>
            <div style={{ fontSize: 28, marginBottom: '12px' }}>🤝</div>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>No members yet</div>
            <div style={{ fontSize: '12px', marginTop: '8px' }}>Members from your program will appear here</div>
          </div>
        ) : (
          members.map(member => (
            <div key={member.id} style={{
              marginBottom: '10px',
              background: '#fff',
              border: '1px solid #f1eadd',
              borderRadius: '10px',
              padding: '10px',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                <Avatar user={member} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#141b34', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.display}
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
                  borderRadius: '7px',
                  padding: '8px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => !loading && (e.target.style.background = '#4a38c4')}
                onMouseLeave={(e) => !loading && (e.target.style.background = '#5b46e0')}
              >
                💬 Study partner
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
  const [personalChats, setPersonalChats] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) || personalChats.find(c => c.id === selectedGroupId);

  // Fetch real community members from API
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        console.log('[Community] Fetching members with token:', !!authToken);
        const res = await fetch('/api/community-members', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        console.log('[Community] API response status:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('[Community] Received members:', data.members?.length || 0);
          setMembers(data.members || []);
        } else {
          console.error('[Community] API error:', res.status, res.statusText);
          const error = await res.json();
          console.error('[Community] Error details:', error);
        }
      } catch (error) {
        console.error('[Community] Fetch error:', error);
      }
    };

    if (authToken) {
      fetchMembers();
    }
  }, [authToken]);

  // Generate groups from user's selected programs, or show "All Members" if none selected
  useEffect(() => {
    const category = profile?.category;

    // Must have category
    if (!category) {
      setGroups([]);
      return;
    }

    const generatedGroups = [];

    // If user has programs, create groups for each
    if (programs && programs.length > 0) {
      programs.forEach(program => {
        const programName = typeof program === 'string' ? program : (program.name || program.program || String(program));

        generatedGroups.push({
          id: programName.toLowerCase().replace(/\s+/g, '-'),
          name: programName,
          program: programName,
          category,
          memberCount: Math.max(1, members.length),
          isMember: true,
        });
      });
    } else {
      // No programs selected - show general cohort group
      generatedGroups.push({
        id: 'cohort',
        name: `${category} Cohort`,
        program: null,
        category,
        memberCount: Math.max(1, members.length),
        isMember: true,
      });
    }

    setGroups(generatedGroups);

    // Auto-select first group
    if (generatedGroups.length > 0 && !selectedGroupId) {
      const firstGroup = generatedGroups[0];
      setSelectedGroupId(firstGroup.id);
      setMessages([
        { id: 1, userId: 'system', text: `Welcome to ${firstGroup.name}! 👋 Connect with other members by clicking "Study partner →"`, createdAt: Date.now() - 300000 },
      ]);
    }
  }, [profile?.category, programs, members.length, selectedGroupId]);

  // Fetch messages when selected group changes, and poll for new ones
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedGroupId) return;

    fetchMessages(selectedGroupId);
    pollRef.current = setInterval(() => fetchMessages(selectedGroupId), 3000);

    return () => clearInterval(pollRef.current);
  }, [selectedGroupId]);

  const handleJoinGroup = async (groupId) => {
    // User is automatically member of program groups, so just show success
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setMembers(group.eligibleUsers || []);
      showToast('You are now part of this community!', 'success');
    }
  };

  const handleSendMessage = async (groupId, text) => {
    const payload = {
      groupId: String(groupId),
      userId: String(authUser?.id || 'unknown'),
      userName: authUser?.name || profile?.name || 'You',
      text: String(text),
    };

    try {
      const res = await fetch('/api/community-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        showToast('Failed to send', 'error');
        return;
      }

      const data = await res.json();
      // Just add to local state - don't refetch (causes disappearing messages)
      setMessages([...messages, data]);
      showToast('✓ Sent', 'success');
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
    }
  };

  const fetchMessages = async (groupId) => {
    try {
      console.log('[FETCH] Getting messages for', groupId);
      const res = await fetch(`/api/community-messages?groupId=${groupId}`);
      if (res.ok) {
        const data = await res.json();
        console.log('[FETCH] Got', data.messages?.length || 0, 'messages');
        setMessages(data.messages || []);
      } else {
        console.error('[FETCH] Error:', res.status);
      }
    } catch (error) {
      console.error('[FETCH] Exception:', error);
    }
  };

  const handleOpenDM = (memberId) => {
    const memberData = members.find(m => m.id === memberId);
    if (!memberData) return;

    const chatId = `dm-${[authUser?.id, memberId].sort().join('-')}`;
    const existingChat = personalChats.find(c => c.id === chatId);

    if (existingChat) {
      setSelectedGroupId(chatId);
    } else {
      const newChat = {
        id: chatId,
        name: memberData.name || 'Direct Message',
        type: 'personal',
        memberId: memberId,
      };
      setPersonalChats([...personalChats, newChat]);
      setSelectedGroupId(chatId);
      setMessages([
        { id: 1, userId: 'system', text: `You started a chat with ${memberData.name}`, createdAt: Date.now() }
      ]);
    }
    showToast(`Chat with ${memberData.name} opened!`, 'success');
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
        personalChats={personalChats}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
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
