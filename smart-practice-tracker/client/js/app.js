// ─────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────
let currentUser   = null;
let userProfile   = null;
let allSessions   = [];
let userStreaks    = { current_streak: 0, longest_streak: 0 };
let userGoals     = [];
let userAchievements = [];
let timerInterval = null;
let timerSeconds  = 0;
let timerRunning  = false;
let selectedMood  = 3;

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  currentUser = session.user;

  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.href = 'index.html';
  });

  // Setup UI modules
  setTodayDate();
  setupNav();
  setupTimer();
  setupForm();
  setupFilter();
  setupMobile();
  setupSignOut();
  setupMoodSelector();
  setupProfilePage();
  setupGoalModal();

  // Load data
  await loadAll();

  // Hide loading overlay
  const overlay = document.getElementById('loading-overlay');
  overlay.classList.add('hidden');
  setTimeout(() => overlay.remove(), 500);
});

// ─────────────────────────────────────────────────────────────────
// LOAD ALL
// ─────────────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadProfile(), fetchSessions(), fetchStreaks()]);
  await Promise.all([fetchWeeklyChart(), loadGoals()]);
  checkAndGrantAchievements();
  renderHeatmap('heatmap-container', 84);
  renderAnalytics();
  renderGoalProgress();
}

// ─────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────
async function loadProfile() {
  const { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
  if (data) {
    userProfile = data;
    populateProfileUI();
    updateSidebarUser();
  }
}

function populateProfileUI() {
  if (!userProfile) return;
  const s = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  s('profile-full-name', userProfile.full_name);
  s('profile-username',  userProfile.username);
  s('profile-email',     currentUser.email);
  s('profile-bio',       userProfile.bio);
  s('profile-daily-goal', userProfile.daily_goal_minutes || 30);

  if (userProfile.avatar_url) {
    ['profile-avatar-img', 'sidebar-avatar-img'].forEach(id => {
      const img = document.getElementById(id);
      if (img) { img.src = userProfile.avatar_url; img.style.display = 'block'; }
    });
    ['profile-avatar-fallback', 'sidebar-avatar-fallback'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }
}

function updateSidebarUser() {
  const name = userProfile?.full_name || userProfile?.username || currentUser.email.split('@')[0];
  const el = (id) => document.getElementById(id);
  if (el('sidebar-user-name')) el('sidebar-user-name').textContent = name;
  if (el('sidebar-user-email')) el('sidebar-user-email').textContent = currentUser.email;
  const fb = el('sidebar-avatar-fallback');
  if (fb) fb.textContent = name.charAt(0).toUpperCase();
}

function setupProfilePage() {
  // Save profile
  document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const msg = document.getElementById('profile-msg');
    const full_name = document.getElementById('profile-full-name').value.trim();
    const username  = document.getElementById('profile-username').value.trim();
    const bio       = document.getElementById('profile-bio').value.trim();
    const daily_goal_minutes = parseInt(document.getElementById('profile-daily-goal').value) || 30;

    if (!username || username.length < 3) {
      setMsg(msg, 'Username must be at least 3 characters.', 'error'); return;
    }

    setMsg(msg, 'Saving…', 'info');
    const { error } = await sb.from('profiles').upsert({
      id: currentUser.id, full_name, username, bio, daily_goal_minutes
    });

    if (error) {
      setMsg(msg, error.message.includes('unique') ? 'Username already taken.' : error.message, 'error');
    } else {
      await loadProfile();
      setMsg(msg, '✓ Profile saved!', 'success');
      setTimeout(() => msg.textContent = '', 3000);
    }
  });

  // Avatar upload
  document.getElementById('avatar-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File must be under 5MB.'); return; }

    const ext = file.name.split('.').pop();
    const path = `${currentUser.id}/avatar.${ext}`;

    const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { alert('Upload failed: ' + upErr.message); return; }

    const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path);
    const avatar_url = publicUrl + '?t=' + Date.now();

    await sb.from('profiles').update({ avatar_url }).eq('id', currentUser.id);
    userProfile = { ...userProfile, avatar_url };
    populateProfileUI();
    updateSidebarUser();
  });
}

