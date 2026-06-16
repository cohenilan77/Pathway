# Redesign existing desktop screens

_Started 2026-06-16 08:51 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "Untitled"
Project currently has 1 file(s)
Current date is now June 16, 2026
</system-info>

<attached_files>
- uploads/Admin Dashboard.jpg
- uploads/Analysis & Matching.jpg
- uploads/Desktop.png
- uploads/Document Management & Editor.jpg
- uploads/Pathway AI Advisor.jpg
- uploads/Pathway Landing Page.jpg
- uploads/Pathway Login.jpg
</attached_files>

<pasted_text name="Pasted text (609 lines)">
Pathway — AI-Powered Admissions &amp; Application Platform

Overview

Pathway is an AI-powered admissions consulting platform designed to guide candidates through the entire university application journey, from initial profile assessment through final submission.

The platform combines conversational AI, document analysis, application strategy, school matching, CV optimization, essay drafting, and admissions consulting workflows into a single structured experience.

Pathway helps candidates:

Assess their academic and professional profile
Understand strengths, weaknesses, and competitiveness
Discover suitable programs and universities
Evaluate admission chances
Improve CVs and supporting documents
Develop application essays
Track progress through a structured admissions pipeline
Collaborate with admissions consultants throughout the process
The platform is designed for both candidates and admissions consultants, with a shared design framework and consistent user experience across all pages.



Login &amp; User Access

Upon entering the platform, users are presented with a login screen.

There are two user types:

Candidate

Candidates are directed to the Candidate Portal, where they can access all admissions features including:

AI admissions advisor
Profile assessment
School recommendations
Fit analysis
CV review and optimization
Essay drafting assistance
Document management
Progress tracking
Application preparation workflow
The candidate experience is designed as a guided step-by-step journey through the admissions process.



Admin

Administrators and consultants are directed to the Admin Portal.

The Admin Portal provides:

Candidate management
Session management
Conversation history
Progress monitoring
Score review and overrides
Document access
Analytics and reporting
Consultant intervention tools
System configuration controls


Design Framework

All pages within Pathway use the same design framework, visual language, navigation structure, and user experience principles to ensure a consistent and intuitive workflow across both Candidate and Admin environments.



---



## 1. AI Provider Confirmation



**It is Groq, not Grok.** Groq (groq.com) is a hardware/inference company, distinct from xAI's "Grok" model. The app uses:

- **SDK:** `groq-sdk` v0.9.0 (official Groq SDK)

- **Model:** `llama-3.3-70b-versatile` (Meta's Llama 3.3 70B hosted on Groq's LPU hardware)

- **API key env var:** `GROQ_API_KEY` (server-side only, never exposed to browser)

- **Endpoint:** POST `/api/chat` → serverless function → Groq API



---



## 2. Architecture Overview



```

Browser (app.jsx)

    └──► POST /api/chat (Vercel Serverless Function)

              └──► Groq API (llama-3.3-70b-versatile)

```



**Stack:**

- Frontend: React 18 + Vite (single-file app — everything in `app.jsx`, 1,541 lines)

- Backend: Vercel Serverless Function (`api/chat.js`, 93 lines)

- Styling: Inline styles only (no CSS files, no Tailwind, no component library)

- No routing library — single page with tab-based navigation managed via `useState`

- No auth, no database, no persistence — all state is ephemeral in memory



---



## 3. File Structure



```

yuval-app/

├── .spec/feature.md         # Feature spec (Groq migration plan)

├── api/

│   └── chat.js              # Serverless function — Groq proxy

├── app.jsx                  # Entire frontend (1,541 lines)

├── index.html               # Single HTML entry point

├── package.json             # Dependencies

├── vercel.json              # Serverless config + security headers

├── vite.config.js           # Build config

└── .env.example             # Env var documentation

```



**Dependencies:** React 18, react-dom, groq-sdk. That's it. No router, no state manager, no UI library.



---



## 4. The `api/chat.js` Backend (Full Analysis)



This is clean, secure, and well-structured:



**Security features:**

- POST-only (405 on anything else)

