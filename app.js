
(() => {
'use strict';

const DATA = window.OATF_DATA;
const API = 'https://oatf-dayof-sync.round-disk-6577.workers.dev';
const EVENT_KEY = 'oatf-oc-dayof-2026-v04';
const AUTH_KEY = 'oatf-oc-dayof-auth-v04';
const POLL_MS = 5000;

const clone = value => JSON.parse(JSON.stringify(value));
const defaultFair = clone(DATA.contacts[0] || {
  name: 'OC Fair Entertainment',
  role: 'Entertainment Department',
  phone: '',
  email: ''
});

const base = {
  delay: 0,
  completed: [],
  ready: [],
  people: {},
  issues: [],
  fairContact: defaultFair,
  handoff: '',
  screen: 'live',
  revision: 0,
  clientUpdatedAt: ''
};

let state = loadState();
let auth = loadAuth();
let syncMode = 'offline';
let saveTimer = null;
let syncBusy = false;
let lastCloudUpdatedAt = '';
let pollTimer = null;
let pendingLocalSave = false;
const scrollPositions = {
  live: 0,
  schedule: 0,
  issues: 0,
  people: 0
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function loadState() {
  try {
    return {...clone(base), ...JSON.parse(localStorage.getItem(EVENT_KEY) || '{}')};
  } catch {
    return clone(base);
  }
}

function loadAuth() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

function storeState() {
  localStorage.setItem(EVENT_KEY, JSON.stringify(state));
}

function storeAuth(nextAuth) {
  auth = nextAuth;
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(nextAuth));
  localStorage.setItem(AUTH_KEY, JSON.stringify(nextAuth));
}

function setSync(mode, label) {
  syncMode = mode;
  const el = $('#syncStatus');
  if (!el) return;
  el.className = `sync-status ${mode}`;
  el.querySelector('span').textContent = label || ({
    synced: 'Synced',
    saving: 'Saving',
    error: 'Sync Error',
    offline: 'Offline'
  }[mode]);

  const meta = $('#syncMeta');
  if (!meta) return;
  if (mode === 'synced') {
    meta.textContent = lastCloudUpdatedAt
      ? `Updated ${new Date(lastCloudUpdatedAt).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}`
      : `Connected as ${auth?.deviceName || 'device'}`;
  } else if (mode === 'saving') {
    meta.textContent = 'Uploading changes…';
  } else if (mode === 'error') {
    meta.textContent = 'Tap to retry';
  } else {
    meta.textContent = navigator.onLine ? 'Not connected' : 'No connection';
  }
}

function toast(message) {
  document.querySelector('.sync-toast')?.remove();
  const el = document.createElement('div');
  el.className = 'sync-toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function cloudPayload() {
  const payload = clone(state);
  delete payload.screen;
  payload.revision = Number(payload.revision || 0) + 1;
  payload.clientUpdatedAt = new Date().toISOString();
  return payload;
}

function applyCloudState(cloudState, metadata = {}) {
  const currentScreen = state.screen || 'live';
  state = {...clone(base), ...cloudState, screen: currentScreen};
  storeState();
  lastCloudUpdatedAt = metadata.updatedAt || lastCloudUpdatedAt;
  render();
}

async function apiFetch(path, options = {}) {
  if (!auth?.pin) throw new Error('PIN required');
  const headers = {
    'Content-Type': 'application/json',
    'X-Event-Pin': auth.pin,
    ...(options.headers || {})
  };
  const response = await fetch(`${API}${path}`, {...options, headers});
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function pullCloud({silent = false} = {}) {
  if (!auth?.pin || syncBusy || pendingLocalSave) return false;
  syncBusy = true;
  if (!silent) setSync('saving', 'Connecting');
  try {
    const data = await apiFetch('/state');
    applyCloudState(data.state || {}, {updatedAt: data.updatedAt});
    setSync('synced');
    return true;
  } catch (error) {
    if (error.status === 401) {
      clearAuth();
      showLogin('That PIN was not accepted.');
    } else {
      setSync(navigator.onLine ? 'error' : 'offline');
    }
    return false;
  } finally {
    syncBusy = false;
  }
}

async function pushCloud() {
  if (!auth?.pin) {
    setSync('offline');
    return false;
  }
  if (!navigator.onLine) {
    pendingLocalSave = true;
    setSync('offline');
    return false;
  }

  syncBusy = true;
  pendingLocalSave = true;
  setSync('saving');

  const nextState = cloudPayload();
  try {
    await apiFetch('/state', {
      method: 'PUT',
      body: JSON.stringify({
        state: nextState,
        updatedBy: auth.deviceName || 'Unknown device'
      })
    });
    state = {...state, revision: nextState.revision, clientUpdatedAt: nextState.clientUpdatedAt};
    storeState();
    pendingLocalSave = false;
    setSync('synced');
    return true;
  } catch (error) {
    if (error.status === 401) {
      clearAuth();
      showLogin('That PIN is no longer valid.');
    } else {
      setSync(navigator.onLine ? 'error' : 'offline');
    }
    return false;
  } finally {
    syncBusy = false;
  }
}

function save({immediate = false} = {}) {
  storeState();
  render();

  pendingLocalSave = true;
  clearTimeout(saveTimer);
  if (immediate) {
    pushCloud();
  } else {
    saveTimer = setTimeout(pushCloud, 450);
  }
}

function clearAuth() {
  auth = null;
  sessionStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_KEY);
}

function showLogin(errorMessage = '') {
  $('#loginError').textContent = errorMessage;
  const dialog = $('#loginDialog');
  if (!dialog.open) dialog.showModal();
}

async function connectDevice(deviceName, pin) {
  storeAuth({deviceName: deviceName.trim(), pin: pin.trim()});
  setSync('saving', 'Testing');
  const ok = await pullCloud();
  if (!ok) return false;
  $('#loginDialog').close();
  startPolling();
  toast('Connected to shared event data');
  return true;
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!document.hidden && navigator.onLine && !pendingLocalSave) {
      pullCloud({silent: true});
    }
  }, POLL_MS);
}

