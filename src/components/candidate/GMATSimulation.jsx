import React, { useCallback, useEffect, useRef, useState } from 'react';

const DURATION_SECONDS = 40 * 60;

const QUESTIONS = [
  ['Quantitative', '', 'If 3x + 5 = 26, what is the value of x?', ['5', '6', '7', '9'], 2],
  ['Quantitative', '', 'The ratio of red folders to blue folders is 3:5. If there are 64 folders in total, how many are red?', ['18', '24', '32', '40'], 1],
  ['Quantitative', '', 'An investment of $200 grows by 10% each year. What is its value after two years?', ['$220', '$240', '$242', '$244'], 2],
  ['Quantitative', '', 'What is the median of 4, 7, 9, 12, and 18?', ['7', '9', '10', '12'], 1],
  ['Quantitative', '', 'Machine A completes a job in 6 hours, and Machine B completes it in 3 hours. Working together at constant rates, how long do they take?', ['1.5 hours', '2 hours', '2.5 hours', '4.5 hours'], 1],
  ['Quantitative', '', 'A product price falls from $80 to $68. What is the percentage decrease?', ['12%', '15%', '17.5%', '20%'], 1],
  ['Quantitative', '', 'A bag contains 3 red and 2 blue tokens. Two tokens are drawn without replacement. What is the probability that both are red?', ['1/5', '1/4', '3/10', '2/5'], 2],
  ['Verbal', 'A city introduced protected bicycle lanes downtown. Within a year, bicycle commuting rose, while the number of cars entering downtown fell slightly. Retail sales in the area remained stable.', 'Which conclusion is best supported by the passage?', ['The bicycle lanes caused retail sales to rise.', 'More bicycle commuting can coexist with stable downtown retail sales.', 'Most downtown drivers switched to bicycles.', 'Protected bicycle lanes always reduce traffic congestion.'], 1],
  ['Verbal', 'A software company claims that allowing employees to work remotely will reduce office costs without reducing productivity.', 'Which fact would most strengthen the company’s claim?', ['Several employees prefer working in the office.', 'The company recently redesigned its logo.', 'A six-month pilot found equal output and 30% lower facility costs.', 'Competitors use different project-management software.'], 2],
  ['Verbal', 'Restaurant owner: We should extend weekend hours because nearby restaurants that stay open later serve more customers.', 'The owner’s reasoning depends most on which assumption?', ['The restaurant can attract enough late-night customers to cover the added cost.', 'Every nearby restaurant serves the same menu.', 'Weekend customers never make reservations.', 'The restaurant currently has the lowest prices nearby.'], 0],
  ['Verbal', 'Although the new battery is more expensive to manufacture, it lasts twice as long as the older model and can be recycled more efficiently.', 'What is the primary purpose of the sentence?', ['To argue that manufacturing cost is irrelevant', 'To contrast a disadvantage with two benefits', 'To prove that all batteries should be recycled', 'To explain how the battery is manufactured'], 1],
  ['Verbal', 'Museum attendance increased after admission became free. However, donations did not increase enough to replace the lost ticket revenue.', 'Which statement most accurately describes the result?', ['Free admission improved attendance but created a revenue challenge.', 'Visitors donated more than they previously spent on tickets.', 'Attendance would have risen even without free admission.', 'The museum should immediately restore admission fees.'], 0],
  ['Verbal', 'A manager argues that shorter meetings will improve decision quality because participants will focus only on essential information.', 'Which finding would most weaken the manager’s argument?', ['Participants prefer meetings held in the morning.', 'In a trial, shorter meetings omitted key risk information and required decisions to be reopened.', 'The company has fewer meeting rooms than last year.', 'Some essential information can be summarized in advance.'], 1],
  ['Verbal', 'Solar generation varies with weather. A regional grid therefore paired new solar farms with storage systems that release energy when sunlight falls.', 'The storage systems primarily address which issue?', ['The high cost of constructing regional grids', 'The land required by solar farms', 'The variability of solar-energy supply', 'The efficiency of manufacturing solar panels'], 2],
  ['Data Insights', 'Quarterly unit sales: Product A — Q1: 120, Q2: 150; Product B — Q1: 200, Q2: 180.', 'What was the combined change in unit sales from Q1 to Q2?', ['A decrease of 10', 'No change', 'An increase of 10', 'An increase of 30'], 2],
  ['Data Insights', 'Project results: North — cost $40k, revenue $52k; South — cost $60k, revenue $72k; East — cost $30k, revenue $36k.', 'Which project had the highest profit as a percentage of cost?', ['North', 'South', 'East', 'All were equal'], 0],
  ['Data Insights', 'A survey of 500 customers found that 60% used mobile checkout. Of those customers, 70% rated it “easy.”', 'How many surveyed customers both used mobile checkout and rated it easy?', ['180', '210', '300', '350'], 1],
  ['Data Insights', 'Average delivery time fell from 50 minutes to 42 minutes after a routing update. During the same period, average order distance fell by 20%.', 'Why is the data insufficient to prove that the routing update caused the faster deliveries?', ['Delivery time cannot be measured accurately.', 'The shorter order distances provide another possible explanation.', 'A routing update can never affect delivery time.', 'The percentage change in delivery time is exactly 20%.'], 1],
  ['Data Insights', 'Team output (units): Monday 80, Tuesday 100, Wednesday 90, Thursday 110, Friday 120.', 'On how many days was output above the five-day average?', ['1', '2', '3', '4'], 1],
  ['Data Insights', 'Supplier X: $8 per unit plus $100 shipping. Supplier Y: $10 per unit with free shipping.', 'For an order of how many units will the total costs be equal?', ['25', '40', '50', '100'], 2],
].map(([section, stimulus, prompt, options, correctIndex], index) => ({ id: `gmat-${index + 1}`, section, stimulus, prompt, options, correctIndex }));