- CORS via `ALLOWED_ORIGIN` env var with comma-separated allowlist

- In-memory rate limiter: 20 req/min per IP (using a `Map`, not Redis — resets on cold start)

- Input validation: messages must be array, max 50 messages, max 100,000 total chars

- Role validation: only `"user"` and `"assistant"` roles accepted

- System prompt lives server-side (not sent from browser)

- API key errors logged server-side, generic 500 sent to client



**Weaknesses:**

- Rate limiter is in-memory — resets on every serverless cold start, no cross-instance limits

- No streaming (spec called for SSE streaming but `stream: false` is used — responses wait for full completion)

- Temperature hardcoded at 0.7, not configurable



---



## 5. Complete State Map (`app.jsx`, `AdmissionsAdvisor` component)



```javascript

// Navigation

[tab, setTab]              = useState("chat")   // "chat" | "docs" | "analysis" | "admin"



// Core chat

[messages, setMessages]    = useState([])        // {role, content} array

[input, setInput]          = useState("")        // Text input value

[busy, setBusy]            = useState(false)     // Loading/streaming state



// Flow progress

[flowStep, setFlowStep]    = useState("info")    // Current pipeline step ID

[stepIdx, setStepIdx]      = useState(0)         // Numeric index in FLOW_STEPS



// Parsed AI data blocks

[analysis, setAnalysis]    = useState(null)      // PROFILE_SCORES data

[programs, setPrograms]    = useState(null)      // PROGRAM_LIST data

[fitData, setFitData]      = useState(null)      // FIT_ANALYSIS data

[cvDraft, setCvDraft]      = useState(null)      // CV_DRAFT text

[essayDraft, setEssayDraft]= useState(null)      // ESSAY_DRAFT {program, content}



// Documents

[docs, setDocs]            = useState({})        // {key: {name, text, file}} uploaded docs

[dragOver, setDragOver]    = useState(false)     // Drag &amp; drop state

[modal, setModal]          = useState(null)      // "cv" | "essay" | null — upload modal

[docViewer, setDocViewer]  = useState(null)      // Currently viewed doc

[editorOpen, setEditorOpen]= useState(null)      // Which doc is being edited



// UI state

[pasteText, setPasteText]  = useState("")        // Text paste area

[showProgress, setShowProgress] = useState(false)

[summary, setSummary]      = useState("")        // AI summary text

[summaryBusy, setSummaryBusy] = useState(false)

[copyToast, setCopyToast]  = useState("")        // "Copied!" toast text

[aiPrompt, setAiPrompt]    = useState("")        // Admin AI prompt input



// Refs

bottomRef, fileRef, inputRef

```



---



## 6. Pipeline Logic (8 Steps)



The AI follows a strict pipeline embedded in the system prompt:



| Step ID | Label | What happens |

|---|---|---|

| `info` | Profile | Collects: degree type, GPA, GMAT/GRE, years exp, industry, goals (1 question/turn) |

| `recommender` | Recommender | After CV upload → 3 bullet observations → asks for recommender details |

| `analysis` | Analysis | Emits `PROFILE_SCORES` block (6 dimensions, 0-100) + strengths/weaknesses |

| `programs` | Programs | Suggests 6-8 schools in reach/target/safety → emits `PROGRAM_LIST` |

| `fit` | Fit | Per-school fit score + gap analysis → emits `FIT_ANALYSIS` |

| `cv` | CV | Iterative CV editing → emits `CV_DRAFT` |

| `essay` | Essay | Iterative essay drafting → emits `ESSAY_DRAFT` |

| `final` | Final | 3-bullet checklist for submission |



The AI self-reports its current step via `FLOW_STEP:[step_id]` at the end of each response, and the frontend parses this to update the progress bar.



---



## 7. UI/UX Design Analysis



### Visual Design Language

- **Theme:** Dark mode only. Deep dark (`#0a0a14` bg) with dark surface cards (`#111120`)

- **Accent colors:** Purple (`#7c3aed`) for primary, Amber (`#f59e0b`) for warnings, Green (`#10b981`) for success, Red (`#ef4444`) for errors