function mins(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function fmt(total) {
  total = (total + 1440) % 1440;
  let hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function nowM() {
  const date = new Date();
  return date.getHours() * 60 + date.getMinutes();
}

function shifted(item) {
  return {
    start: mins(item.start) + Number(state.delay || 0),
    end: mins(item.end) + Number(state.delay || 0)
  };
}

function currentIndex() {
  const now = nowM();
  let index = DATA.schedule.findIndex(item => {
    const timing = shifted(item);
    return now >= timing.start &&
      now < timing.end &&
      !state.completed.includes(item.id);
  });
  if (index < 0) {
    index = DATA.schedule.findIndex(item => !state.completed.includes(item.id));
  }
  return index < 0 ? DATA.schedule.length - 1 : index;
}

function typeLabel(type) {
  return ({
    setup: 'Setup',
    performance: 'Performance',
    transition: 'Transition',
    storytime: 'Story Time',
    games: 'Games & Giveaways',
    glam: 'Glam Show',
    end: 'Closing'
  })[type] || 'Production';
}

function initials(name) {
  return name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function personData(person) {
  return {...person, ...(state.people[person.id] || {})};
}

function showScreen(name, {userNavigation = false} = {}) {
  const currentName = state.screen || 'live';
  const currentScreen = document.querySelector(`.screen[data-screen="${currentName}"]`);

  if (currentScreen && currentName !== name) {
    scrollPositions[currentName] = currentScreen.scrollTop;
  }

  state.screen = name;
  $$('.screen').forEach(screen =>
    screen.classList.toggle('active', screen.dataset.screen === name)
  );
  $$('.tab-bar button').forEach(button =>
    button.classList.toggle('active', button.dataset.tab === name)
  );

  $('#screenTitle').textContent =
    name === 'people' ? 'People' : name[0].toUpperCase() + name.slice(1);

  storeState();

  const nextScreen = document.querySelector(`.screen[data-screen="${name}"]`);
  if (nextScreen) {
    requestAnimationFrame(() => {
      nextScreen.scrollTop = userNavigation
        ? scrollPositions[name] || 0
        : scrollPositions[name] ?? nextScreen.scrollTop;
    });
  }
}

function renderClock() {
  const date = new Date();
  $('#clock').textContent = date.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
  $('#date').textContent = date.toLocaleDateString([], {weekday: 'long'});

  const item = DATA.schedule[currentIndex()];
  const timing = shifted(item);
  const left = timing.end - nowM();

  $('#remaining').textContent = left > 0
    ? `${left} min left`
    : left === 0 ? 'Ending now' : `${Math.abs(left)} min over`;

  const percent = Math.max(0, Math.min(
    100,
    ((nowM() - timing.start) / (timing.end - timing.start)) * 100
  ));
  $('#liveProgress').style.width = `${percent}%`;
}

function fill(prefix, item) {
  if (!item) {
    $(`#${prefix}Title`).textContent = 'End of day';
    $(`#${prefix}Meta`).textContent = '—';
    return;
  }
  const timing = shifted(item);
  $(`#${prefix}Title`).textContent = item.title;
  $(`#${prefix}Meta`).textContent =
    `${fmt(timing.start)} · ${item.subtitle || typeLabel(item.type)}`;
}

function renderLive() {
  const index = currentIndex();
  const item = DATA.schedule[index];
  const timing = shifted(item);

  $('#liveType').textContent = typeLabel(item.type);
  $('#liveTitle').textContent = item.title;
  $('#liveSubtitle').textContent =
    [item.subtitle, item.talent, item.notes].filter(Boolean).join(' · ');
  $('#liveRange').textContent = `${fmt(timing.start)} – ${fmt(timing.end)}`;
  $('#delayBadge').textContent = state.delay
    ? `${state.delay > 0 ? '+' : ''}${state.delay} MIN`
    : '';

  fill('next', DATA.schedule[index + 1]);
  fill('after', DATA.schedule[index + 2]);

  const checked = DATA.talent.filter(person => state.people[person.id]?.checked).length;
  $('#checkedCount').textContent = `${checked}/${DATA.talent.length}`;
  $('#issueCount').textContent = state.issues.length;
  $('#doneCount').textContent = `${state.completed.length}/${DATA.schedule.length}`;
  const preview = $('#liveHandoffPreview');
  if (preview) preview.textContent = state.handoff?.trim() || 'No handoff notes yet.';

  const isReady = state.ready.includes(item.id);
  $('#readyCurrent').classList.toggle('is-on', isReady);
  $('#readyCurrent').textContent = isReady ? 'Stage Ready ✓' : 'Stage Ready';
  renderClock();
}

function renderSchedule() {
  const current = currentIndex();
  $('#scheduleList').innerHTML = DATA.schedule.map((item, index) => {
    const timing = shifted(item);
    const done = state.completed.includes(item.id);
    const ready = state.ready.includes(item.id);
    return `<article class="schedule-card ${index === current ? 'current' : ''} ${done ? 'complete' : ''} ${ready ? 'ready' : ''}">
      <div class="schedule-top">
        <div class="schedule-time">${fmt(timing.start)}</div>
        <div class="schedule-copy">
          <b>${item.title}</b>
          <small>${[item.subtitle, item.talent, item.notes].filter(Boolean).join(' · ')}</small>
        </div>
        <span>${done ? '✓' : ''}</span>
      </div>
      <div class="card-actions">
        <button data-ready="${item.id}" class="${ready ? 'is-on' : ''}">${ready ? 'Ready ✓' : 'Stage Ready'}</button>
        <button data-complete="${item.id}">${done ? 'Undo' : 'Complete'}</button>
      </div>
    </article>`;
  }).join('');
}

function renderIssues() {
  const count = state.issues.length;
  const countEl = $('#issueSummaryCount');
  const textEl = $('#issueSummaryText');
  const iconEl = $('#issueStatusIcon');

  if (countEl) countEl.textContent = `${count} Open`;
  if (textEl) {
    textEl.textContent = count
      ? `${count === 1 ? 'One issue needs' : 'Issues need'} production attention.`
      : 'Production is clear.';
  }
  if (iconEl) {
    iconEl.textContent = count ? '!' : '✓';
    iconEl.className = `issue-status-icon ${count ? 'alert' : 'clear'}`;
  }

  $('#issueList').innerHTML = count
    ? state.issues.map(issue => `<article class="issue-card">
        <i class="issue-dot"></i>
        <div>
          <b>${issue.title}</b>
          <small>${issue.details || 'No details'} · ${issue.time}</small>
        </div>
        <button data-resolve="${issue.id}">Done</button>
      </article>`).join('')
    : '<div class="empty">No open production issues.</div>';
}

function renderPeople() {
  const fair = state.fairContact || defaultFair;
  $('#fairContactCard').innerHTML = `<article class="fair-contact-card">
    <div class="person-copy">
      <b>${fair.name}</b>
      <small>${fair.role || 'OC Fair'}${fair.phone ? ` · ${fair.phone}` : ''}</small>
    </div>
    <div></div>
    <div class="fair-actions">
      <a class="${fair.phone ? '' : 'disabled'}" href="${fair.phone ? `tel:${fair.phone}` : '#'}">Call</a>
      <a class="${fair.email ? '' : 'disabled'}" href="${fair.email ? `mailto:${fair.email}` : '#'}">Email</a>
    </div>
  </article>`;

  $('#peopleList').innerHTML = DATA.talent.map(person => {
    const current = personData(person);
    return `<article class="person-card">
      <div class="person-head">
        <div class="avatar">${initials(current.name)}</div>
        <div class="person-copy">
          <b>${current.name}</b>
          <small>${current.arrival || 'Arrival not entered'} · ${current.notes || 'No notes'}</small>
        </div>
        <button class="person-edit" data-edit-person="${person.id}">Edit</button>
      </div>
      <div class="person-actions">
        <button data-check="${person.id}" class="${current.checked ? 'is-on' : ''}">${current.checked ? 'In ✓' : 'Check In'}</button>
        <button data-person-ready="${person.id}" class="${current.ready ? 'is-on' : ''}">${current.ready ? 'Ready ✓' : 'Ready'}</button>
        <a class="${current.phone ? '' : 'disabled'}" href="${current.phone ? `tel:${current.phone}` : '#'}">Call</a>
        <a class="${current.phone ? '' : 'disabled'}" href="${current.phone ? `sms:${current.phone}` : '#'}">Text</a>
        <a class="${current.email ? '' : 'disabled'}" href="${current.email ? `mailto:${current.email}` : '#'}">Email</a>
      </div>
    </article>`;
  }).join('');

  $('#handoffNotes').value = state.handoff || '';
}

function render() {
  const activeName = state.screen || 'live';
  const activeScreen = document.querySelector(`.screen[data-screen="${activeName}"]`);
  if (activeScreen) scrollPositions[activeName] = activeScreen.scrollTop;

  renderLive();
  renderSchedule();
  renderIssues();
  renderPeople();
  showScreen(activeName, {userNavigation: false});
}

function addIssue(title, details = '') {
  state.issues.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    details,
    time: new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})
  });
  save();
  showScreen('issues', {userNavigation: true});
}