// ─────────────────────────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────────────────────────
async function fetchSessions() {
  const { data, error } = await sb
    .from('sessions')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (!error) {
    allSessions = data || [];
    renderDashboard();
    renderRecentSessions();
    updateProfileStats();
  }
}

function renderDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6);

  const todayMins = allSessions.filter(s => s.date === today).reduce((acc, s) => acc + s.duration, 0);
  const weekMins  = allSessions.filter(s => new Date(s.date) >= weekStart).reduce((acc, s) => acc + s.duration, 0);

  const dayTotals = {};
  allSessions.forEach(s => { dayTotals[s.date] = (dayTotals[s.date] || 0) + s.duration; });
  const bestDay = Object.entries(dayTotals).sort((a,b) => b[1]-a[1])[0];

  setText('today-minutes', todayMins + ' min');
  setText('week-minutes', weekMins + ' min');
  setText('total-sessions', allSessions.length);
  setText('best-day', bestDay ? bestDay[1] + ' min' : '--');

  // Badge count
  const badge = document.getElementById('sessions-count-badge');
  if (badge) badge.textContent = allSessions.length + ' sessions';
}

function renderGoalProgress() {
  const today = new Date().toISOString().split('T')[0];
  const todayMins = allSessions.filter(s => s.date === today).reduce((acc, s) => acc + s.duration, 0);
  const goalMins  = parseInt(userProfile?.daily_goal_minutes || 30);
  const pct = Math.min(100, Math.round((todayMins / goalMins) * 100));

  setText('goal-progress-text', `${todayMins} / ${goalMins} min`);
  const fill = document.getElementById('goal-bar-fill');
  if (fill) fill.style.width = pct + '%';
}

function renderRecentSessions() {
  const container = document.getElementById('recent-sessions');
  const recent = allSessions.slice(0, 5);
  if (recent.length === 0) {
    container.innerHTML = emptyState('🎵', 'No sessions yet. Log your first practice!');
    return;
  }
  container.innerHTML = recent.map(s => sessionHTML(s)).join('');
  attachDeleteListeners(container);
}

function renderAllSessions() {
  const container = document.getElementById('all-sessions');
  const instrument = document.getElementById('filter-instrument').value;
  const mood = document.getElementById('filter-mood').value;
  const sort = document.getElementById('filter-sort').value;

  let filtered = [...allSessions];
  if (instrument) filtered = filtered.filter(s => s.instrument === instrument);
  if (mood) filtered = filtered.filter(s => String(s.mood) === mood);

  filtered.sort((a, b) => {
    if (sort === 'date-asc')      return new Date(a.date) - new Date(b.date);
    if (sort === 'duration-desc') return b.duration - a.duration;
    if (sort === 'duration-asc')  return a.duration - b.duration;
    return new Date(b.date) - new Date(a.date); // date-desc default
  });

  if (filtered.length === 0) {
    container.innerHTML = emptyState('🔍', 'No sessions match your filter.');
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'recent-card';
  wrap.innerHTML = filtered.map(s => sessionHTML(s)).join('');
  container.innerHTML = '';
  container.appendChild(wrap);
  attachDeleteListeners(container);
}

function sessionHTML(s) {
  const moodMap = { 1: '😫', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };
  const focusLabels = {
    general: 'General', scales: 'Scales', songs: 'Songs',
    technique: 'Technique', theory: 'Theory', improvisation: 'Improv',
    ear_training: 'Ear Training', sight_reading: 'Sight Reading'
  };
  return `
    <div class="session-item" data-id="${s.id}">
      <div class="session-left">
        <span class="session-instrument">${s.instrument}</span>
        <div class="session-meta">
          ${s.focus_area ? `<span class="session-focus">${focusLabels[s.focus_area] || s.focus_area}</span>` : ''}
          ${s.mood ? `<span class="session-mood" title="Mood">${moodMap[s.mood] || ''}</span>` : ''}
        </div>
        ${s.notes ? `<span class="session-notes">${escHtml(s.notes.slice(0, 80))}${s.notes.length > 80 ? '…' : ''}</span>` : ''}
      </div>
      <div class="session-right">
        <span class="session-duration">${s.duration} min</span>
        <span class="session-date">${formatDate(s.date)}</span>
        <button class="delete-btn" data-id="${s.id}">Delete</button>
      </div>
    </div>`;
}

function attachDeleteListeners(container) {
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteSession(btn.dataset.id));
  });
}

