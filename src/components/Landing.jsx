import React from 'react';
import '../styles/editorial-base.css';
import '../styles/editorial-landing.css';
import { PLAN_CARDS, WHY_PATHWAY, PROCESS_STEPS, PROGRAMS, UNIVERSITIES, logoUrl, TESTIMONIALS } from '../data/editorialContent';

export default function Landing({ go, authUser, noop }) {
  const primaryDestination = authUser ? 'candidate' : 'register';
  const universities = [...UNIVERSITIES, ...UNIVERSITIES];
  const testimonials = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <div className="landing">
      {/* NAV */}
      <header className="nav">
        <div className="nav__inner">
          <button className="nav__brand" onClick={() => go('landing')}>
            <span className="nav__dot" />
            <span className="serif nav__wordmark">Pathway</span>
          </button>
          <nav className="nav__links">
            <a className="pw-link" href="#process">Process</a>
            <a className="pw-link" href="#programs">Programs</a>
            <a className="pw-link" href="#results">Results</a>
            <a className="pw-link" href="#pricing">Pricing</a>
          </nav>
          <div className="nav__actions">
            <button className="btn-text" onClick={() => go('login')}>Log in</button>
            <button className="pw-cta btn-cta" onClick={() => go(primaryDestination)}>Apply now</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero__copy">
          <div className="hero__badge">
            <span className="hero__badge-dot" />
            Powered by AI · backed by real humans
          </div>
          <h1 className="serif hero__title">
            Your path, <span className="hero__title-italic">powered by AI.</span>
          </h1>
          <p className="hero__desc">
            Pathway is your AI co-pilot for getting in, growing through, and launching after
            university — undergrad to grad to career. Go it yourself with AI, or bring in a senior
            strategist when the stakes are high.
          </p>
          <div className="hero__ctas">
            <button className="pw-cta btn-cta-copper" onClick={() => go(primaryDestination)}>
              Get Pathway AI
            </button>
            <a className="pw-link hero__see-link" href="#pricing">
              See the three ways <span>→</span>
            </a>
          </div>
          <div className="hero__proof">
            <div className="hero__avatars">
              <span className="hero__avatar hero__avatar--1" />
              <span className="hero__avatar hero__avatar--2" />
              <span className="hero__avatar hero__avatar--3" />
            </div>
            <strong>Now in early access</strong> · built by former admissions officers
          </div>
        </div>
        <div className="hero__art">
          <img
            className="hero__img"
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1100&q=80"
            alt="Student working with Pathway"
          />
          <div className="hero__stat-card">
            <div className="serif hero__stat-num">88%</div>
            <div className="hero__stat-label">
              into a top-choice
              <br />
              school
            </div>
          </div>
          <div className="hero__ai-badge">✦ Your AI guide, 24/7</div>
        </div>
      </section>

      {/* LOGO MARQUEE */}
      <section className="marquee-section">
        <div className="marquee-section__inner">
          <span className="marquee-section__label">Our students now study at</span>
        </div>
        <div className="pw-marquee-wrap marquee-mask">
          <div className="pw-track marquee-track">
            {universities.map((uni, i) => (
              <img key={`${uni.domain}-${i}`} className="pw-uni-logo" src={logoUrl(uni.domain)} alt={uni.name} />
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="stats">
        <div className="stats__inner">
          <div className="stat">
            <div className="serif stat__num">180+</div>
            <div className="stat__label">students guided to offers</div>
          </div>
          <div className="stat">
            <div className="serif stat__num">$1.2M</div>
            <div className="stat__label">in scholarships secured</div>
          </div>
          <div className="stat">
            <div className="serif stat__num">88%</div>
            <div className="stat__label">into a top-choice school</div>
          </div>
          <div className="stat">
            <div className="serif stat__num">1:1</div>
            <div className="stat__label">senior strategist, always</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="process" className="process">
        <div className="process__head">
          <div>
            <div className="eyebrow">The process</div>
            <h2 className="serif process__title">
              One path, from finding your direction to landing your first role.
            </h2>
          </div>
          <p className="process__sub">
            Pathway is with you before, during, and after university. AI handles the heavy lifting; a
            strategist steps in whenever you want one.
          </p>
        </div>
        <div className="process__grid">
          {PROCESS_STEPS.map((step, i) => (
            <div className="process__step" key={step.title}>
              <div className="serif process__step-num">{String(i + 1).padStart(2, '0')}</div>
              <h3 className="process__step-title">{step.title}</h3>
              <p className="process__step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROGRAMS */}
      <section id="programs" className="services">
        <div className="services__inner">
          <div className="eyebrow">Programs</div>
          <h2 className="serif services__title">
            Support for the whole journey — not just the application.
          </h2>
          <div className="services__grid">
            {PROGRAMS.map((program, i) => (
              <div className="pw-svc pw-card services__card" key={program.title}>
                <div className="serif pw-svc-num services__card-num">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="services__card-title">{program.title}</h3>
                <p className="pw-svc-desc services__card-desc">{program.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="why">
        <div className="why__inner">
          <div>
            <div className="eyebrow eyebrow--gold">Why Pathway</div>
            <h2 className="serif why__title">Why Pathway beats traditional consulting.</h2>
            <p className="why__sub">
              The same expertise an advisor brings — without the wait, the vagueness, or the single
              point of view.
            </p>
          </div>
          <div className="why__list">
            {WHY_PATHWAY.map((item, i) => (
              <div className="why__row" key={item.title}>
                <span className="serif why__row-num">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="why__row-title">{item.title}</h3>
                  <p className="why__row-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="packages">
        <div className="packages__inner">
          <div className="packages__head">
            <div className="eyebrow eyebrow--center">Three ways to get there</div>
            <h2 className="serif packages__title">Start free, go self-serve, or bring a strategist along.</h2>
            <p className="packages__sub">
              Same intelligence underneath. You choose how much access and human help you want on top.
            </p>
          </div>
          <div className="packages__grid">
            {PLAN_CARDS.map((plan) => (
              <div
                key={plan.id}
                className={`pw-card plan-card${plan.id === 'ai_strategist' ? ' plan-card--dark' : ''}`}
              >
                {plan.id === 'ai_strategist' && <div className="plan-card__badge">Most chosen</div>}
                <div className="plan-card__kicker">{plan.kicker}</div>
                <h3 className="serif plan-card__name">{plan.name}</h3>
                <p className="plan-card__blurb">{plan.blurb}</p>
                <div className="serif plan-card__price">
                  {plan.price}
                  {plan.priceSuffix && <span className="plan-card__price-suffix"> {plan.priceSuffix}</span>}
                </div>
                <div className="plan-card__price-note">{plan.priceNote}</div>
                <div className="plan-card__features">
                  {plan.features.map((f) => (
                    <div className="plan-card__feature" key={f}>
                      <span className="plan-card__check">✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                {plan.note && (
                  <div className="plan-card__note">
                    <span className="plan-card__note-icon">!</span>
                    {plan.note}
                  </div>
                )}
                <button
                  className={`pw-cta plan-card__cta plan-card__cta--${plan.id}`}
                  onClick={() => go(primaryDestination)}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section id="results" className="results">
        <div className="results__inner">
          <div className="eyebrow">In their words</div>
          <h2 className="serif results__title">
            Loved across every stage — undergrad, grad, and finding your own way.
          </h2>
        </div>
        <div className="pw-feed-wrap results__mask">
          <div className="pw-feed-track results__track">
            {testimonials.map((t, i) => (
              <div className="pw-quote-card quote-card" key={`${t.name}-${i}`}>
                <span className="quote-card__category" style={{ color: t.categoryColor, background: t.categoryBg }}>
                  {t.category}
                </span>
                <p className="quote-card__quote">{t.quote}</p>
                <div className="quote-card__person">
                  <span className="pw-avatar" style={{ background: t.avatarBg }}>
                    <img src={t.avatar} alt="" />
                  </span>
                  <div>
                    <div className="quote-card__name">{t.name}</div>
                    <div className="quote-card__meta">{t.meta}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta-final">
        <div className="cta-final__inner">
          <h2 className="serif cta-final__title">
            Your path is closer
            <br />
            than you think.
          </h2>
          <p className="cta-final__sub">
            Get Pathway AI for a one-time $150, or add a senior strategist the moment you want one.
          </p>
          <button className="pw-cta btn-cta-gold" onClick={() => go(primaryDestination)}>
            Book your free consult
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__brand">
            <span className="nav__dot" />
            <span className="serif">Pathway</span>
          </div>
          <nav className="footer__links">
            <a className="pw-link" href="#programs">Programs</a>
            <a className="pw-link" href="#process">Process</a>
            <a className="pw-link" href="#results">Results</a>
            <button className="footer__loginlink" onClick={() => go('login')}>Log in</button>
            <button className="footer__loginlink" onClick={noop}>Terms</button>
            <button className="footer__loginlink" onClick={noop}>Privacy</button>
          </nav>
          <div className="footer__copy">© 2026 Pathway Admissions</div>
        </div>
      </footer>
    </div>
  );
}