function openPersonEditor(id) {
  const person = DATA.talent.find(item => item.id === id);
  const current = personData(person);
  const form = $('#personForm');

  $('#personDialogTitle').textContent = `Edit ${current.name}`;
  form.elements.id.value = id;
  form.elements.name.value = current.name || '';
  form.elements.phone.value = current.phone || '';
  form.elements.email.value = current.email || '';
  form.elements.arrival.value = current.arrival || '';
  form.elements.notes.value = current.notes || '';
  $('#personDialog').showModal();
}

function openFairEditor() {
  const form = $('#fairForm');
  const contact = state.fairContact || defaultFair;
  form.elements.name.value = contact.name || '';
  form.elements.role.value = contact.role || '';
  form.elements.phone.value = contact.phone || '';
  form.elements.email.value = contact.email || '';
  $('#fairDialog').showModal();
}

function handoffText() {
  const index = currentIndex();
  const current = DATA.schedule[index];
  const next = DATA.schedule[index + 1];
  const issues = state.issues.map(issue =>
    `• ${issue.title}: ${issue.details || 'No details'}`
  ).join('\n') || '• None';

  return `OATF OC FAIR HANDOFF
Current: ${current.title}
Next: ${next?.title || 'End of day'}
Delay: ${state.delay} minutes
Completed: ${state.completed.length}/${DATA.schedule.length}
Issues:
${issues}
Notes:
${$('#handoffNotes').value || 'None'}`;
}