async function deleteSession(id) {
  if (!confirm('Delete this session?')) return;
  const { error } = await sb.from('sessions').delete().eq('id', id).eq('user_id', currentUser.id);
  if (!error) {
    await Promise.all([fetchSessions(), fetchStreaks()]);
    await fetchWeeklyChart();
    renderAllSessions();
    renderHeatmap('heatmap-container', 84);
    renderAnalytics();
    renderGoalProgress();
    checkAndGrantAchievements();
  }
}

// ─────────────────────────────────────────────────────────────────
// STREAKS
// ─────────────────────────────────────────────────────────────────
async function fetchStreaks() {
  const { data } = await sb.from('streaks').select('*').eq('user_id', currentUser.id).single();
  if (data) {
    userStreaks = data;
    setText('current-streak', (data.current_streak || 0) + ' days');
    setText('longest-streak', (data.longest_streak || 0) + ' days');
  }
}

async function updateStreak(date) {
  const { data: existing } = await sb.from('streaks').select('*').eq('user_id', currentUser.id).single();
  const today = date;

  if (!existing) {
    await sb.from('streaks').insert([{
      user_id: currentUser.id, current_streak: 1, longest_streak: 1,
      last_practice_date: today, total_practice_days: 1
    }]);
    return;
  }

  const last = existing.last_practice_date;
  if (last === today) return; // already practiced today

  const diffDays = Math.floor((new Date(today) - new Date(last)) / 86400000);
  let newCurrent = diffDays === 1 ? existing.current_streak + 1 : 1;
  const newLongest = Math.max(newCurrent, existing.longest_streak);
  const totalDays = (existing.total_practice_days || 0) + 1;

  await sb.from('streaks').update({
    current_streak: newCurrent, longest_streak: newLongest,
    last_practice_date: today, total_practice_days: totalDays
  }).eq('user_id', currentUser.id);
}

// ─────────────────────────────────────────────────────────────────
// WEEKLY CHART
// ─────────────────────────────────────────────────────────────────
async function fetchWeeklyChart() {
  const today = new Date().toISOString().split('T')[0];
  const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 6);
  const from = sevenAgo.toISOString().split('T')[0];

  const grouped = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    grouped[d.toISOString().split('T')[0]] = 0;
  }
  allSessions.filter(s => s.date >= from && s.date <= today)
    .forEach(s => { if (grouped[s.date] !== undefined) grouped[s.date] += s.duration; });

  renderBarChart('bar-chart', grouped, d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }));
}

