import { renderApp } from './app.js';
import { fetchAllWeekData } from './supabase.js';
import { getWeekStartMonday } from './storage.js';
import './style.css';

const app = document.getElementById('app');
renderApp(app);

// Temporary: verify Supabase connection (remove after Step 4)
fetchAllWeekData(getWeekStartMonday())
  .then((people) => console.log('Supabase OK — loaded', people.length, 'people'))
  .catch((err) => console.error('Supabase error:', err.message));