import React from 'react';
import Documents from './Documents.jsx';

// Undergraduate "Essays & Documents" tab.
//
// Rather than rebuild an essay workspace, this reuses the fully wired Documents
// component (essay editor with prompt + draft input, AI feedback/insights, and
// CV + file uploads) so undergraduate essays flow through the exact same real
// candidate state — essayText, essays, insights, analyzeEssay, rewriteEssay,
// saveEssayToDocuments — as the graduate Documents/Essays tab. Nothing here is
// mocked.
//
// Guard: CandidatePortal only renders this when isUndergrad === true, so the
// graduate flow is never affected. The `variant` prop trims graduate-only tools
// (e.g. the GMAT simulator) from the sub-nav for the undergraduate audience.
export default function EssayDocuments(props) {
  return <Documents {...props} variant="undergrad" />;
}