$$('.screen').forEach(screen => {
  screen.addEventListener('scroll', () => {
    scrollPositions[screen.dataset.screen] = screen.scrollTop;
  }, {passive: true});
});

document.addEventListener('click', event => {
  const tab = event.target.closest('[data-tab]');
  if (tab) {
    showScreen(tab.dataset.tab, {userNavigation: true});
    return;
  }

  const nav = event.target.closest('[data-nav]');
  if (nav) {
    showScreen(nav.dataset.nav, {userNavigation: true});
    return;
  }

  const current = DATA.schedule[currentIndex()];

  if (event.target.id === 'completeCurrent') {
    if (!state.completed.includes(current.id)) state.completed.push(current.id);
    save();
  }

  if (event.target.id === 'readyCurrent') {
    state.ready = state.ready.includes(current.id)
      ? state.ready.filter(id => id !== current.id)
      : [...state.ready, current.id];
    save();
  }

  if (event.target.id === 'delayMenu') $('#delayDialog').showModal();

  if (event.target.dataset.delay) {
    state.delay += Number(event.target.dataset.delay);
    $('#delayDialog').close();
    save({immediate: true});
  }

  if (event.target.id === 'quickIssue' || event.target.id === 'newIssue') {
    $('#issueDialog').showModal();
  }

  if (event.target.dataset.issueType) addIssue(event.target.dataset.issueType);

  if (event.target.id === 'resetDay' &&
      confirm('Reset shared progress, check-ins, delays, contacts, and issues for every connected device?')) {
    state = {...clone(base), screen: state.screen};
    save({immediate: true});
  }

  const readyId = event.target.dataset.ready;
  if (readyId) {
    state.ready = state.ready.includes(readyId)
      ? state.ready.filter(id => id !== readyId)
      : [...state.ready, readyId];
    save();
  }

  const completeId = event.target.dataset.complete;
  if (completeId) {
    state.completed = state.completed.includes(completeId)
      ? state.completed.filter(id => id !== completeId)
      : [...state.completed, completeId];
    save();
  }

  const checkId = event.target.dataset.check;
  if (checkId) {
    state.people[checkId] = {
      ...(state.people[checkId] || {}),
      checked: !state.people[checkId]?.checked
    };
    save();
  }

  const personReadyId = event.target.dataset.personReady;
  if (personReadyId) {
    state.people[personReadyId] = {
      ...(state.people[personReadyId] || {}),
      ready: !state.people[personReadyId]?.ready
    };
    save();
  }

  const editPersonId = event.target.dataset.editPerson;
  if (editPersonId) openPersonEditor(editPersonId);

  const resolveId = event.target.dataset.resolve;
  if (resolveId) {
    state.issues = state.issues.filter(issue => issue.id !== resolveId);
    save();
  }

  if (event.target.id === 'editFairContact') openFairEditor();

  if (event.target.id === 'saveHandoff') {
    state.handoff = $('#handoffNotes').value;
    save({immediate: true});
  }

  if (event.target.id === 'copyHandoff') {
    navigator.clipboard?.writeText(handoffText());
    toast('Handoff copied');
  }

  if (event.target.closest('#syncStatus')) {
    if (!auth?.pin) {
      showLogin();
    } else if (syncMode === 'error' || syncMode === 'offline') {
      pullCloud();
    } else {
      toast(`Connected as ${auth.deviceName}`);
    }
  }
});

