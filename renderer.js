const MODES = {
  pomodoro: { duration: 25 * 60, label: '专注' },
  short: { duration: 5 * 60, label: '短休息' },
  long: { duration: 15 * 60, label: '长休息' }
};

let state = {
  mode: 'pomodoro',
  timeLeft: MODES.pomodoro.duration,
  isRunning: false,
  sessionCount: 0,
  todayPomodoros: 0,
  todayMinutes: 0,
  currentTask: '',
  intervalId: null,
  settings: {
    pomodoroDuration: 25,
    shortDuration: 5,
    longDuration: 15,
    longInterval: 4,
    autoStartBreaks: true,
    autoStartPomodoros: false
  }
};

const elements = {
  timeDisplay: document.getElementById('timeDisplay'),
  progressCircle: document.getElementById('progressCircle'),
  startBtn: document.getElementById('startBtn'),
  resetBtn: document.getElementById('resetBtn'),
  sessionCount: document.getElementById('sessionCount'),
  todayPomodoros: document.getElementById('todayPomodoros'),
  todayMinutes: document.getElementById('todayMinutes'),
  taskInput: document.getElementById('taskInput'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsPanel: document.getElementById('settingsPanel'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
  tabs: document.querySelectorAll('.tab'),
  progressRing: document.querySelector('.progress-ring'),
  ambientSound: document.getElementById('ambientSound')
};

const circumference = 2 * Math.PI * 90;

function loadSettings() {
  const saved = localStorage.getItem('pomodoroSettings');
  if (saved) {
    state.settings = { ...state.settings, ...JSON.parse(saved) };
    applySettings();
  }
}

function saveSettings() {
  localStorage.setItem('pomodoroSettings', JSON.stringify(state.settings));
}

function applySettings() {
  const { pomodoroDuration, shortDuration, longDuration } = state.settings;
  MODES.pomodoro.duration = pomodoroDuration * 60;
  MODES.short.duration = shortDuration * 60;
  MODES.long.duration = longDuration * 60;

  document.getElementById('pomodoroDuration').value = pomodoroDuration;
  document.getElementById('shortDuration').value = shortDuration;
  document.getElementById('longDuration').value = longDuration;
  document.getElementById('longInterval').value = state.settings.longInterval;
  document.getElementById('autoStartBreaks').checked = state.settings.autoStartBreaks;
  document.getElementById('autoStartPomodoros').checked = state.settings.autoStartPomodoros;
}

function loadStats() {
  const today = new Date().toDateString();
  const saved = localStorage.getItem('pomodoroStats');
  const stats = saved ? JSON.parse(saved) : { date: '', pomodoros: 0, minutes: 0 };

  if (stats.date !== today) {
    state.todayPomodoros = 0;
    state.todayMinutes = 0;
  } else {
    state.todayPomodoros = stats.pomodoros;
    state.todayMinutes = stats.minutes;
  }
  updateStats();
}

function saveStats() {
  const today = new Date().toDateString();
  localStorage.setItem('pomodoroStats', JSON.stringify({
    date: today,
    pomodoros: state.todayPomodoros,
    minutes: state.todayMinutes
  }));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateDisplay() {
  elements.timeDisplay.textContent = formatTime(state.timeLeft);

  const total = MODES[state.mode].duration;
  const progress = (total - state.timeLeft) / total;
  const offset = circumference * (1 - progress);
  elements.progressCircle.style.strokeDashoffset = offset;
}

function updateStats() {
  elements.todayPomodoros.textContent = state.todayPomodoros;
  elements.todayMinutes.textContent = state.todayMinutes;
  elements.sessionCount.textContent = `第 ${state.sessionCount + 1} 个番茄`;
}

function updateTabs() {
  elements.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === state.mode);
  });
}

function setMode(mode) {
  if (state.isRunning) {
    clearInterval(state.intervalId);
    state.isRunning = false;
  }
  state.mode = mode;
  state.timeLeft = MODES[mode].duration;
  updateTabs();
  updateDisplay();
  elements.startBtn.textContent = '开始';
}

async function notify(title, body) {
  try {
    await window.electronAPI.showNotification(title, body);
  } catch (e) {
    console.log('Notification not supported');
  }
}

function onPomodoroComplete() {
  state.todayPomodoros++;
  state.todayMinutes += state.settings.pomodoroDuration;
  state.sessionCount++;
  saveStats();
  updateStats();
  notify('番茄完成！', `太棒了，你完成了一个番茄！休息一下吧。`);

  if (state.sessionCount % state.settings.longInterval === 0) {
    setMode('long');
  } else {
    setMode('short');
  }

  if (state.settings.autoStartBreaks) {
    startTimer();
  }
}

function onBreakComplete() {
  notify('休息结束！', '准备开始下一个番茄了吗？');
  setMode('pomodoro');

  if (state.settings.autoStartPomodoros) {
    startTimer();
  }
}

function startTimer() {
  if (state.isRunning) {
    clearInterval(state.intervalId);
    state.isRunning = false;
    elements.startBtn.textContent = '开始';
    elements.ambientSound.pause();
    return;
  }

  state.isRunning = true;
  elements.startBtn.textContent = '暂停';
  elements.ambientSound.volume = 0.3;
  elements.ambientSound.play().catch(() => {});

  state.intervalId = setInterval(() => {
    state.timeLeft--;
    updateDisplay();

    if (state.timeLeft <= 0) {
      clearInterval(state.intervalId);
      state.isRunning = false;
      elements.ambientSound.pause();
      elements.ambientSound.currentTime = 0;

      if (state.mode === 'pomodoro') {
        onPomodoroComplete();
      } else {
        onBreakComplete();
      }
    }
  }, 1000);
}

function resetTimer() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
  }
  state.isRunning = false;
  state.timeLeft = MODES[state.mode].duration;
  elements.startBtn.textContent = '开始';
  updateDisplay();
}

function openSettings() {
  applySettings();
  elements.settingsPanel.classList.add('show');
}

function closeSettings() {
  elements.settingsPanel.classList.remove('show');
}

function handleSaveSettings() {
  state.settings.pomodoroDuration = parseInt(document.getElementById('pomodoroDuration').value) || 25;
  state.settings.shortDuration = parseInt(document.getElementById('shortDuration').value) || 5;
  state.settings.longDuration = parseInt(document.getElementById('longDuration').value) || 15;
  state.settings.longInterval = parseInt(document.getElementById('longInterval').value) || 4;
  state.settings.autoStartBreaks = document.getElementById('autoStartBreaks').checked;
  state.settings.autoStartPomodoros = document.getElementById('autoStartPomodoros').checked;

  saveSettings();

  if (!state.isRunning) {
    state.timeLeft = MODES[state.mode].duration;
    updateDisplay();
  }

  closeSettings();
}

elements.startBtn.addEventListener('click', startTimer);
elements.resetBtn.addEventListener('click', resetTimer);
elements.settingsBtn.addEventListener('click', openSettings);
elements.saveSettingsBtn.addEventListener('click', handleSaveSettings);
elements.cancelSettingsBtn.addEventListener('click', closeSettings);
elements.taskInput.addEventListener('input', (e) => {
  state.currentTask = e.target.value;
});

elements.tabs.forEach(tab => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});

loadSettings();
loadStats();
updateDisplay();