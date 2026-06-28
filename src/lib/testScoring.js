export function estimatePracticeScore(testType, questions, answers) {
  const bySection = {};
  let correctCount = 0;
  questions.forEach((question, index) => {
    if (!bySection[question.section]) bySection[question.section] = { correct: 0, total: 0 };
    bySection[question.section].total += 1;
    if (answers[index] === question.correctIndex) {
      bySection[question.section].correct += 1;
      correctCount += 1;
    }
  });
  const percentage = Math.round((correctCount / questions.length) * 100);
  if (testType === 'sat') {
    const sectionScores = Object.fromEntries(Object.entries(bySection).map(([section, value]) => [
      section,
      Math.round((200 + (value.correct / value.total) * 600) / 10) * 10,
    ]));
    return { correctCount, percentage, sectionScores, estimatedScore: Object.values(sectionScores).reduce((sum, value) => sum + value, 0), scale: '400–1600' };
  }
  const sectionScores = Object.fromEntries(Object.entries(bySection).map(([section, value]) => [
    section,
    Math.max(1, Math.min(36, Math.round(1 + (value.correct / value.total) * 35))),
  ]));
  const estimatedScore = Math.round(Object.values(sectionScores).reduce((sum, value) => sum + value, 0) / Object.values(sectionScores).length);
  return { correctCount, percentage, sectionScores, estimatedScore, scale: '1–36' };
}