const ADVICE = {
  Quantitative: 'Review algebra, rates, percentages, probability, and translating word problems into equations.',
  Verbal: 'Practice identifying assumptions and separating what a passage proves from what merely sounds plausible.',
  'Data Insights': 'Slow down when comparing tables, percentages, and causal claims; write the required calculation first.',
};

function formatTime(seconds) {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function buildResults(answers, questionTimes, totalSeconds) {
  const sections = {};
  let correct = 0;
  QUESTIONS.forEach((question, index) => {
    if (!sections[question.section]) sections[question.section] = { correct: 0, total: 0 };
    sections[question.section].total += 1;
    if (answers[index] === question.correctIndex) {
      correct += 1;
      sections[question.section].correct += 1;
    }
  });
  const averageSeconds = totalSeconds / QUESTIONS.length;
  const improvements = Object.entries(sections)
    .filter(([, score]) => score.correct / score.total < 0.7)
    .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))
    .slice(0, 2)
    .map(([section]) => ADVICE[section]);
  if (averageSeconds > 120) improvements.push('Improve pacing: aim to decide near the two-minute mark and move on from uncertain items.');
  if (Object.keys(answers).length < QUESTIONS.length) improvements.push('Avoid unanswered questions; make a reasoned selection before time expires.');
  if (!improvements.length) improvements.push('Performance was balanced. Keep practicing mixed sets while preserving this accuracy and pace.');
  return { correct, percentage: Math.round((correct / QUESTIONS.length) * 100), sections, totalSeconds, averageSeconds, questionTimes, improvements: improvements.slice(0, 3) };
}

const primaryButton = { background: 'linear-gradient(135deg,#3a63ff,#6d8cff)', color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontSize: 12.5, fontWeight: 850, cursor: 'pointer', fontFamily: 'inherit' };
const card = { background: '#f2f6ff', borderRadius: 20, border: '1px solid #dbe4f7', boxShadow: '0 18px 40px rgba(30,45,90,.08)' };

