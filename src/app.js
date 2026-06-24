import {
  DAYS,
  getCurrentWeekData,
  getTodayIndex,
  loadData,
  updateDay,
  getWeekStartMonday,
} from './storage.js';
import { saveDay } from './supabase.js';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function renderApp(container, opts = {}) {
  const { weekStart: optWeekStart, peopleData } = opts;
  const todayIndex = getTodayIndex();

  // If peopleData provided, render all people stacked with tabs.
  const people = peopleData && peopleData.length ? peopleData : null;

  container.innerHTML = `
    <div class="page">
      <div class="tabs" role="tablist"></div>
      <div class="people-sections">
        ${people
      ? people
        .map(
          (person) => `
          <section id="${person.slug}" class="person-section" data-person-id="${person.id}">
            <header class="header">
              <h2 class="owner">${person.displayName}</h2>
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
            const entry = person.week[day] ?? { workedOut: false, workoutsDone: '', workoutsPlanned: '' };
            const isToday = index === todayIndex;
            return `
                      <tr class="day-row${isToday ? ' day-row--today' : ''}" data-day="${day}">
                        <td class="col-day">
                          <span class="day-name">${day}</span>
                          ${isToday ? '<span class="today-badge">Today</span>' : ''}
                        </td>
                        <td class="col-check">
                          <input type="checkbox" class="workout-check" aria-label="Worked out on ${day}" ${entry.workedOut ? 'checked' : ''} />
                        </td>
                        <td class="col-workouts">
                          <textarea class="workout-done" rows="2" placeholder="What you did" aria-label="Workouts done for ${day}">${escapeHtml(entry.workoutsDone ?? entry.workouts ?? '')}</textarea>
                        </td>
                        <td class="col-workouts">
                          <textarea class="workout-planned" rows="2" placeholder="What you plan to do" aria-label="Workouts planned for ${day}">${escapeHtml(entry.workoutsPlanned ?? '')}</textarea>
                        </td>
                      </tr>
                    `;
          }).join('')}
                </tbody>
              </table>
            </div>
          </section>
        `
        )
        .join('')
      : (() => {
        // Fallback single-person render (existing local behavior)
        const res = getCurrentWeekData(loadData());
        const weekStart = res.weekStart;
        const week = res.week;
        return `
              <section class="person-section">
                <header class="header">
                  <h2 class="owner">Sami</h2>
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
                              <input type="checkbox" class="workout-check" aria-label="Worked out on ${day}" ${entry.workedOut ? 'checked' : ''} />
                            </td>
                            <td class="col-workouts">
                              <textarea class="workout-done" rows="2" placeholder="What you did" aria-label="Workouts done for ${day}">${escapeHtml(entry.workoutsDone ?? entry.workouts ?? '')}</textarea>
                            </td>
                            <td class="col-workouts">
                              <textarea class="workout-planned" rows="2" placeholder="What you plan to do" aria-label="Workouts planned for ${day}">${escapeHtml(entry.workoutsPlanned ?? '')}</textarea>
                            </td>
                          </tr>
                        `;
        }).join('')}
                    </tbody>
                  </table>
                </div>
              </section>
            `;
      })()
    }
      </div>
    </div>
  `;

  // Build tabs if we have people
  const tabsEl = container.querySelector('.tabs');
  if (people) {
    people.forEach((person, idx) => {
      const btn = document.createElement('button');
      btn.className = 'tab';
      btn.type = 'button';
      btn.dataset.slug = person.slug;
      btn.textContent = person.displayName;
      btn.addEventListener('click', () => {
        const target = container.querySelector(`#${person.slug}`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // update hash without scrolling again
        history.replaceState(null, '', `#${person.slug}`);
        // set active styling
        container.querySelectorAll('.tab').forEach(t => t.classList.remove('tab--active'));
        btn.classList.add('tab--active');
      });
      if (idx === 0) btn.classList.add('tab--active');
      tabsEl.appendChild(btn);
    });

    // Activate tab from URL hash or ?p= query
    const params = new URLSearchParams(location.search);
    const slugOrHash = params.get('p') || location.hash.slice(1);
    if (slugOrHash) {
      const targetBtn = tabsEl.querySelector(`[data-slug="${slugOrHash}"]`);
      if (targetBtn) targetBtn.click();
    }
  }

  // Attach listeners per section
  container.querySelectorAll('.person-section').forEach((section) => {
    const personId = section.dataset.personId;
    // fallback to current week if caller didn't pass weekStart
    const weekStart = optWeekStart ?? getWeekStartMonday();

    if (!personId || !weekStart) {
      console.warn('save skipped: missing personId or weekStart', { personId, weekStart });
    }

    section.querySelectorAll('.day-row').forEach((row) => {
      const day = row.dataset.day;
      const checkbox = row.querySelector('.workout-check');
      const done = row.querySelector('.workout-done');
      const planned = row.querySelector('.workout-planned');

      checkbox.addEventListener('change', async () => {
        // local update
        const current = loadData();
        updateDay(current, weekStart, day, { workedOut: checkbox.checked });
        // try saving to Supabase when available
        if (personId && weekStart) {
          console.debug('attempting saveDay (checkbox)', { personId, weekStart, day, workedOut: checkbox.checked });
          try {
            await saveDay(personId, weekStart, day, { workedOut: checkbox.checked });
            console.debug('saveDay success (checkbox)', { personId, weekStart, day });
          } catch (err) {
            console.error('saveDay error (checkbox):', err?.message ?? err);
          }
        } else {
          console.warn('saveDay not called (checkbox) - missing identifiers', { personId, weekStart });
        }
      });

      // debounced saves
      let doneTimer = null;
      done.addEventListener('input', () => {
        clearTimeout(doneTimer);
        doneTimer = setTimeout(async () => {
          const val = done.value;
          const current = loadData();
          updateDay(current, weekStart, day, { workoutsDone: val });
          if (personId && weekStart) {
            console.debug('attempting saveDay (done)', { personId, weekStart, day, workoutsDone: val });
            try {
              await saveDay(personId, weekStart, day, { workoutsDone: val });
              console.debug('saveDay success (done)', { personId, weekStart, day });
            } catch (err) {
              console.error('saveDay error (done):', err?.message ?? err);
            }
          } else {
            console.warn('saveDay not called (done) - missing identifiers', { personId, weekStart });
          }
        }, 400);
      });

      let plannedTimer = null;
      planned.addEventListener('input', () => {
        clearTimeout(plannedTimer);
        plannedTimer = setTimeout(async () => {
          const val = planned.value;
          const current = loadData();
          updateDay(current, weekStart, day, { workoutsPlanned: val });
          if (personId && weekStart) {
            console.debug('attempting saveDay (planned)', { personId, weekStart, day, workoutsPlanned: val });
            try {
              await saveDay(personId, weekStart, day, { workoutsPlanned: val });
              console.debug('saveDay success (planned)', { personId, weekStart, day });
            } catch (err) {
              console.error('saveDay error (planned):', err?.message ?? err);
            }
          } else {
            console.warn('saveDay not called (planned) - missing identifiers', { personId, weekStart });
          }
        }, 400);
      });
    });
  });
}