$('#issueForm').addEventListener('submit', event => {
  const form = new FormData(event.target);
  if (!form.get('title')) return;
  addIssue(form.get('title'), form.get('details'));
  event.target.reset();
});

$('#personForm').addEventListener('submit', event => {
  const form = new FormData(event.target);
  const id = form.get('id');

  state.people[id] = {
    ...(state.people[id] || {}),
    name: form.get('name'),
    phone: form.get('phone'),
    email: form.get('email'),
    arrival: form.get('arrival'),
    notes: form.get('notes')
  };
  save({immediate: true});
});

$('#fairForm').addEventListener('submit', event => {
  const form = new FormData(event.target);
  state.fairContact = {
    name: form.get('name'),
    role: form.get('role'),
    phone: form.get('phone'),
    email: form.get('email')
  };
  save({immediate: true});
});

$('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.target);
  $('#loginError').textContent = '';
  const button = event.target.querySelector('.login-button');
  button.disabled = true;
  button.textContent = 'Connecting…';

  const ok = await connectDevice(form.get('deviceName'), form.get('pin'));

  button.disabled = false;
  button.textContent = 'Connect';
  if (!ok && auth) $('#loginError').textContent = 'Could not connect. Check the PIN and try again.';
});

window.addEventListener('online', async () => {
  if (pendingLocalSave) {
    await pushCloud();
  } else {
    await pullCloud();
  }
});

window.addEventListener('offline', () => setSync('offline'));

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && auth?.pin) pullCloud({silent: true});
});

setInterval(renderClock, 30000);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();

if (auth?.pin) {
  pullCloud().then(startPolling);
} else {
  setSync('offline');
  showLogin();
}
})();
