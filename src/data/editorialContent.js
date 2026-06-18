export const PLAN_CARDS = [
  {
    id: 'freemium',
    kicker: 'Free trial',
    name: 'Freemium',
    blurb: 'Try the full Pathway experience through your Analysis stage — on us.',
    price: 'Free',
    priceNote: 'Analysis stage only',
    features: [
      'Strategy, narrative & school list',
      'Essay review & specific pointers',
      'Deadline & task tracking',
      'Interview practice',
      'Scholarship & funding finder',
    ],
    note: "Access limited to the Analysis stage. Upgrade to continue once it's complete.",
    cta: 'Start free',
  },
  {
    id: 'pathway_ai',
    kicker: 'Self-serve',
    name: 'Pathway AI',
    blurb: 'Do it yourself — brilliantly. Your 24/7 AI guide for every step of the path.',
    price: '$150',
    priceSuffix: 'one-time',
    priceNote: 'Full access for 3 months',
    features: [
      'Everything in Freemium',
      'Full platform access',
      'All stages unlocked, end to end',
      'Analysis → Strategy → Applications',
      'Decisions & scholarship support',
    ],
    cta: 'Get Pathway AI',
  },
  {
    id: 'ai_strategist',
    kicker: 'AI + human',
    name: 'AI + Strategist',
    blurb: 'AI does the heavy lifting. A senior human makes the big calls with you.',
    price: '$1,500',
    priceSuffix: 'total',
    priceNote: '3 months · one admission cycle',
    features: [
      'Everything in Pathway AI',
      'Consultant 1-on-1 access',
      'A dedicated senior strategist',
      'Human essay & profile editing',
      'Mock interviews with experts',
      'Decision & scholarship negotiation',
    ],
    cta: 'Book a consult',
  },
];

export const WHY_PATHWAY = [
  { title: 'Always on', desc: 'Get essay feedback and answers at midnight — not next Tuesday.' },
  {
    title: 'Specific, not vague',
    desc: 'It tells you exactly what to fix and how — not just "make it more compelling."',
  },
  {
    title: 'Data beats gut',
    desc: "Recommendations built on thousands of real admits — not one advisor's opinion.",
  },
  {
    title: 'Everything in one place',
    desc: 'Schools, deadlines, essays, interviews, scholarships — one dashboard.',
  },
  {
    title: 'Built for you',
    desc: 'Every suggestion is personalized to your profile, goals, and target programs.',
  },
];

export const PROCESS_STEPS = [
  {
    title: 'Discover',
    desc: 'AI maps your strengths, interests, and goals — so the direction you choose is actually yours.',
  },
  {
    title: 'Plan',
    desc: 'A balanced school list and a week-by-week plan, drafted by AI and tuned with you.',
  },
  {
    title: 'Apply & grow',
    desc: 'Sharpen essays with AI review and specific pointers, rehearse interviews, and build the skills schools and employers look for.',
  },
  {
    title: 'Launch',
    desc: 'Choose your offer, negotiate aid — then keep going into internships, networking, and your first role.',
  },
];

export const PROGRAMS = [
  {
    title: 'Discover Your Direction',
    desc: 'Before you pick a school, find the field. AI assessments surface your strengths and interests so every choice is intentional.',
  },
  {
    title: 'Undergraduate Admissions',
    desc: 'College lists, the Common App, essays, and a profile that stands out — for the right reasons.',
  },
  {
    title: 'Graduate & MBA',
    desc: "Master's, MBA, and PhD strategy — plus the scholarships and funding you actually qualify for.",
  },
  {
    title: 'Career & Lifelong Growth',
    desc: "Internships, networking, and a plan for your first role and beyond. We don't stop at acceptance.",
  },
];

export const UNIVERSITIES = [
  { name: 'Harvard', domain: 'harvard.edu' },
  { name: 'Oxford', domain: 'ox.ac.uk' },
  { name: 'Stanford', domain: 'stanford.edu' },
  { name: 'LSE', domain: 'lse.ac.uk' },
  { name: 'INSEAD', domain: 'insead.edu' },
  { name: 'NYU', domain: 'nyu.edu' },
  { name: 'Yale', domain: 'yale.edu' },
  { name: 'MIT', domain: 'mit.edu' },
  { name: 'UPenn', domain: 'upenn.edu' },
  { name: 'Cambridge', domain: 'cam.ac.uk' },
  { name: 'UC Berkeley', domain: 'berkeley.edu' },
  { name: 'Columbia', domain: 'columbia.edu' },
  { name: 'Imperial', domain: 'imperial.ac.uk' },
  { name: 'Toronto', domain: 'utoronto.ca' },
];

export function logoUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

export const TESTIMONIALS = [
  {
    category: 'Undergraduate',
    categoryColor: '#a06a36',
    categoryBg: '#f1eadd',
    quote:
      '"I came in with a scattered list and a lot of doubt. Pathway turned it into a real strategy — and a full-ride offer I never thought I\'d see."',
    name: 'Maya R.',
    meta: 'Economics · LSE',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80',
    avatarBg: '#1d3b32',
  },
  {
    category: 'Graduate & MBA',
    categoryColor: '#2f5a4d',
    categoryBg: '#e2ece5',
    quote:
      '"The AI feedback on my essays was sharper than any human reader I\'d had. It told me exactly what wasn\'t landing — and how to fix it."',
    name: 'Diego M.',
    meta: 'MBA · INSEAD',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
    avatarBg: '#c0844a',
  },
  {
    category: 'Personal growth',
    categoryColor: '#8a6a3e',
    categoryBg: '#f3ecdc',
    quote:
      '"I didn\'t even know what I wanted to study. Pathway helped me figure out my direction first — then build a plan around it. That changed everything."',
    name: 'Priya N.',
    meta: 'Gap year · Mumbai',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
    avatarBg: '#1d3b32',
  },
  {
    category: 'Undergraduate',
    categoryColor: '#a06a36',
    categoryBg: '#f1eadd',
    quote:
      '"Starting free was the whole reason I tried it. By the end of Analysis I trusted it enough to go all in — and got into my reach school."',
    name: 'Marcus L.',
    meta: 'CS · UC Berkeley',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&h=120&q=80',
    avatarBg: '#c0844a',
  },
  {
    category: 'Graduate & MBA',
    categoryColor: '#2f5a4d',
    categoryBg: '#e2ece5',
    quote:
      '"My strategist caught a funding angle I\'d completely missed. The 1-on-1 calls were worth it on their own — I left with a scholarship."',
    name: 'Sofia R.',
    meta: 'Public Policy · Oxford',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80',
    avatarBg: '#1d3b32',
  },
  {
    category: 'Personal growth',
    categoryColor: '#8a6a3e',
    categoryBg: '#f3ecdc',
    quote:
      '"It didn\'t stop at acceptance. Pathway helped me line up internships and prep for my first role. It felt like a coach for the whole journey."',
    name: 'Kenji T.',
    meta: 'Career track · Tokyo',
    avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=120&h=120&q=80',
    avatarBg: '#c0844a',
  },
];
