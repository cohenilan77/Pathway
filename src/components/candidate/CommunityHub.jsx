import React from 'react';
import Community from './Community.jsx';

// Undergraduate "Community" tab. Community.jsx already implements a real,
// working study network — school/program group chat, 1:1 direct messages,
// a member directory, and real connect/friend requests (all backed by
// api/community-*). This hub deliberately does not add Pods / Study
// Sprints / AI Summaries tabs, since none of those features exist yet —
// shipping fake placeholder tabs would violate "no fake placeholder flows."
// Reuses Community.jsx as-is rather than rebuilding it.
export default function CommunityHub(props) {
  return <Community {...props} />;
}