function renderBarChart(containerId, grouped, labelFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const entries = Object.entries(grouped);
  const maxVal = Math.max(...entries.map(e => e[1]), 1);

  container.innerHTML = entries.map(([key, mins]) => {
    const h = (mins / maxVal) * 100;
    return `
      <div class="bar-group">
        <div class="bar-val">${mins > 0 ? mins : ''}</div>
        <div class="bar" style="height:${h}%" title="${mins} min"></div>
        <div class="bar-label">${labelFn(key)}</div>
      </div>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────────
// HEATMAP
// ─────────────────────────────────────────────────────────────────
function renderHeatmap(containerId, days) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const dayMap = {};
  allSessions.forEach(s => { dayMap[s.date] = (dayMap[s.date] || 0) + s.duration; });

  const maxMins = Math.max(...Object.values(dayMap), 1);
  const today = new Date();

  // Build weeks of cells
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const mins = dayMap[key] || 0;
    const level = mins === 0 ? 0 : mins < maxMins * 0.25 ? 1 : mins < maxMins * 0.5 ? 2 : mins < maxMins * 0.75 ? 3 : 4;
    cells.push({ key, mins, level });
  }

  // Group into weeks
  const weeks = [];
  let week = [];
  cells.forEach((c, i) => {
    week.push(c);
    if (week.length === 7 || i === cells.length - 1) { weeks.push(week); week = []; }
  });

  container.innerHTML = `<div class="heatmap-grid">${
    weeks.map(w => `<div class="heatmap-week">${
      w.map(c => `<div class="heatmap-cell l${c.level}" title="${c.key}: ${c.mins} min"></div>`).join('')
    }</div>`).join('')
  }</div>`;
}

// ─────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────
function renderAnalytics() {
  if (!document.getElementById('section-analytics').classList.contains('active')) return;

  // Stats
  const totalMins = allSessions.reduce((a, s) => a + s.duration, 0);
  const avgDur    = allSessions.length ? Math.round(totalMins / allSessions.length) : 0;
  const uniqueDays = new Set(allSessions.map(s => s.date)).size;

  const instrCount = {};
  allSessions.forEach(s => instrCount[s.instrument] = (instrCount[s.instrument] || 0) + s.duration);
  const topInstr = Object.entries(instrCount).sort((a,b) => b[1]-a[1])[0];

  setText('stat-total-time', `${Math.floor(totalMins/60)}h ${totalMins%60}m`);
  setText('stat-avg-duration', avgDur + ' min');
  setText('stat-top-instrument', topInstr ? topInstr[0] : '--');
  setText('stat-practice-days', uniqueDays);

  // Monthly chart (last 6 months)
  renderMonthlyChart();

  // Instrument breakdown
  renderInstrumentBreakdown(instrCount);

  // Day-of-week chart
  renderDOWChart();

  // Full heatmap (last year)
  renderHeatmap('full-heatmap', 364);
}

function renderMonthlyChart() {
  const grouped = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.toISOString().substring(0, 7);
    grouped[key] = 0;
  }
  allSessions.forEach(s => {
    const m = s.date.substring(0, 7);
    if (grouped[m] !== undefined) grouped[m] += s.duration;
  });
  renderBarChart('monthly-chart', grouped, k => {
    const [y, mo] = k.split('-');
    return new Date(+y, +mo-1).toLocaleDateString('en-US', { month: 'short' });
  });
}

function renderInstrumentBreakdown(instrCount) {
  const container = document.getElementById('instrument-breakdown');
  if (!container) return;
  const total = Object.values(instrCount).reduce((a, v) => a + v, 0) || 1;
  const colors = ['#7c6af7','#34d399','#f59e0b','#f87171','#60a5fa','#a78bfa','#fb923c'];
  const entries = Object.entries(instrCount).sort((a,b) => b[1]-a[1]);

  container.innerHTML = entries.length === 0
    ? '<p style="color:var(--text3);font-size:13px">No data yet.</p>'
    : entries.map(([name, mins], i) => {
        const pct = Math.round((mins / total) * 100);
        return `<div class="instrument-row">
          <span class="instrument-row-name">${name}</span>
          <div class="instrument-row-bar-track">
            <div class="instrument-row-bar" style="width:${pct}%;background:${colors[i % colors.length]}"></div>
          </div>
          <span class="instrument-row-pct">${pct}%</span>
        </div>`;
      }).join('');
}

function renderDOWChart() {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const grouped = {};
  days.forEach(d => grouped[d] = 0);
  allSessions.forEach(s => {
    const dow = days[new Date(s.date + 'T00:00:00').getDay()];
    grouped[dow] += s.duration;
  });
  renderBarChart('dow-chart', grouped, k => k);
}

// ─────────────────────────────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────────────────────────────
const ACHIEVEMENTS_DEF = [
  { key: 'first_session',   icon: '🎵', name: 'First Note',     desc: 'Log your first session' },
  { key: 'sessions_10',     icon: '🎯', name: 'Dedicated',      desc: '10 practice sessions' },
  { key: 'sessions_50',     icon: '🏆', name: 'Committed',      desc: '50 practice sessions' },
  { key: 'sessions_100',    icon: '👑', name: 'Legend',         desc: '100 practice sessions' },
  { key: 'streak_7',        icon: '🔥', name: 'Week Warrior',   desc: '7-day practice streak' },
  { key: 'streak_30',       icon: '⚡', name: 'Monthly Master', desc: '30-day streak' },
  { key: 'marathon',        icon: '⏱️', name: 'Marathon',       desc: 'Single session 60+ min' },
  { key: 'versatile',       icon: '🎸', name: 'Versatile',      desc: 'Practiced 3+ instruments' },
  { key: 'century',         icon: '💯', name: 'Century',        desc: '100+ hours total' },
  { key: 'early_adopter',   icon: '🌟', name: 'Early Adopter',  desc: 'Join PracticeLog' },
];

async function loadAchievements() {
  const { data } = await sb.from('achievements').select('achievement_key').eq('user_id', currentUser.id);
  userAchievements = (data || []).map(a => a.achievement_key);
  renderAchievementBadges();
}

function renderAchievementBadges() {
  const unlocked = new Set(userAchievements);

  // Mini preview (dashboard)
  const preview = document.getElementById('achievements-preview');
  if (preview) {
    const recent = ACHIEVEMENTS_DEF.filter(a => unlocked.has(a.key)).slice(0, 6);
    preview.innerHTML = recent.length === 0
      ? '<p style="color:var(--text3);font-size:13px;padding:12px 0">Complete sessions to earn badges!</p>'
      : recent.map(a => `<div class="achievement-badge-mini" title="${a.name}: ${a.desc}">${a.icon}</div>`).join('');
  }

  // Full grid (profile)
  const grid = document.getElementById('profile-achievements');
  if (grid) {
    grid.innerHTML = ACHIEVEMENTS_DEF.map(a => `
      <div class="achievement-badge ${unlocked.has(a.key) ? '' : 'locked'}" title="${a.desc}">
        <span class="badge-icon">${a.icon}</span>
        <span class="badge-name">${a.name}</span>
        <span class="badge-desc">${a.desc}</span>
      </div>`).join('');
  }
}

async function checkAndGrantAchievements() {
  await loadAchievements();
  const unlocked = new Set(userAchievements);
  const toGrant  = [];

  const totalMins = allSessions.reduce((a,s) => a+s.duration, 0);
  const instruments = new Set(allSessions.map(s => s.instrument));
  const hasLong = allSessions.some(s => s.duration >= 60);

  const check = (key, cond) => { if (cond && !unlocked.has(key)) toGrant.push(key); };

  check('early_adopter',  true);
  check('first_session',  allSessions.length >= 1);
  check('sessions_10',    allSessions.length >= 10);
  check('sessions_50',    allSessions.length >= 50);
  check('sessions_100',   allSessions.length >= 100);
  check('streak_7',       userStreaks.longest_streak >= 7);
  check('streak_30',      userStreaks.longest_streak >= 30);
  check('marathon',       hasLong);
  check('versatile',      instruments.size >= 3);
  check('century',        totalMins >= 6000);

  if (toGrant.length > 0) {
    const rows = toGrant.map(key => {
      const def = ACHIEVEMENTS_DEF.find(a => a.key === key);
      return { user_id: currentUser.id, achievement_key: key, achievement_name: def.name, achievement_desc: def.desc, icon: def.icon };
    });
    await sb.from('achievements').upsert(rows, { onConflict: 'user_id,achievement_key', ignoreDuplicates: true });
    await loadAchievements();
  }
}

// ─────────────────────────────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────────────────────────────
async function loadGoals() {
  const { data } = await sb.from('goals').select('*').eq('user_id', currentUser.id).eq('is_active', true).order('created_at');
  userGoals = data || [];
  renderGoals();
}

function renderGoals() {
  const container = document.getElementById('goals-list');
  if (!container) return;

  if (userGoals.length === 0) {
    container.innerHTML = `<div class="chart-card">${emptyState('🎯', 'No goals yet. Add a goal to stay motivated!')}</div>`;
    return;
  }

  container.innerHTML = userGoals.map(g => {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6);
    const weekMins = allSessions
      .filter(s => new Date(s.date) >= weekStart && (!g.instrument || s.instrument === g.instrument))
      .reduce((a,s) => a+s.duration, 0);
    const target = g.target_minutes_per_day * (g.target_days_per_week || 5);
    const pct = Math.min(100, Math.round((weekMins / target) * 100));
    const deadline = g.deadline ? ' · Deadline: ' + formatDate(g.deadline) : '';

    return `
      <div class="goal-card">
        <div class="goal-card-header">
          <div style="display:flex;gap:10px;align-items:center">
            <span class="goal-card-title">${escHtml(g.title)}</span>
            ${g.instrument ? `<span class="goal-card-instrument">${g.instrument}</span>` : ''}
          </div>
          <button class="goal-delete-btn" data-id="${g.id}" title="Delete goal">✕</button>
        </div>
        <div class="goal-card-progress">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:13px;color:var(--text2)">This week: ${weekMins} / ${target} min</span>
            <span style="font-size:13px;font-weight:700;color:${pct>=100?'var(--green)':'var(--accent2)'}">${pct}%</span>
          </div>
          <div class="goal-bar-track">
            <div class="goal-bar-fill" style="width:${pct}%;background:${pct>=100?'var(--green)':''}"></div>
          </div>
        </div>
        <div class="goal-card-meta">${g.target_minutes_per_day} min/day · ${g.target_days_per_week} days/week${deadline}</div>
      </div>`;
  }).join('');

  container.querySelectorAll('.goal-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this goal?')) return;
      await sb.from('goals').update({ is_active: false }).eq('id', btn.dataset.id).eq('user_id', currentUser.id);
      await loadGoals();
    });
  });
}

function setupGoalModal() {
  const modal = document.getElementById('goal-modal');
  document.getElementById('add-goal-btn').addEventListener('click', () => modal.style.display = 'flex');
  document.getElementById('goal-modal-close').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

  document.getElementById('save-goal-btn').addEventListener('click', async () => {
    const title = document.getElementById('goal-title').value.trim();
    const instrument = document.getElementById('goal-instrument').value;
    const target_minutes_per_day = parseInt(document.getElementById('goal-daily').value) || 30;
    const target_days_per_week = parseInt(document.getElementById('goal-days-week').value) || 5;
    const deadline = document.getElementById('goal-deadline').value || null;
    const msg = document.getElementById('goal-msg');

    if (!title) { setMsg(msg, 'Please enter a goal title.', 'error'); return; }

    const { error } = await sb.from('goals').insert([{
      user_id: currentUser.id, title, instrument: instrument || null,
      target_minutes_per_day, target_days_per_week, deadline
    }]);

    if (error) { setMsg(msg, error.message, 'error'); return; }

    modal.style.display = 'none';
    document.getElementById('goal-title').value = '';
    msg.textContent = '';
    await loadGoals();
  });
}

// ─────────────────────────────────────────────────────────────────
// FORM (Save Session)
// ─────────────────────────────────────────────────────────────────
function setupForm() {
  document.getElementById('save-session-btn').addEventListener('click', saveSession);
}

async function saveSession() {
  const msg = document.getElementById('form-msg');
  const instrument = document.getElementById('form-instrument').value;
  const duration   = parseInt(document.getElementById('form-duration').value);
  const date       = document.getElementById('form-date').value;
  const notes      = document.getElementById('form-notes').value.trim();
  const focus_area = document.getElementById('form-focus').value;
  const mood       = selectedMood;

  if (!instrument || !duration || !date) {
    setMsg(msg, 'Please fill in all required fields.', 'error'); return;
  }
  if (duration < 1 || duration > 600) {
    setMsg(msg, 'Duration must be between 1 and 600 minutes.', 'error'); return;
  }

  setMsg(msg, 'Saving…', 'info');
  const { error } = await sb.from('sessions').insert([{
    user_id: currentUser.id, instrument, duration, date, notes, focus_area, mood
  }]);

  if (error) { setMsg(msg, 'Failed to save. ' + error.message, 'error'); return; }

  await updateStreak(date);
  setMsg(msg, '✓ Session saved!', 'success');

  // Reset form
  document.getElementById('form-duration').value = '';
  document.getElementById('form-notes').value = '';

  await Promise.all([fetchSessions(), fetchStreaks()]);
  await fetchWeeklyChart();
  renderHeatmap('heatmap-container', 84);
  renderGoalProgress();
  checkAndGrantAchievements();
  setTimeout(() => msg.textContent = '', 3000);
}

// ─────────────────────────────────────────────────────────────────
// TIMER
// ─────────────────────────────────────────────────────────────────
function setupTimer() {
  const display  = document.getElementById('timer-display');
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resetBtn = document.getElementById('reset-btn');

  startBtn.addEventListener('click', () => {
    timerRunning = true;
    startBtn.disabled = true; pauseBtn.disabled = false;
    timerInterval = setInterval(() => {
      timerSeconds++;
      display.textContent = formatTime(timerSeconds);
      document.getElementById('form-duration').value = Math.max(1, Math.floor(timerSeconds / 60));
    }, 1000);
  });

  pauseBtn.addEventListener('click', () => {
    if (timerRunning) {
      clearInterval(timerInterval); timerRunning = false; pauseBtn.textContent = '▶ Resume';
    } else {
      timerRunning = true; pauseBtn.textContent = '⏸ Pause';
      timerInterval = setInterval(() => {
        timerSeconds++;
        display.textContent = formatTime(timerSeconds);
        document.getElementById('form-duration').value = Math.max(1, Math.floor(timerSeconds / 60));
      }, 1000);
    }
  });

  resetBtn.addEventListener('click', () => {
    clearInterval(timerInterval); timerRunning = false; timerSeconds = 0;
    display.textContent = '00:00:00';
    startBtn.disabled = false; pauseBtn.disabled = true; pauseBtn.textContent = '⏸ Pause';
  });
}

// ─────────────────────────────────────────────────────────────────
// MOOD SELECTOR
// ─────────────────────────────────────────────────────────────────
function setupMoodSelector() {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMood = parseInt(btn.dataset.mood);
      document.getElementById('form-mood').value = selectedMood;
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const section = document.getElementById('section-' + btn.dataset.section);
      if (section) section.classList.add('active');

      // Trigger section-specific renders
      if (btn.dataset.section === 'sessions') renderAllSessions();
      if (btn.dataset.section === 'analytics') renderAnalytics();
      if (btn.dataset.section === 'profile') { updateProfileStats(); renderAchievementBadges(); }

      // Close sidebar on mobile
      closeSidebar();
    });
  });
}

function setupFilter() {
  ['filter-instrument', 'filter-mood', 'filter-sort'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', renderAllSessions);
  });
}

// ─────────────────────────────────────────────────────────────────
// MOBILE SIDEBAR
// ─────────────────────────────────────────────────────────────────
function setupMobile() {
  const hamburger = document.getElementById('hamburger-btn');
  const overlay   = document.getElementById('sidebar-overlay');
  const closeBtn  = document.getElementById('sidebar-close');

  hamburger.addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('visible');
  document.getElementById('hamburger-btn').classList.add('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
  document.getElementById('hamburger-btn').classList.remove('open');
}

// ─────────────────────────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────────────────────────
function setupSignOut() {
  const handler = async () => { await sb.auth.signOut(); };
  ['sign-out-btn', 'sign-out-btn-2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  });
}

// ─────────────────────────────────────────────────────────────────
// PROFILE STATS
// ─────────────────────────────────────────────────────────────────
function updateProfileStats() {
  const totalMins = allSessions.reduce((a,s) => a+s.duration, 0);
  setText('profile-total-sessions', allSessions.length);
  setText('profile-total-hours', Math.round(totalMins / 60) + 'h');
  setText('profile-streak', userStreaks.current_streak || 0);
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function setTodayDate() {
  const now = new Date();
  setText('today-date', now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  document.getElementById('form-date').value = now.toISOString().split('T')[0];
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'error' ? 'var(--red)' : type === 'success' ? 'var(--green)' : 'var(--text2)';
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2,'0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2,'0');
  const s = (seconds % 60).toString().padStart(2,'0');
  return `${h}:${m}:${s}`;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function emptyState(icon, text) {
  return `<div class="empty-state"><span class="empty-icon">${icon}</span>${text}</div>`;
}