import React from 'react';
import '../styles/editorial-base.css';
import '../styles/editorial-landing.css';

const TERMS_SECTIONS = [
  {
    title: '1. Service Description',
    body: ['Pathway AI provides AI-powered educational, admissions, career, and application guidance tools. The Platform is intended to assist users in preparing applications and making educational decisions.'],
  },
  {
    title: '2. No Admission Guarantee',
    body: [
      'Pathway AI does not guarantee admission, scholarships, employment, visas, interviews, or any specific outcome.',
      'All admissions decisions are made solely by educational institutions and other third parties.',
    ],
  },
  {
    title: '3. User Responsibilities',
    list: [
      'Provide accurate information.',
      'Use the Platform lawfully.',
      'Not misuse, reverse engineer, copy, or attempt to disrupt the Service.',
      'Maintain the confidentiality of their account credentials.',
    ],
  },
  {
    title: '4. AI-Generated Content',
    body: [
      'The Platform uses artificial intelligence to generate recommendations, analysis, scores, and content.',
      'AI-generated content may contain inaccuracies and should not be relied upon as professional, legal, financial, immigration, educational, or admissions advice.',
      'Users are responsible for reviewing all generated content.',
    ],
  },
  {
    title: '5. Intellectual Property',
    body: [
      'All Platform software, designs, workflows, content, branding, and technology remain the property of Pathway AI and its licensors.',
      'Users retain ownership of content they upload.',
    ],
  },
  {
    title: '6. Payments',
    body: [
      'Paid plans are billed as described at the time of purchase.',
      'Unless required by law, fees are non-refundable.',
    ],
  },
  {
    title: '7. Limitation of Liability',
    body: [
      'To the maximum extent permitted by law, Pathway AI shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from use of the Platform.',
      'Total liability shall not exceed the amount paid by the user during the previous twelve months.',
    ],
  },
  {
    title: '8. Termination',
    body: [
      'We may suspend or terminate accounts that violate these Terms.',
      'Users may stop using the Platform at any time.',
    ],
  },
  {
    title: '9. Changes',
    body: ['We may update these Terms periodically. Continued use of the Platform constitutes acceptance of the updated Terms.'],
  },
  {
    title: '10. Contact',
    body: ['Questions regarding these Terms may be directed to support@pathway-ai.com.'],
    email: true,
  },
];

const PRIVACY_SECTIONS = [
  {
    title: '1. Information We Collect',
    body: ['We may collect:'],
    list: [
      'Name and contact information.',
      'Account information.',
      'Educational history.',
      'Application materials.',
      'Essays, resumes, transcripts, and uploaded documents.',
      'Usage and analytics information.',
      'Payment information processed through third-party providers.',
    ],
  },
  {
    title: '2. How We Use Information',
    body: ['We use information to:'],
    list: [
      'Provide Platform services.',
      'Generate AI-powered analysis and recommendations.',
      'Improve system performance.',
      'Communicate with users.',
      'Process payments.',
      'Maintain security and prevent abuse.',
    ],
  },
  {
    title: '3. AI Processing',
    body: ['Information submitted to the Platform may be processed by artificial intelligence systems and approved service providers in order to generate recommendations, assessments, and content.'],
  },
  {
    title: '4. Data Sharing',
    body: ['We do not sell personal information.', 'We may share information with:'],
    list: [
      'Cloud infrastructure providers.',
      'Payment processors.',
      'Analytics providers.',
      'AI service providers.',
      'Legal authorities when required by law.',
    ],
  },
  {
    title: '5. Data Security',
    body: [
      'We implement reasonable technical and organizational measures to protect personal information.',
      'However, no system can guarantee absolute security.',
    ],
  },
  {
    title: '6. Data Retention',
    body: ['We retain information for as long as necessary to provide services, comply with legal obligations, resolve disputes, and enforce agreements.'],
  },
  {
    title: '7. User Rights',
    body: ['Depending on your jurisdiction, you may have rights to:'],
    list: [
      'Access your data.',
      'Correct inaccurate information.',
      'Request deletion.',
      'Request data export.',
      'Object to certain processing activities.',
    ],
  },
  {
    title: "8. Children's Privacy",
    body: ['The Platform is not intended for children under 13 without parental consent where required by law.'],
  },
  {
    title: '9. International Transfers',
    body: ['Information may be processed and stored in countries different from your country of residence.'],
  },
  {
    title: '10. Contact',
    body: ['For privacy-related inquiries, contact:'],
    email: true,
  },
];

function LegalSection({ section }) {
  return (
    <section className="legal-page__section">
      <h2>{section.title}</h2>
      {section.body?.map((paragraph) => (
        <p key={paragraph}>
          {section.email && paragraph.includes('support@pathway-ai.com')
            ? <>Questions regarding these Terms may be directed to <a href="mailto:support@pathway-ai.com">support@pathway-ai.com</a>.</>
            : paragraph}
        </p>
      ))}
      {section.email && !section.body?.some((paragraph) => paragraph.includes('support@pathway-ai.com')) && (
        <p><a href="mailto:support@pathway-ai.com">support@pathway-ai.com</a></p>
      )}
      {section.list && (
        <ul>
          {section.list.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </section>
  );
}

export default function LegalPage({ type = 'terms', go }) {
  const isTerms = type === 'terms';
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy';

  return (
    <div className="landing">
      <header className="nav">
        <div className="nav__inner">
          <button className="nav__brand" onClick={() => go('landing')}>
            <span className="nav__dot" />
            <span className="serif nav__wordmark">Pathway</span>
          </button>
          <nav className="nav__links">
            <button className="footer__loginlink" onClick={() => go('terms')}>Terms</button>
            <button className="footer__loginlink" onClick={() => go('privacy')}>Privacy</button>
          </nav>
          <div className="nav__actions">
            <button className="btn-text" onClick={() => go('login')}>Log in</button>
            <button className="pw-cta btn-cta" onClick={() => go('register')}>Apply now</button>
          </div>
        </div>
      </header>

      <main className="legal-page">
        <button className="legal-page__back" onClick={() => go('landing')}>Back to home</button>
        <p className="eyebrow">Pathway AI</p>
        <h1 className="serif legal-page__title">{title}</h1>
        <p className="legal-page__updated">Last Updated: June 2026</p>
        <p className="legal-page__intro">
          {isTerms
            ? 'Welcome to Pathway AI. By accessing or using Pathway AI ("Platform", "Service"), you agree to these Terms of Service.'
            : 'Pathway AI respects your privacy and is committed to protecting your personal information.'}
        </p>
        {sections.map((section) => <LegalSection key={section.title} section={section} />)}
      </main>
    </div>
  );
}