- **Typography:** System font stack (`-apple-system, SF Pro Text, Helvetica Neue`) — iOS-native feel

- **Score color coding:** ≥72 = green/accent, ≥50 = amber, &lt;50 = red



### Phone Frame UX Pattern

The app renders inside a "phone frame" with a `38px border-radius` and an iOS status bar simulation (9:41, WiFi/signal icons). This is essentially a mobile-app prototype inside a desktop browser — **unusual choice that limits real-estate significantly.**



### Tab System (4 Tabs)

```

chat    → Conversational AI pipeline

docs    → Document manager (CV, essays, uploaded files)

analysis → Visual scores + programs/fit display

admin   → Admin controls panel

```



### Key UX Components



**Chat Tab:**

- Message bubble renderer (`Md` component) with markdown support (bold, code, bullets)

- Quick-start chips: "MBA", "Masters", "PhD", "Undergrad" (visible on first turn only)

- File drag &amp; drop + file picker integration

- Text paste modal ("paste your CV here")

- Progress stepper (8 steps shown horizontally with icons)

- Radial score visualization for each dimension



**Docs Tab:**

- Document cards for: Profile, Recommender, Analysis, Programs, Fit, CV, Essay (AI-generated) + any uploaded files

- Each doc shows: icon, label, size in KB

- View (modal with pre-formatted text) + Save (download) per doc

- Inline editor (`EditorScreen`) for CV and Essay with "Ask AI to change something" prompt field



**Analysis Tab:**

- Radial score dials (SVG-based) for each dimension

- Strengths/weaknesses bullets

- School lists (reach/target/safety) with fit scores

- CTA buttons: "Analyze My Chances" → jumps to chat; "Strengthen My CV" → jumps to chat



**Admin Tab (current implementation):**

- Shows: message count + "s/are" indicator

- Lists uploaded documents (name + KB)

- Provides an "Ask AI to change something specific" free-form prompt field with send button

- Essentially a **power-user prompt injection tool** — lets you manually guide the AI

- No access control whatsoever — anyone can reach it by switching tabs



### UX Problems Identified

1. **No authentication anywhere** — admin tab is fully accessible to candidates

2. **Phone-frame constraint** feels cramped on desktop; limits information density

3. **All state is ephemeral** — page refresh loses everything

4. **Single giant file (1,541 lines)** — no component separation, hard to maintain

5. **No user identity** — no way to track whose session belongs to whom

6. **Step detection is fully AI-controlled** — if the AI forgets to emit `FLOW_STEP:`, the UI gets confused

7. **No loading skeleton** — only a basic "busy" state, no streaming tokens visible

8. **The compression step** (`callClaudeCompressed`) re-calls the API to compress messages &gt;40 words — expensive and slow

9. **Content Security Policy** in `vercel.json` blocks CDN scripts from Cloudflare (`pdfjsLib`, `mammoth.js`) that are loaded at runtime — potential runtime errors in production



---



## 8. What the Admin Tab Currently Does vs. What It Should Be



**Currently** (rudimentary):

- Shows message count

- Shows uploaded file list with sizes

- Has a free-text "ask AI to do something" prompt

- No authentication, no candidate management, no analytics



**What you envision for v2:**

- A standalone page (separate route or URL) only accessible to admin/consultant

- Candidate management (view all candidates, their progress, scores)

- Override/edit AI responses or scoring

- Ability to configure the system prompt or pipeline

- View conversation history per candidate

- Export capabilities



---



## 9. Recommendations for v2 Rebuild in Claude Code



### Architecture Changes



**Separate Admin from Candidate:**

```

/                       → Candidate chat app (what candidates see)

/admin                  → Admin dashboard (separate page, protected)

```

Or two separate apps deployed independently, sharing a backend.



**Add persistence** (currently zero — everything lost on refresh):

- Supabase (free tier, Postgres + Auth) or Vercel KV + Upstash

- Store: sessions, messages, parsed scores, documents

- Session ID in URL or localStorage to resume conversations



**Add authentication:**

