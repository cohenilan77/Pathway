// SAT and ACT test windows — month indices are 0-based (January = 0)
const SAT_MONTHS = [2, 4, 5, 7, 9, 10, 11]; // Mar, May, Jun, Aug, Oct, Nov, Dec
const ACT_MONTHS = [1, 3, 5, 6, 8, 9, 11];  // Feb, Apr, Jun, Jul, Sep, Oct, Dec
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function nextDates(testMonths, prefix, n, now) {
  const results = [];
  // If we're past the 15th, treat this month as passed for test registration purposes
  const startMonth = now.getMonth() + (now.getDate() > 15 ? 1 : 0);
  const startYear = now.getFullYear();
  for (let i = 0; results.length < n && i < 36; i++) {
    const totalMonth = startMonth + i;
    const month = totalMonth % 12;
    const year = startYear + Math.floor(totalMonth / 12);
    if (testMonths.includes(month)) {
      results.push(`${prefix}, ${MONTH_NAMES[month]} ${year}`);
    }
  }
  return results;
}

export function getUpcomingTestDates(count = 4) {
  const now = new Date();
  return {
    sat: nextDates(SAT_MONTHS, 'SAT', count, now),
    act: nextDates(ACT_MONTHS, 'ACT', count, now),
  };
}

export function upcomingTestDatesPromptLine() {
  const { sat, act } = getUpcomingTestDates(4);
  return `Upcoming SAT test dates: ${sat.join(', ')}. Upcoming ACT test dates: ${act.join(', ')}.`;
}