export default function GMATSimulation() {
  const [phase, setPhase] = useState('idle');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionTimes, setQuestionTimes] = useState(() => Array(QUESTIONS.length).fill(0));
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS);
  const [results, setResults] = useState(null);
  const answersRef = useRef(answers);
  const timesRef = useRef(questionTimes);
  const currentRef = useRef(currentQuestion);
  const questionStartedRef = useRef(null);
  const testStartedRef = useRef(null);
  const deadlineRef = useRef(null);
  const phaseRef = useRef(phase);

  answersRef.current = answers;
  timesRef.current = questionTimes;
  currentRef.current = currentQuestion;
  phaseRef.current = phase;

  const captureCurrentTime = useCallback(() => {
    if (!questionStartedRef.current) return [...timesRef.current];
    const next = [...timesRef.current];
    next[currentRef.current] += (Date.now() - questionStartedRef.current) / 1000;
    questionStartedRef.current = Date.now();
    timesRef.current = next;
    setQuestionTimes(next);
    return next;
  }, []);

  const finish = useCallback(() => {
    if (phaseRef.current !== 'active') return;
    phaseRef.current = 'results';
    const finalTimes = captureCurrentTime();
    const totalSeconds = Math.min(DURATION_SECONDS, (Date.now() - testStartedRef.current) / 1000);
    setResults(buildResults(answersRef.current, finalTimes, totalSeconds));
    setPhase('results');
  }, [captureCurrentTime]);

  useEffect(() => {
    if (phase !== 'active') return undefined;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) finish();
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase, finish]);

  const start = () => {
    const now = Date.now();
    const freshTimes = Array(QUESTIONS.length).fill(0);
    setCurrentQuestion(0); setAnswers({}); setQuestionTimes(freshTimes); setResults(null); setTimeLeft(DURATION_SECONDS);
    answersRef.current = {}; timesRef.current = freshTimes; currentRef.current = 0;
    testStartedRef.current = now; questionStartedRef.current = now; deadlineRef.current = now + DURATION_SECONDS * 1000;
    phaseRef.current = 'active'; setPhase('active');
  };

  const goToQuestion = (index) => {
    if (index === currentQuestion) return;
    captureCurrentTime(); currentRef.current = index; setCurrentQuestion(index);
  };

  if (phase === 'idle') return (
    <div style={{ width: '100%', maxWidth: 760 }}>
      <div className="pw-gmat-idle-card" style={{ ...card, padding: '34px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#3a63ff,#6d8cff)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900 }}>GM</div>
          <div><h2 style={{ fontSize: 24, fontWeight: 850, color: '#111a33', margin: 0 }}>GMAT Simulation</h2><div style={{ fontSize: 12.5, color: '#8b97b8', marginTop: 3 }}>20-question focused practice</div></div>
        </div>
        <p style={{ fontSize: 14, color: '#5a6a8f', lineHeight: 1.65, margin: '18px 0 22px' }}>Practice Quantitative, Verbal, and Data Insights under a 40-minute timer. The final analysis includes accuracy, section performance, total time, average pace, and time spent on every question.</p>
        <div className="pw-gmat-idle-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
          {['7 Quantitative', '7 Verbal', '6 Data Insights'].map((label) => <div key={label} style={{ background: '#f2f6ff', border: '1px solid #c6d2ea', borderRadius: 12, padding: '10px 8px', textAlign: 'center', fontSize: 12.5, fontWeight: 800, color: '#3a63ff' }}>{label}</div>)}
        </div>
        <button onClick={start} style={{ ...primaryButton, width: '100%', padding: '13px 18px', fontSize: 14 }}>Start GMAT Simulation →</button>
      </div>
    </div>
  );

  if (phase === 'results' && results) return (
    <div style={{ width: '100%', maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...card, padding: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 12, fontWeight: 850, color: '#8b97b8', letterSpacing: '.8px' }}>GMAT PRACTICE RESULT</div><div style={{ fontSize: 42, fontWeight: 900, color: '#3a63ff', lineHeight: 1.1 }}>{results.percentage}%</div><div style={{ fontSize: 13.5, color: '#5a6a8f' }}>{results.correct} of {QUESTIONS.length} correct</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(120px,1fr))', gap: 10 }}>
            {[['TOTAL TIME', formatTime(results.totalSeconds), '#f2f6ff'], ['AVG / QUESTION', formatTime(results.averageSeconds), '#f2f6ff']].map(([label, value, background]) => <div key={label} style={{ background, borderRadius: 12, padding: '11px 14px' }}><div style={{ fontSize: 12, fontWeight: 800, color: '#5a6a8f' }}>{label}</div><div style={{ fontSize: 20, fontWeight: 900, color: '#111a33' }}>{value}</div></div>)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>{Object.entries(results.sections).map(([section, score]) => <span key={section} style={{ background: '#eef4ff', border: '1px solid #e3ebfa', borderRadius: 9, padding: '7px 10px', fontSize: 12, fontWeight: 800, color: '#5a6a8f' }}>{section}: {score.correct}/{score.total}</span>)}</div>
      </div>
      <div style={{ ...card, padding: 22 }}><div style={{ fontSize: 17, fontWeight: 850, color: '#111a33', marginBottom: 12 }}>Things to improve</div>{results.improvements.map((item) => <div key={item} style={{ display: 'flex', gap: 9, fontSize: 13, color: '#38456b', lineHeight: 1.5, marginBottom: 8 }}><span style={{ color: '#6d8cff', fontWeight: 900 }}>→</span><span>{item}</span></div>)}</div>
      <div style={{ ...card, padding: 22, overflowX: 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 850, color: '#111a33', marginBottom: 12 }}>Question timing</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, color: '#5a6a8f' }}>
          <thead><tr>{['Question', 'Section', 'Result', 'Time'].map((label) => <th key={label} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e3ebfa', color: '#8b97b8', fontSize: 12 }}>{label.toUpperCase()}</th>)}</tr></thead>
          <tbody>{QUESTIONS.map((question, index) => { const correct = answers[index] === question.correctIndex; return <tr key={question.id}><td style={{ padding: '9px 10px', borderBottom: '1px solid #dbe4f7', fontWeight: 800 }}>Q{index + 1}</td><td style={{ padding: '9px 10px', borderBottom: '1px solid #dbe4f7' }}>{question.section}</td><td style={{ padding: '9px 10px', borderBottom: '1px solid #dbe4f7', color: correct ? '#0ca678' : '#e8476b', fontWeight: 800 }}>{correct ? 'Correct' : answers[index] == null ? 'Unanswered' : 'Review'}</td><td style={{ padding: '9px 10px', borderBottom: '1px solid #dbe4f7', fontWeight: 750 }}>{formatTime(results.questionTimes[index])}</td></tr>; })}</tbody>
        </table>
      </div>
      <button onClick={start} style={{ ...primaryButton, alignSelf: 'flex-start' }}>Try another attempt</button>
    </div>
  );

  const question = QUESTIONS[currentQuestion];
  return (
    <div style={{ width: '100%', maxWidth: 820 }}>
      <div style={{ ...card, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
          <div><div style={{ fontSize: 12, fontWeight: 850, color: '#3a63ff' }}>{question.section}</div><div style={{ fontSize: 12, color: '#8b97b8', marginTop: 3 }}>Question {currentQuestion + 1} of {QUESTIONS.length} · {Object.keys(answers).length} answered</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, fontWeight: 800, color: '#8b97b8' }}>TIME LEFT</div><div style={{ fontSize: 22, fontWeight: 900, color: timeLeft < 300 ? '#e8476b' : '#3a63ff' }}>{formatTime(timeLeft)}</div></div>
        </div>
        <div style={{ height: 7, background: '#e3ebfa', borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}><div style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#3a63ff,#6d8cff)' }} /></div>
        {question.stimulus && <div style={{ background: '#eef4ff', borderRadius: 13, padding: 15, fontSize: 13.5, color: '#38456b', lineHeight: 1.6, marginBottom: 16 }}>{question.stimulus}</div>}
        <div style={{ fontSize: 16, fontWeight: 750, color: '#111a33', lineHeight: 1.55, marginBottom: 16 }}>{question.prompt}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{question.options.map((option, index) => { const selected = answers[currentQuestion] === index; return <button key={option} onClick={() => setAnswers((previous) => ({ ...previous, [currentQuestion]: index }))} style={{ background: selected ? '#f2f6ff' : '#fff', border: `1.5px solid ${selected ? '#3a63ff' : '#e3ebfa'}`, borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, textAlign: 'left', cursor: 'pointer', color: '#111a33', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.45 }}><span style={{ fontWeight: 900, color: selected ? '#3a63ff' : '#8b97b8' }}>{String.fromCharCode(65 + index)}.</span><span>{option}</span></button>; })}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
          <button onClick={() => goToQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0} style={{ background: '#fff', border: '1px solid #e3ebfa', color: '#3a63ff', borderRadius: 11, padding: '9px 13px', fontSize: 12.5, fontWeight: 800, cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer', opacity: currentQuestion === 0 ? .45 : 1, fontFamily: 'inherit' }}>← Previous</button>
          {currentQuestion < QUESTIONS.length - 1 ? <button onClick={() => goToQuestion(currentQuestion + 1)} style={primaryButton}>Next →</button> : <button onClick={finish} style={{ ...primaryButton, background: 'linear-gradient(135deg,#0ca678,#12b886)' }}>Finish &amp; see results</button>}
        </div>
        <div className="pw-gmat-question-nav" style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 6, marginTop: 20, paddingTop: 16, borderTop: '1px solid #dbe4f7' }}>{QUESTIONS.map((item, index) => <button key={item.id} onClick={() => goToQuestion(index)} style={{ height: 30, borderRadius: 8, border: `1px solid ${index === currentQuestion ? '#3a63ff' : answers[index] != null ? '#0ca678' : '#e3ebfa'}`, background: index === currentQuestion ? '#f2f6ff' : answers[index] != null ? '#f2f6ff' : '#fff', color: '#5a6a8f', fontSize: 12, fontWeight: 850, cursor: 'pointer' }}>{index + 1}</button>)}</div>
      </div>
    </div>
  );
}