- Candidate: simple magic-link or no-auth (shareable link with session token in URL)

- Admin: basic auth, Vercel Password Protection, or Supabase Auth with role-based access



### Code Quality Issues to Fix



- **Split the monolith:** `app.jsx` should become 10+ files (ChatView, DocManager, AnalysisView, AdminDashboard, components/, hooks/, utils/)

- **Move system prompt to server-side** (currently it's hardcoded client-side and sent with every request — exposes your consultant logic)

- **Add streaming** (the spec planned SSE but wasn't implemented — `stream: false` means users wait for full response)

- **Replace in-memory rate limiter** with Upstash Redis or Vercel KV for distributed limiting

- **Fix CSP** to allow Cloudflare CDN domains (pdf.js, mammoth.js are loaded via script injection)

- **Remove phone-frame** for desktop, or make it responsive



### Admin Dashboard Should Have

- List of all candidate sessions with: name/email, current pipeline step, overall score

- Click into any candidate to view their full conversation

- Score history and trend

- Edit/override any AI score (slider UI)

- Customize the system prompt and pipeline steps

- Download all documents for any candidate

- Send a message into a candidate's session (consultant can intervene)

- Analytics: completion rate per step, average scores, time per step



### Candidate App Should Have

- Persistent session (resume from where they left off)

- Proper streaming (token-by-token response, not wait-for-completion)

- Mobile-responsive layout (not just a phone frame on desktop)

- Better onboarding (what is this app, what will it do)

- Progress save confirmation ("your progress is saved")

- Email capture before starting (ties to persistence)



---



## 10. Quick Reference for Claude Code Brief



When you paste this to Claude Code, key points to communicate:



- **AI:** Groq API (not Anthropic, not OpenAI) with `llama-3.3-70b-versatile`, via `groq-sdk`

- **Backend pattern:** Keep the `/api/chat.js` Vercel serverless proxy — it's solid. Move the system prompt there.

- **Refactor to:** React 18 + Vite + React Router (for `/admin` route) + Supabase (auth + DB) + Tailwind CSS

- **Admin page:** Protected route, shows all candidate sessions, scores, conversation history, overrides

- **Candidate page:** Clean chat UI, streaming responses, session persistence via Supabase, no admin tab

- **Current admin tab behavior:** Free-text AI prompt injection → move this to admin dashboard as "consultant override" feature

- **System prompt:** Currently sent from client (bad). Move to server-side in `api/chat.js` with a `candidateId` param to load the right context from DB

Sent from my iPhone
...

</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Design Components">
This project uses Design Components: every design is a single streaming `Name.dc.html` file. The full authoring spec is in your system prompt under "Writing code — Design Components" — follow it. Author and edit `.dc.html` content with the `dc_write`, `dc_html_str_replace`, and `dc_js_str_replace` tools (not `write_file`; `str_replace_edit` works but won't stream); template edits stream into the live preview as you type.
</attached-skill>

<attached-skill name="Hi-fi design">
Create a high-fidelity, polished design.

Follow this general design process (use the todo list to remember):
(1) ask questions, (2) find existing UI kits and collect design context — copy ALL relevant components and read ALL relevant examples; ask the user if you can't find them, (3) start your file with assumptions + context + design reasoning (as if you are a junior designer and the user is your manager), with placeholders for the designs, and show it to the user early, (4) build out the designs and show the user again ASAP; append some next steps, (5) use your tools to check, verify and iterate on the design.

Good hi-fi designs do not start from scratch — they are rooted in existing design context. Ask the user to Import their codebase, or find a suitable UI kit / design resources, or ask for screenshots of existing UI. You MUST spend time trying to acquire design context, including components. If you cannot find them, ask the user for them. In the Import menu, they can link a local codebase, provide screenshots or Figma links; they can also link another project. Mocking a full product from scratch is a LAST RESORT and will lead to poor design. If stuck, try listing design assets and ls'ing design system files — be proactive! Some designs may need multiple design systems — get them all. Use the starter components (device frames and the like) to get high-quality scaffolding for free.

When presenting several options or explorations side-by-side, lay them out clearly: give the page a neutral gray background, put each option in its own labeled frame (a small heading + a white rounded card sized to its content), and group related options into sections.

When designing, asking many good questions is ESSENTIAL.

Give options: try to give 3+ variations across several dimensions. Mix by-the-book designs that match existing patterns with new and novel interactions, including interesting layouts, metaphors, and visual styles. Have some options that use color or advanced CSS; some with iconography and some without. Start your variations basic and get more advanced and creative as you go! Try remixing the brand assets and visual DNA in interesting ways — play with scale, fills, texture, visual rhythm, layering, novel layouts, type treatments. The goal is not the perfect option; it's exploring atomic variations the user can mix and match.

CSS, HTML, JS and SVG are amazing. Users often don't know what they can do. Surprise the user.

If you do not have an icon, asset or component, draw a placeholder: in hi-fi design, a placeholder is better than a bad attempt at the real thing.
</attached-skill>

<attached-skill name="Interactive prototype">
Create a fully interactive prototype with realistic state management and transitions. Use React useState/useEffect for dynamic behavior. Include hover states, click interactions, form validation, animated transitions, and multi-step navigation flows. It should feel like a real working app, not a static mockup.
</attached-skill>

<attached-skill name="Design System (design system)">
[Design System] This project uses the **Design System** design system. This is a binding choice for visual style — every visual must follow it. Don't invent colors, type, spacing, or components not grounded here.

Scope: the design system is a visual style reference only. Its guide may describe example products, brands, or people that are unrelated to the user and unrelated to the subject of this conversation. Never treat anything in the design system as a fact about the user, their work, or the topic they asked about.

    Explore it to find what you need:
    - Always copy out the fonts and colors you need
    - For prototypes and designs, always copy out any relevant components
    - If the design system contains existing mocks of products, and you were asked to design or prototype something similar, copy and fork those mocks to start your design. This helps you make high-quality designs.

    Explore it quickly to find relevant UI kits (e.g. mocks of existing products you can copy and fork)

Full system at `/projects/bffd4be9-e637-400e-a4e0-a344fe1e2788/`. Before producing any visuals, explore it: call `list_files("/projects/bffd4be9-e637-400e-a4e0-a344fe1e2788/")` to see the structure, then `read_file` the README/base.md or whatever index file it has. Don't guess at the design system's contents.

CSS tokens: the guide may describe tokens in prose, but the exact `--*` names are defined in the design system's stylesheet(s). Before writing any `var(--*)`, look up the real name in the design system's `.css` files (`list_files` + `read_file` under `/projects/bffd4be9-e637-400e-a4e0-a344fe1e2788/`). Never guess a token name — an unresolved `var()` silently falls back to the browser default.

For assets and UI kits beyond the guide: `read_file("/projects/bffd4be9-e637-400e-a4e0-a344fe1e2788/<path>")` and `copy_files` to bring them into the current project.
</attached-skill>

## Assistant

You've shared a rich brief and the existing Pathway screens, but no explicit instruction yet. Before I design anything, let me confirm what you want built.

_[tool: questions_v2]_

## User

Questions answered:
- goal: Redesign / polish the existing screens (you've shared 7)
- focus_screen: All of them
- surface: Desktop web
- fidelity: Clickable/interactive prototype
- variations: Match the existing visual language closely
- vary_dimension: Decide for me
- keep_brand: Decide for me
- audience: make sure all tabs and options are clickable and not dead links

## Assistant

_[tool: list_files]_

Design system project is empty — so the 7 screenshots are my design context. Let me study them at full resolution.

_[tool: view_image]_

_[tool: view_image]_

Design system is empty, so these screenshots are my full reference. I've got the visual DNA: Playfair Display serif + clean sans, deep navy `#14223f`, olive-gold `#c2962f`, yellow CTA `#f5c94c`, cream `#faf6ec`, lavender sidebar `#eaeefb`, white cards, radial score dials, pill toggles, navy active-nav pills.

Let me set up the plan and grab the image-slot starter for the campus photography placeholders.

_[tool: update_todos]_

_[tool: copy_starter_component]_

Now I'll scaffold the DC — fonts, the full logic class (all screens' state + handlers), and the Login + Landing screens. Campus imagery uses fillable `image-slot`s.

_[tool: dc_write]_

Login + landing are in. Now the candidate portal shell + AI Advisor view. I'll append it before the final closing `</div>`.

_[tool: dc_html_str_replace]_

Now the remaining candidate views (Analysis, Documents, Settings) plus the closing tags for the candidate portal — inserted right before the LANDING comment.

_[tool: dc_html_str_replace]_

Now the Admin Dashboard — inserted after the landing block, before the root close.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

All screens are in. Let me verify the full prototype renders and navigates cleanly.

_[tool: show_html]_

_[tool: show_html]_

Login looks right. Let me click through the candidate and admin screens to confirm navigation and the nesting all resolve.

_[tool: multi_screenshot]_

All four portals render and navigate cleanly — login → candidate (advisor/analysis/documents/settings) → sign out → consultant → admin, with the radial dials, live override panel, and tab switching all working. Fonts loaded correctly.

_[tool: update_todos]_

_[tool: set_project_title]_

All 7 Pathway screens rebuilt as one clickable prototype in `Pathway.dc.html`, matching the navy/gold/serif visual language. Every tab, button, and link is wired — nothing dead-ends.

**Flow:** Login (Candidate/Consultant toggle → routes to the right portal) · Landing (all CTAs → login) · **Candidate portal** with working sidebar across AI Advisor (typeable chat, quick-chips, advancing stepper, live score dials), Analysis & Matching, Document Editor, and Settings · **Admin portal** — click any candidate row to load them into Consultant Control, switch Live Feed/Analytics/History tabs, and use the score override +/−.

Notes:
- Campus/library photos are fillable `image-slot` placeholders — drag your own images onto the login hero, landing hero, and the 4 school-match cards; they persist.
- A `startScreen` tweak lets you jump straight to any screen (login/landing/candidate/admin) for review.
- The admin table is tuned for full desktop width (~1300px); it's tighter in a narrow preview pane.

Want me to wire the candidate chat to a real AI response, or build out the admin's Advisor/Documents sub-pages next?

## User

again in candiate part after program there is a stage of stratgey , how to fit the candiate admission packdge to the admission board based on resume, dump (general info ), grades and program profile candidate need to stratgeize before writing essays its called nerrative , susaly there are 2 main options upgrade or pivot :
upgrade is I am working and need program to continue rise the ranks cause I miss tools 
pivot is chaning either career and/or sector and or become enterpenure .
first is less risky but boaring and the seocnd more risky but exciting . this stage helps candiate zero in on nerative,
then continue to work on cv then work on essays

## Assistant

The user wants a new "Strategy / Narrative" stage between Programs and CV — where candidates choose **Upgrade** vs **Pivot** before writing essays. Let me add it as a pipeline step and a dedicated candidate view.

_[tool: snip]_

_[tool: read_file]_

Now the logic updates: add Narrative to the pipeline, narrative-selection state, nav style, and handler.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now add the Strategy nav item to the candidate sidebar (between Analysis and Settings) and build the view itself.

_[tool: dc_html_str_replace]_

Now the Strategy view itself — inserted before the Settings block.

_[tool: dc_html_str_replace]_

_[tool: multi_screenshot]_

_[tool: show_html]_

_[tool: ready_for_verification]_

Added the **Narrative Strategy** stage as step 5 in the candidate pipeline, between Programs and CV/Essays. It's a new sidebar item ("Narrative Strategy") with two selectable cards:

- **The Upgrade** (lower risk) — deepen an existing trajectory; you need the program's tools to rise faster in your field.
- **The Pivot** (higher reward) — change career/sector or go entrepreneurial; reframe your past as a launchpad.

Picking one locks the narrative, shows a navy confirmation banner explaining how it'll shape your CV + essays, and offers a "Continue to CV & Essays" button. The stepper now reads Profile → Recommender → Analysis → Programs → **Narrative** → Fit → CV.

