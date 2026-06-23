import {
  DAYS,
  getCurrentWeekData,
  getTodayIndex,
  loadData,
  updateDay,
} from './storage.js';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function renderApp(container) {
  const { weekStart, week } = getCurrentWeekData(loadData());
  const todayIndex = getTodayIndex();

  container.innerHTML = `
    <div class="page">
      <header class="header">
        <h1 class="owner">Sami</h1>
        <div class="goals">
          <p class="goals-label">Goals:</p>
          <ol class="goals-list">
            <li>Exercise 3–4 times this week</li>
            <li>Do the same amount as last week or improve it incrementally</li>
          </ol>
        </div>
        <p class="reminder">Intentionally DO NOT try to do too much more than last week</p>
      </header>

      <div class="table-wrap">
        <table class="tracker">
          <thead>
            <tr>
              <th scope="col" class="col-day">Day</th>
              <th scope="col" class="col-check">Worked out?</th>
              <th scope="col" class="col-workouts">Workouts Done</th>
              <th scope="col" class="col-workouts">Workouts Planned</th>
            </tr>
          </thead>
          <tbody>
            ${DAYS.map((day, index) => {
              const entry = week[day];
              const isToday = index === todayIndex;
              return `
                <tr class="day-row${isToday ? ' day-row--today' : ''}" data-day="${day}">
                  <td class="col-day">
                    <span class="day-name">${day}</span>
                    ${isToday ? '<span class="today-badge">Today</span>' : ''}
                  </td>
                  <td class="col-check">
                    <input
                      type="checkbox"
                      class="workout-check"
                      aria-label="Worked out on ${day}"
                      ${entry.workedOut ? 'checked' : ''}
                    />
                  </td>
                  <td class="col-workouts">
                    <textarea
                      class="workout-done"
                      rows="2"
                      placeholder="What you did"
                      aria-label="Workouts done for ${day}"
                    >${escapeHtml(entry.workoutsDone ?? entry.workouts ?? '')}</textarea>
                  </td>
                  <td class="col-workouts">
                    <textarea
                      class="workout-planned"
                      rows="2"
                      placeholder="What you plan to do"
                      aria-label="Workouts planned for ${day}"
                    >${escapeHtml(entry.workoutsPlanned ?? '')}</textarea>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelectorAll('.day-row').forEach((row) => {
    const day = row.dataset.day;
    const checkbox = row.querySelector('.workout-check');
    const workoutsDoneTextarea = row.querySelector('.workout-done');
    const workoutsPlannedTextarea = row.querySelector('.workout-planned');

    checkbox.addEventListener('change', () => {
      const current = loadData();
      updateDay(current, weekStart, day, { workedOut: checkbox.checked });
    });

    workoutsDoneTextarea.addEventListener('input', () => {
      const current = loadData();
      updateDay(current, weekStart, day, { workoutsDone: workoutsDoneTextarea.value });
    });

    workoutsPlannedTextarea.addEventListener('input', () => {
      const current = loadData();
      updateDay(current, weekStart, day, { workoutsPlanned: workoutsPlannedTextarea.value });
    });
  });
}
