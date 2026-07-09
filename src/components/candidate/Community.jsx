import React, { useEffect, useRef, useState } from 'react';

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0].toUpperCase();
  const last = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : '';
  return `${first}${last}`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function programName(item) {
  if (typeof item === 'string') return item;
  return item?.name || item?.program || item?.school || String(item);
}

function Avatar({ id, name, initials, size = 38 }) {
  const label = initials || getInitials(name);
  const palettes = [
    ['#6d28d9', '#9333ea'],
    ['#0369a1', '#0891b2'],
    ['#be123c', '#e11d48'],
    ['#047857', '#10b981'],
    ['#c2410c', '#f97316'],
  ];
  const hash = Array.from(String(id || label)).reduce((total, char) => total + char.charCodeAt(0), 0);
  const [from, to] = palettes[hash % palettes.length];

  return (
    <div
      aria-label={label}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size / 3),
        background: `linear-gradient(140deg, ${from}, ${to})`,
        boxShadow: '0 4px 12px rgba(55, 34, 120, .18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(12, Math.round(size * 0.36)),
        fontWeight: 850,
        letterSpacing: '.3px',
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {label}
    </div>
  );
}

function CommunityLeftPanel({ groups, personalChats, selectedGroupId, onSelectGroup, className }) {
  const sectionHeader = {
    fontSize: '12px',
    fontWeight: 850,
    letterSpacing: '.75px',
    color: '#5b46e0',
    textTransform: 'uppercase',
    padding: '16px 15px 8px',
  };

  const row = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '11px 13px 11px 15px',
    cursor: 'pointer',
    border: 'none',
    borderLeft: active ? '3px solid #5b46e0' : '3px solid transparent',
    background: active ? 'rgba(91, 70, 224, .1)' : 'transparent',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'background .15s ease',
  });

  return (
    <aside className={className} style={{
      width: 210,
      background: '#fffdf9',
      borderRight: '1px solid #e9e1d6',
      overflowY: 'auto',
      flexShrink: 0,
      paddingBottom: 12,
    }}>
      <div style={sectionHeader}>Programs</div>
      {groups.length === 0 ? (
        <div style={{ padding: '22px 15px', fontSize: '13.5px', color: '#727b96', lineHeight: 1.55 }}>
          No programs yet — add schools in your Analysis tab
        </div>
      ) : groups.map((group) => {
        const active = selectedGroupId === group.id;
        return (
          <button key={group.id} onClick={() => onSelectGroup(group.id)} style={row(active)}>
            <span style={{
              fontSize: '14px',
              fontWeight: active ? 800 : 650,
              color: active ? '#5138d4' : '#26324f',
              flex: 1,
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {group.name}
            </span>
            <span style={{
              background: active ? '#5b46e0' : '#ece6dc',
              color: active ? '#fff' : '#4e5872',
              fontSize: '12px',
              fontWeight: 750,
              borderRadius: 999,
              padding: '2px 7px',
              flexShrink: 0,
            }}>
              {group.memberCount}
            </span>
          </button>
        );
      })}

      {personalChats.length > 0 && (
        <>
          <div style={{ ...sectionHeader, marginTop: 10, borderTop: '1px solid #eee7dd' }}>Personal chats</div>
          {personalChats.map((chat) => {
            const active = selectedGroupId === chat.id;
            return (
              <button key={chat.id} onClick={() => onSelectGroup(chat.id)} style={row(active)}>
                <Avatar id={chat.memberId} initials={chat.initials} size={28} />
                <span style={{
                  fontSize: '14px',
                  fontWeight: active ? 800 : 650,
                  color: active ? '#5138d4' : '#26324f',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {chat.name}
                </span>
              </button>
            );
          })}
        </>
      )}
    </aside>
  );
}

function CommunityFeed({ groupId, group, messages, onSendMessage, sending, currentUser, className }) {
  const [messageText, setMessageText] = useState('');
  const [focused, setFocused] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, groupId]);

  useEffect(() => setMessageText(''), [groupId]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || sending || !groupId) return;
    setMessageText('');
    await onSendMessage(groupId, text);
  };

  if (!group) {
    return (
      <main className={className} style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7f4ee',
        padding: 30,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>💬</div>
          <div style={{ fontSize: '17px', fontWeight: 850, color: '#18213a' }}>Choose a conversation</div>
          <div style={{ fontSize: '13.5px', color: '#737d98', marginTop: 6, lineHeight: 1.55 }}>
            Select a program on the left or message someone from the candidate community.
          </div>
        </div>
      </main>
    );
  }

  const isDirect = group.type === 'personal';

  return (
    <main className={className} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#f7f4ee' }}>
      <header style={{
        background: 'rgba(255, 253, 249, .96)',
        borderBottom: '1px solid #e9e1d6',
        padding: '16px 20px',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: '16px', fontWeight: 850, color: '#18213a' }}>
          {isDirect ? '💬' : '📚'} {group.name}
        </div>
        <div style={{ fontSize: '12.5px', color: '#77809a', fontWeight: 600, marginTop: 4 }}>
          {isDirect ? 'Private conversation' : `${group.memberCount} candidates in the community`}
        </div>
      </header>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7b849d', fontSize: '13.5px' }}>
            No messages yet. Start the conversation!
          </div>
        ) : messages.map((msg) => {
          const ownMessage = String(msg.userId) === String(currentUser?.id);
          return (
            <div key={msg.id} style={{
              display: 'flex',
              flexDirection: ownMessage ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
              gap: 9,
              alignSelf: ownMessage ? 'flex-end' : 'flex-start',
              maxWidth: '82%',
            }}>
              <Avatar id={msg.userId} name={msg.userName || 'User'} size={30} />
              <div style={{ minWidth: 0, textAlign: ownMessage ? 'right' : 'left' }}>
                <div style={{ marginBottom: 4, display: 'flex', flexDirection: ownMessage ? 'row-reverse' : 'row', gap: 7, alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#202a44' }}>
                    {msg.userName || 'User'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#929ab0' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{
                  fontSize: '13.5px',
                  color: ownMessage ? '#fff' : '#303a55',
                  lineHeight: 1.55,
                  background: ownMessage ? 'linear-gradient(135deg, #644ce6, #7c3aed)' : '#fffdf9',
                  borderRadius: ownMessage ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                  padding: '9px 12px',
                  border: ownMessage ? 'none' : '1px solid #e7dfd4',
                  boxShadow: '0 3px 10px rgba(42, 35, 80, .06)',
                  textAlign: 'left',
                  overflowWrap: 'anywhere',
                }}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{
        background: '#fffdf9',
        borderTop: '1px solid #e9e1d6',
        padding: '12px 15px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        flexShrink: 0,
      }}>
        <input
          type="text"
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') handleSend(); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={`Message ${group.name}...`}
          style={{
            flex: 1,
            background: '#fff',
            border: focused ? '1px solid #6d55df' : '1px solid #dcd5ca',
            boxShadow: focused ? '0 0 0 3px rgba(91, 70, 224, .13)' : 'none',
            borderRadius: 11,
            padding: '10px 13px',
            fontSize: '13.5px',
            color: '#18213a',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color .15s ease, box-shadow .15s ease',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !messageText.trim()}
          title="Send message"
          aria-label="Send message"
          style={{
            background: '#5b46e0',
            border: 'none',
            borderRadius: 10,
            width: 38,
            height: 38,
            cursor: sending || !messageText.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            opacity: sending || !messageText.trim() ? .5 : 1,
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </main>
  );
}

function CommunityMembers({ members, connectedIds, onToggleConnection, onOpenDM, loading, className }) {
  return (
    <aside className={className} style={{
      width: 248,
      background: '#fffdf9',
      borderLeft: '1px solid #e9e1d6',
      overflowY: 'auto',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '16px 15px', borderBottom: '1px solid #e9e1d6', background: '#faf7f2' }}>
        <div style={{ fontSize: '12px', fontWeight: 850, letterSpacing: '.75px', color: '#5b46e0', textTransform: 'uppercase' }}>
          Candidate community
        </div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#313b57', marginTop: 5 }}>
          {members.length} {members.length === 1 ? 'candidate' : 'candidates'}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 11 }}>
        {members.length === 0 ? (
          <div style={{ padding: '34px 13px', textAlign: 'center', fontSize: '13.5px', color: '#78819a', lineHeight: 1.6 }}>
            Other candidates will appear here when they join.
          </div>
        ) : members.map((member) => {
          const connected = connectedIds.has(String(member.id));
          return (
            <div key={member.id} style={{
              marginBottom: 11,
              background: '#fff',
              border: '1px solid #e8e0d5',
              borderRadius: 12,
              padding: 11,
              boxShadow: '0 4px 13px rgba(47, 37, 83, .05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Avatar id={member.id} initials={member.initials || getInitials(member.name)} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 850, color: '#18213a', letterSpacing: '.2px' }}>
                    {member.initials || getInitials(member.name)}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#747e97', marginTop: 3, lineHeight: 1.3 }}>
                    📍 {member.residency || 'Residence not provided'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                <button
                  onClick={() => onOpenDM(member.id)}
                  disabled={loading}
                  style={{
                    background: '#5b46e0',
                    color: '#fff',
                    border: '1px solid #5b46e0',
                    borderRadius: 8,
                    padding: '8px 5px',
                    fontSize: '12px',
                    fontWeight: 750,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Message
                </button>
                <button
                  onClick={() => onToggleConnection(member.id)}
                  style={{
                    background: connected ? '#169b62' : '#fff',
                    color: connected ? '#fff' : '#5b46e0',
                    border: connected ? '1px solid #169b62' : '1px solid #6d55df',
                    borderRadius: 8,
                    padding: '8px 5px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all .15s ease',
                  }}
                >
                  {connected ? '✓ Partner' : '+ Connect'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default function Community(props) {
  const {
    authToken,
    authUser,
    profile,
    programs = [],
    chosenSchools = [],
    showToast = () => {},
    setCandTab,
  } = props;
  const [groups, setGroups] = useState([]);
  const [personalChats, setPersonalChats] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [connectedIds, setConnectedIds] = useState(() => new Set());
  const [sending, setSending] = useState(false);
  const [mobilePanel, setMobilePanel] = useState('feed');

  const selectedGroup = groups.find((group) => group.id === selectedGroupId)
    || personalChats.find((chat) => chat.id === selectedGroupId)
    || null;

  useEffect(() => {
    if (!authToken) return undefined;
    let cancelled = false;

    const fetchMembers = async () => {
      try {
        const response = await fetch('/api/community-members', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!response.ok) throw new Error(`Members request failed (${response.status})`);
        const data = await response.json();
        if (!cancelled) setMembers(data.members || []);
      } catch (error) {
        console.error('[Community] Could not load members:', error);
      }
    };

    fetchMembers();
    return () => { cancelled = true; };
  }, [authToken]);

  useEffect(() => {
    const selectedSchools = Array.isArray(chosenSchools) ? chosenSchools : [];
    const analysedPrograms = Array.isArray(programs) ? programs : [];
    const source = selectedSchools.length > 0 ? selectedSchools : analysedPrograms;
    const seen = new Set();
    const generatedGroups = [];

    source.forEach((item) => {
      const name = String(programName(item)).trim();
      const baseId = slugify(name);
      if (!name || !baseId || seen.has(baseId)) return;
      seen.add(baseId);
      generatedGroups.push({
        id: baseId,
        name,
        type: 'group',
        memberCount: members.length,
      });
    });

    setGroups(generatedGroups);
    setSelectedGroupId((currentId) => {
      if (personalChats.some((chat) => chat.id === currentId)) return currentId;
      if (generatedGroups.some((group) => group.id === currentId)) return currentId;
      return generatedGroups[0]?.id || null;
    });
  }, [chosenSchools, programs, members.length, personalChats]);

  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      return undefined;
    }

    let cancelled = false;
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/community-messages?groupId=${encodeURIComponent(selectedGroupId)}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (!response.ok) throw new Error(`Messages request failed (${response.status})`);
        const data = await response.json();
        if (!cancelled) setMessages(data.messages || []);
      } catch (error) {
        console.error('[Community] Could not load messages:', error);
      }
    };

    setMessages([]);
    fetchMessages();
    const pollId = window.setInterval(fetchMessages, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [selectedGroupId, authToken]);

  const handleSendMessage = async (groupId, text) => {
    const payload = {
      groupId: String(groupId),
      userId: String(authUser?.id || ''),
      userName: authUser?.name || profile?.name || 'Candidate',
      text: String(text),
    };

    setSending(true);
    try {
      const response = await fetch('/api/community-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Send failed (${response.status})`);
      const message = await response.json();
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
    } catch (error) {
      showToast('Failed to send message', 'error');
      console.error('[Community] Could not send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleOpenDM = (memberId) => {
    const member = members.find((item) => String(item.id) === String(memberId));
    if (!member || !authUser?.id) return;

    const chatId = `dm-${[String(authUser.id), String(member.id)].sort().join('-')}`;
    setPersonalChats((current) => current.some((chat) => chat.id === chatId) ? current : [
      ...current,
      {
        id: chatId,
        name: member.initials || getInitials(member.name) || 'Direct message',
        initials: member.initials || getInitials(member.name),
        type: 'personal',
        memberId: member.id,
      },
    ]);
    setSelectedGroupId(chatId);
  };

  const handleToggleConnection = async (memberId) => {
    const key = String(memberId);
    const wasConnected = connectedIds.has(key);
    setConnectedIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

    try {
      await fetch('/api/community-friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ action: wasConnected ? 'remove' : 'send', otherUserId: memberId }),
      });
    } catch (error) {
      console.warn('[Community] Connection preference was not persisted:', error);
    }
  };

  const category = profile?.category;
  const canAccessCommunity = category
    && ['Undergraduate', 'Graduate', 'Postgraduate / Doctoral', 'Personal Development'].includes(category);

  if (!canAccessCommunity) {
    return (
      <div style={{ flex: 1, minHeight: 0, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, background: '#f7f4ee' }}>
        <div style={{ fontSize: '16px', fontWeight: 850, color: '#18213a' }}>Community not available yet</div>
        <div style={{ fontSize: '13.5px', color: '#737d98', maxWidth: 400, textAlign: 'center', marginBottom: 12 }}>
          Set your journey type in Settings to unlock Community.
        </div>
        <button onClick={() => setCandTab?.('settings')} style={{ background: '#5b46e0', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13.5, fontWeight: 750, cursor: 'pointer', fontFamily: 'inherit' }}>
          Go to Settings →
        </button>
      </div>
    );
  }

  if (category === 'Undergraduate' && !['11th', '12th'].includes(profile?.grade)) {
    return (
      <div style={{ flex: 1, minHeight: 0, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, background: '#f7f4ee' }}>
        <div style={{ fontSize: '16px', fontWeight: 850, color: '#18213a' }}>Community available for grades 11–12</div>
        <div style={{ fontSize: '13.5px', color: '#737d98', maxWidth: 400, textAlign: 'center' }}>
          Community is available to high school students in 11th or 12th grade only.
        </div>
      </div>
    );
  }

  const selectGroupAndShowFeed = (groupId) => {
    setSelectedGroupId(groupId);
    setMobilePanel('feed');
  };

  return (
    <div className="pw-community-shell" data-mobile-panel={mobilePanel} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f6f1e8' }}>
      <div className="pw-community-tabbar">
        <button type="button" className={mobilePanel === 'groups' ? 'pw-community-tab is-active' : 'pw-community-tab'} onClick={() => setMobilePanel('groups')}>Groups</button>
        <button type="button" className={mobilePanel === 'feed' ? 'pw-community-tab is-active' : 'pw-community-tab'} onClick={() => setMobilePanel('feed')}>Chat</button>
        <button type="button" className={mobilePanel === 'members' ? 'pw-community-tab is-active' : 'pw-community-tab'} onClick={() => setMobilePanel('members')}>Members</button>
      </div>
      <div className="pw-community-panels">
        <CommunityLeftPanel
          className="pw-community-panel-groups"
          groups={groups}
          personalChats={personalChats}
          selectedGroupId={selectedGroupId}
          onSelectGroup={selectGroupAndShowFeed}
        />
        <CommunityFeed
          className="pw-community-panel-feed"
          groupId={selectedGroupId}
          group={selectedGroup}
          messages={messages}
          onSendMessage={handleSendMessage}
          sending={sending}
          currentUser={authUser}
        />
        <CommunityMembers
          className="pw-community-panel-members"
          members={members}
          connectedIds={connectedIds}
          onToggleConnection={handleToggleConnection}
          onOpenDM={handleOpenDM}
          loading={sending}
        />
      </div>
    </div>
  );
}
