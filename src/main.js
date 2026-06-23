import { renderApp } from './app.js';
import { fetchAllWeekData } from './supabase.js';
import { getWeekStartMonday } from './storage.js';
import './style.css';

const app = document.getElementById('app');

async function start() {
  const weekStart = getWeekStartMonday();
  app.textContent = 'Loading…';

  try {
    const peopleData = await fetchAllWeekData(weekStart);
    console.log('Supabase OK — loaded', peopleData.length, 'people');
    renderApp(app, { weekStart, peopleData });
  } catch (err) {
    console.error('Supabase error:', err.message);
    app.textContent = 'Failed to load data — check console for details.';
    // fallback to local render so the app still works offline
    renderApp(app);
  }
}

start();