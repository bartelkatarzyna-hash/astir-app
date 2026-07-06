(function () {
  const storageKey = "astir.v1";
  const atsHosts = ["greenhouse", "lever", "ashby", "workday", "smartrecruiters"];
  const statusOptions = ["Applied", "1st stage", "2nd stage", "3rd stage", "Offer", "Rejected", "Hired"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const activityOrder = ["apply", "net", "rest", "prep", "docs"];
  const numericLimits = {
    apply: { min: 1, max: 15, defaultValue: 5 },
    net: { min: 1, max: 10, defaultValue: 3 },
    rest: { min: 1, max: 4, defaultValue: 2 }
  };
  const icon = {
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18H9m9-2V11a6 6 0 0 0-12 0v5l-2 2h16z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    bellOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18H9m9-2V11a6 6 0 0 0-9.8-4.6M6 8.8c-.1.7-.2 1.4-.2 2.2v5l-2 2h14.4"/><path d="M10 20a2 2 0 0 0 4 0"/><path d="M4 4l16 16"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9.5l5 5 5-5"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2 8.8-9.4"/></svg>',
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c3.3 0 5.8-2.4 5.8-5.6 0-2.2-1.2-4.1-3.1-5.7-.5 1.7-1.5 2.7-2.6 3.4.2-3-1.1-5.2-3.2-7.1-.2 3.4-2.7 5.6-2.7 9.4C6.2 18.6 8.7 21 12 21z"/></svg>',
    kebab: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6.8" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="17.2" r="1.7"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>',
    minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>',
    open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
  };
  const defaultWatchlist = [
    {
      id: "company-enpal",
      company: "Enpal",
      link: "https://enpal.com/careers",
      alerts_on: true,
      roles: [
        {
          id: "role-enpal-home-energy",
          title: "Senior Product Manager, Home Energy",
          url: "https://enpal.com/careers/role",
          first_seen: relativeIso(-8),
          is_live: true,
          locations: [{ city: "Berlin", mode: "Hybrid" }]
        },
        {
          id: "role-enpal-installer-tools",
          title: "Product Manager, Installer Tools and Field Operations Enablement",
          url: "https://enpal.com/careers/role",
          first_seen: relativeIso(-90),
          is_live: true,
          locations: [{ city: "Berlin", mode: "On-site" }]
        }
      ]
    },
    {
      id: "company-aiven",
      company: "Aiven",
      link: "https://aiven.io/careers",
      alerts_on: true,
      roles: [
        {
          id: "role-aiven-developer-experience",
          title: "Staff Product Manager, Developer Experience",
          url: "https://aiven.io/careers/role",
          first_seen: relativeIso(-10),
          is_live: true,
          locations: [
            { city: "Berlin", mode: "Remote" },
            { city: "Amsterdam", mode: "Remote" },
            { city: "Copenhagen", mode: "Remote" },
            { city: "Helsinki", mode: "Remote" },
            { city: "London", mode: "Remote" },
            { city: "Oslo", mode: "Remote" },
            { city: "Stockholm", mode: "Remote" }
          ]
        }
      ]
    },
    {
      id: "company-klarna",
      company: "Klarna",
      link: "https://klarna.com/careers",
      alerts_on: false,
      roles: [
        {
          id: "role-klarna-payments",
          title: "Product Lead, Payments Experience",
          url: "https://klarna.com/careers/role",
          first_seen: relativeIso(-12),
          is_live: true,
          locations: [{ city: "Stockholm", mode: "Hybrid" }]
        }
      ]
    }
  ];
  const activity = {
    apply: {
      name: "Applications",
      type: "numeric",
      deep: "--gold-deep"
    },
    net: {
      name: "Networking",
      type: "numeric",
      deep: "--net-deep"
    },
    rest: {
      name: "Rest",
      type: "numeric",
      deep: "--rest-deep"
    },
    prep: {
      name: "Prep",
      type: "binary",
      deep: "--prep-deep"
    },
    docs: {
      name: "CV and docs",
      type: "binary",
      deep: "--docs-deep"
    }
  };

  const state = loadState();
  const today = new Date();
  const todayKey = toDateKey(today);
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const weekKey = toDateKey(weekStart);
  const els = {
    addApplication: document.getElementById("addApplication"),
    addCompany: document.getElementById("addCompany"),
    backdrop: document.getElementById("jobBackdrop"),
    cancelHeard: document.getElementById("cancelHeard"),
    cancelJob: document.getElementById("cancelJob"),
    cancelCompany: document.getElementById("cancelCompany"),
    cancelEditCompany: document.getElementById("cancelEditCompany"),
    cancelRemoveCompany: document.getElementById("cancelRemoveCompany"),
    companyBackdrop: document.getElementById("companyBackdrop"),
    companyForm: document.getElementById("companyForm"),
    companyPrefillNote: document.getElementById("companyPrefillNote"),
    confirmRemoveCompany: document.getElementById("confirmRemoveCompany"),
    demoActions: document.getElementById("demoActions"),
    demoHomeActions: document.getElementById("demoHomeActions"),
    demoPanel: document.getElementById("demoPanel"),
    editCompanyBackdrop: document.getElementById("editCompanyBackdrop"),
    editCompanyForm: document.getElementById("editCompanyForm"),
    editGoals: document.getElementById("editGoals"),
    form: document.getElementById("jobForm"),
    goalsBody: document.getElementById("goalsBody"),
    greeting: document.getElementById("greeting"),
    heardBack: document.getElementById("heardBack"),
    heardBackdrop: document.getElementById("heardBackdrop"),
    heardBackSection: document.getElementById("heardBackSection"),
    heardQuery: document.getElementById("heardQuery"),
    heardResults: document.getElementById("heardResults"),
    interactionScrim: document.getElementById("interactionScrim"),
    jobWatchHint: document.getElementById("jobWatchHint"),
    mini: document.getElementById("mini"),
    navLinks: document.querySelectorAll("[data-screen-link]"),
    removeCompanyBackdrop: document.getElementById("removeCompanyBackdrop"),
    removeCompanyTitle: document.getElementById("removeCompanyTitle"),
    screens: document.querySelectorAll("[data-screen]"),
    snackbar: document.getElementById("snackbar"),
    statusSelect: document.getElementById("statusSelect"),
    appliedDatePicker: document.getElementById("appliedDatePicker"),
    watchlistGroups: document.getElementById("watchlistGroups")
  };

  let snackTimer;
  let mode = "view";
  let draftGoals = [];
  let demoPreset = "";
  let demoState = null;
  let modalReturnFocus = null;
  let modalOrigin = "home";
  let activeCompanyId = "";
  let openMenuId = "";
  let openLayer = "";
  let quietOpen = false;
  let autoFilledCompany = false;
  let userEditedCompany = false;
  let heardReturnFocus = null;
  let calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  function relativeIso(hours) {
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  }

  function cloneWatchlist(companies) {
    return companies.map((company) => ({
      ...company,
      roles: (company.roles || []).map((role) => ({
        ...role,
        locations: (role.locations || []).map((location) => ({ ...location }))
      }))
    }));
  }

  function normalizeCompany(company) {
    return {
      id: company.id || `company-${Date.now()}`,
      company: company.company || "Company",
      link: company.link || "",
      alerts_on: company.alerts_on !== false,
      roles: (company.roles || []).map((role) => ({
        id: role.id || `role-${Date.now()}`,
        title: role.title || "Open role",
        url: role.url || company.link || "",
        first_seen: role.first_seen || (role.fresh ? relativeIso(-8) : relativeIso(-96)),
        is_live: role.is_live !== false,
        locations: Array.isArray(role.locations) && role.locations.length > 0 ? role.locations : parseLegacyLocation(role.location)
      }))
    };
  }

  function shouldUseFreshWatchlistSeed(saved) {
    if (!Array.isArray(saved.watchlist)) return true;
    const ids = saved.watchlist.map((company) => company.id).sort().join(",");
    return ids === "company-1password,company-tresorit,company-vanta" || ids === "company-aiven,company-enpal,company-klarna";
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey)) || {};
      return {
        applications: Array.isArray(saved.applications) ? saved.applications : [],
        days: saved.days || {},
        weeks: saved.weeks || {},
        hasVisited: Boolean(saved.hasVisited),
        lastGoals: Array.isArray(saved.lastGoals) ? saved.lastGoals : [],
        watchlist: shouldUseFreshWatchlistSeed(saved) ? cloneWatchlist(defaultWatchlist) : saved.watchlist.map(normalizeCompany)
      };
    } catch {
      return { applications: [], days: {}, weeks: {}, hasVisited: false, lastGoals: [], watchlist: cloneWatchlist(defaultWatchlist) };
    }
  }

  function saveState() {
    if (!demoState) {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }

  function activeState() {
    return demoState || state;
  }

  function ensureWatchlist() {
    const active = activeState();
    if (!Array.isArray(active.watchlist)) {
      active.watchlist = cloneWatchlist(defaultWatchlist);
    }
    active.watchlist = active.watchlist.map(normalizeCompany);
    return active.watchlist;
  }

  function ensureWeek() {
    const active = activeState();
    if (!active.weeks[weekKey]) {
      active.weeks[weekKey] = {
        goals: [],
        manual: { net: 0, restAdjust: 0, prep: false, docs: false },
        activityDays: {}
      };
    }
    const week = active.weeks[weekKey];
    week.goals = Array.isArray(week.goals) ? week.goals : [];
    week.manual = week.manual || { net: 0, prep: false, docs: false };
    if (typeof week.manual.restAdjust !== "number") {
      week.manual.restAdjust = -Math.max(0, week.manual.restOffset || 0);
    }
    week.activityDays = week.activityDays || {};
    return week;
  }

  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function fromDateKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function sameDate(a, b) {
    return toDateKey(a) === toDateKey(b);
  }

  function formatDisplayDate(key) {
    if (key === todayKey) return "Today";
    const date = fromDateKey(key);
    return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  }

  function addDays(date, count) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + count);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  function startOfWeek(date) {
    const copy = new Date(date);
    const offset = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - offset);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  function closeFloatingLayers() {
    if (!openLayer) return;
    openLayer = "";
    syncSurfaceState();
    renderSharedControls();
  }

  function syncSurfaceState() {
    const modalOpen = Boolean(activeModal());
    const menuOpen = Boolean(openMenuId);
    const floatingOpen = Boolean(openLayer);
    document.body.classList.toggle("surface-open", modalOpen || menuOpen || floatingOpen);
    document.body.classList.toggle("menu-open", menuOpen);
    els.interactionScrim.hidden = !menuOpen;
  }

  function renderSharedControls() {
    renderStatusSelect();
    renderDatePicker();
  }

  function renderStatusSelect() {
    const value = els.form.elements.status.value || "Applied";
    const open = openLayer === "status";
    const selectedIndex = Math.max(0, statusOptions.indexOf(value));
    els.statusSelect.innerHTML = `
      <button class="select-trigger ${open ? "open" : ""}" type="button" data-toggle-status aria-haspopup="listbox" aria-expanded="${open}">
        <span>${escapeText(value)}</span>
        <span class="select-chev" aria-hidden="true">${icon.chevronDown}</span>
      </button>
      <div class="select-menu ${open ? "open" : ""}" role="listbox" style="--selected-index: ${selectedIndex}">
        ${statusOptions.map((option) => `
          <button class="select-option ${option === value ? "selected" : ""}" type="button" role="option" aria-selected="${option === value}" data-status-option="${escapeText(option)}">
            <span>${escapeText(option)}</span>
            <span class="select-check" aria-hidden="true">${option === value ? icon.check : ""}</span>
          </button>
        `).join("")}
      </div>`;
  }

  function calendarCells(monthDate, selectedKey) {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = addDays(first, startOffset * -1);
    const cells = [];
    for (let index = 0; index < 42; index += 1) {
      const date = addDays(start, index);
      const key = toDateKey(date);
      const muted = date.getMonth() !== monthDate.getMonth() ? " muted-day" : "";
      const selected = key === selectedKey ? " selected" : "";
      const now = sameDate(date, today) ? " today" : "";
      cells.push(`<button class="day-cell${muted}${selected}${now}" type="button" data-date-option="${key}">${date.getDate()}</button>`);
    }
    return cells.join("");
  }

  function renderDatePicker() {
    const selectedKey = els.form.elements.appliedDate.value || todayKey;
    const open = openLayer === "date";
    els.appliedDatePicker.innerHTML = `
      <button class="date-trigger ${open ? "open" : ""}" type="button" data-toggle-date aria-haspopup="dialog" aria-expanded="${open}">
        <span>${formatDisplayDate(selectedKey)}</span>
        <span class="date-icon" aria-hidden="true">${icon.calendar}</span>
      </button>
      <div class="calendar-popover ${open ? "open" : ""}" role="dialog" aria-label="Choose applied date">
        <div class="calendar-head">
          <button class="calendar-nav" type="button" data-calendar-prev aria-label="Previous month">‹</button>
          <div class="calendar-title">${monthNames[calendarMonth.getMonth()]} ${calendarMonth.getFullYear()}</div>
          <button class="calendar-nav" type="button" data-calendar-next aria-label="Next month">›</button>
        </div>
        <div class="weekdays" aria-hidden="true">
          <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
        </div>
        <div class="calendar-grid">${calendarCells(calendarMonth, selectedKey)}</div>
      </div>`;
  }

  function setGreeting() {
    els.greeting.textContent = state.hasVisited ? "Welcome back, Kate" : "Welcome, Kate";
    if (!state.hasVisited) {
      state.hasVisited = true;
      saveState();
    }
  }

  function isInCurrentWeek(dateKey) {
    return dateKey >= toDateKey(weekStart) && dateKey <= toDateKey(weekEnd);
  }

  function applicationsThisWeek() {
    return activeState().applications.filter((application) => isInCurrentWeek(application.appliedDate || todayKey));
  }

  function isPostingApplied(role) {
    return activeState().applications.some((application) => application.postingId === role.id || (application.company === role.company && application.role === role.title));
  }

  function escapeText(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function dayHasApplication(dateKey) {
    return activeState().applications.some((application) => (application.appliedDate || todayKey) === dateKey);
  }

  function dayHasManualActivity(dateKey) {
    const day = ensureWeek().activityDays[dateKey];
    return Boolean(day && Object.values(day).some(Boolean));
  }

  function inferredRestDays() {
    let count = 0;
    for (let date = new Date(weekStart); date < today && date <= weekEnd; date = addDays(date, 1)) {
      const key = toDateKey(date);
      if (key !== todayKey && !dayHasApplication(key) && !dayHasManualActivity(key)) {
        count += 1;
      }
    }
    return count;
  }

  function progressFor(id) {
    const week = ensureWeek();
    if (id === "apply") return applicationsThisWeek().length;
    if (id === "net") return week.manual.net || 0;
    if (id === "rest") return Math.max(0, inferredRestDays() + (week.manual.restAdjust || 0));
    if (id === "prep") return week.manual.prep ? 1 : 0;
    if (id === "docs") return week.manual.docs ? 1 : 0;
    return 0;
  }

  function goalTarget(goal) {
    return activity[goal.id].type === "binary" ? 1 : goal.target;
  }

  function isGoalMet(goal) {
    return progressFor(goal.id) >= goalTarget(goal);
  }

  function pulseMini() {
    els.mini.classList.remove("pulse");
    void els.mini.offsetWidth;
    els.mini.classList.add("pulse");
  }

  function showSnack(message, options = {}) {
    window.clearTimeout(snackTimer);
    els.snackbar.innerHTML = "";
    if (options.linkText && message.includes(options.linkText)) {
      const [before, after] = message.split(options.linkText);
      const link = document.createElement("a");
      link.href = options.href || "#";
      link.textContent = options.linkText;
      els.snackbar.append(document.createTextNode(before), link, document.createTextNode(after));
    } else {
      els.snackbar.textContent = message;
    }
    els.snackbar.hidden = false;
    snackTimer = window.setTimeout(() => {
      els.snackbar.hidden = true;
    }, options.duration || 3500);
  }

  function getStrokeOffset(progress, target) {
    const length = 126;
    const fraction = target === 0 ? 0 : Math.min(progress, target) / target;
    return length - length * fraction;
  }

  function gaugeSvg(goal, progress) {
    const info = activity[goal.id];
    const target = goalTarget(goal);
    const offset = getStrokeOffset(progress, target);
    const center = `<text class="gauge-ratio" x="48" y="41" text-anchor="middle">${progress}/${target}</text>`;

    return `
      <svg class="goal-gauge" viewBox="0 0 96 56" aria-hidden="true" style="--goal-color: var(${info.deep}); --goal-offset: ${offset}">
        <path class="gauge-track" pathLength="126" d="M8 48a40 40 0 0 1 80 0"></path>
        <path class="gauge-sweep" pathLength="126" d="M8 48a40 40 0 0 1 80 0"></path>
        ${center}
      </svg>`;
  }

  function renderGoalTile(goal) {
    const info = activity[goal.id];
    const progress = progressFor(goal.id);
    const met = isGoalMet(goal);
    const metClass = met ? " met" : "";
    const canEdit = goal.id !== "apply";

    return `
      <article class="goal-tile ${goal.id}${metClass}${canEdit ? " editable" : ""}" data-goal="${goal.id}">
        ${gaugeSvg(goal, progress)}
        <div class="goal-title-row">
          <div class="goal-title">${info.name}</div>
          ${infoButton()}
        </div>
        ${canEdit ? goalStepper(goal.id, info.name) : ""}
      </article>`;
  }

  function infoButton() {
    return `<span class="goal-info" data-info-tooltip="Lorem ipsum">${icon.info}</span>`;
  }

  function goalStepper(id, name) {
    return `
      <div class="goal-stepper" aria-hidden="false">
        <button class="goal-step minus" type="button" data-decrement-goal="${id}" aria-label="Remove ${name} entry">${icon.minus}</button>
        <button class="goal-step plus" type="button" data-increment-goal="${id}" aria-label="Add ${name} entry">${icon.plus}</button>
      </div>`;
  }

  function placeholderTile(id) {
    return `
      <article class="goal-tile ghost-tile" aria-disabled="true">
        <svg class="goal-gauge" viewBox="0 0 96 56" aria-hidden="true" style="--goal-color: var(${activity[id].deep}); --goal-offset: 126">
          <path class="gauge-track" pathLength="126" d="M8 48a40 40 0 0 1 80 0"></path>
          <path class="gauge-sweep" pathLength="126" d="M8 48a40 40 0 0 1 80 0"></path>
        </svg>
        <div class="goal-title-row">
          <div class="goal-title">${activity[id].name}</div>
          ${infoButton()}
        </div>
      </article>`;
  }

  function renderUnwritten() {
    els.editGoals.hidden = true;
    els.editGoals.textContent = "Set up";
    els.editGoals.hidden = false;
    els.goalsBody.innerHTML = `
      <div class="unwritten-line">Set up your goals for this week</div>
      <div class="goal-grid ghost-grid">${activityOrder.map(placeholderTile).join("")}</div>`;
  }

  function renderActiveGoals() {
    const goals = ensureWeek().goals;
    const selectedById = new Map(goals.map((goal) => [goal.id, goal]));
    const allMet = goals.length > 0 && goals.every(isGoalMet);
    const support = allMet ? "You achieved all your week's goals. Congrats!" : "You're doing great, keep it up!";
    els.editGoals.textContent = "Edit";
    els.editGoals.hidden = false;
    els.goalsBody.innerHTML = `
      <div class="goals-support">${support}</div>
      <div class="goal-grid">${activityOrder.map((id) => {
        const goal = selectedById.get(id);
        return goal ? renderGoalTile(goal) : placeholderTile(id);
      }).join("")}</div>`;
  }

  function cloneGoals(goals) {
    return goals.map((goal) => ({ id: goal.id, target: goal.target }));
  }

  function startSetup() {
    mode = "setup";
    draftGoals = cloneGoals(ensureWeek().goals);
    render();
  }

  function goalFromId(id) {
    return {
      id,
      target: activity[id].type === "numeric" ? numericLimits[id].defaultValue : 1
    };
  }

  function draftGoal(id) {
    return draftGoals.find((goal) => goal.id === id);
  }

  function toggleDraft(id) {
    const existing = draftGoal(id);
    if (existing) {
      draftGoals = draftGoals.filter((goal) => goal.id !== id);
    } else {
      draftGoals.push(goalFromId(id));
      draftGoals.sort((a, b) => activityOrder.indexOf(a.id) - activityOrder.indexOf(b.id));
    }
    renderSetup();
  }

  function adjustDraft(id, delta) {
    const goal = draftGoal(id);
    if (!goal) return;
    const limits = numericLimits[id];
    goal.target = Math.max(limits.min, Math.min(limits.max, goal.target + delta));
    renderSetup();
  }

  function finishSetup() {
    const week = ensureWeek();
    week.goals = cloneGoals(draftGoals);
    if (week.goals.length > 0) {
      activeState().lastGoals = cloneGoals(week.goals);
    }
    mode = "view";
    saveState();
    render();
  }

  function applyLastGoals() {
    const last = activeState().lastGoals || [];
    if (last.length === 0) return;
    ensureWeek().goals = cloneGoals(last);
    mode = "view";
    saveState();
    render();
  }

  function renderSetupRow(id) {
    const info = activity[id];
    const goal = draftGoal(id);
    const selected = Boolean(goal);
    const selectedClass = selected ? " selected" : "";
    const label = info.name;
    const stepper = selected && info.type === "numeric"
      ? `<div class="setup-stepper">
          <button class="setup-round" type="button" data-draft-adjust="${id}" data-delta="-1" aria-label="Decrease ${info.name}">&minus;</button>
          <span>${goal.target}</span>
          <button class="setup-round" type="button" data-draft-adjust="${id}" data-delta="1" aria-label="Increase ${info.name}">+</button>
        </div>`
      : "";

    return `
      <div class="setup-row${selectedClass}" data-draft-toggle="${id}">
        <span>${label}</span>
        ${stepper}
      </div>`;
  }

  function renderSetup() {
    const allSelected = draftGoals.length === activityOrder.length;
    els.editGoals.hidden = true;
    els.goalsBody.innerHTML = `
      <div class="setup-hint">Pick what this week is for. Numbers are yours to set, and only you see them.</div>
      <div class="setup-list">${activityOrder.map(renderSetupRow).join("")}</div>
      <div class="setup-footer">
        <button class="btn ghost" type="button" data-finish-setup>Done</button>
        <div class="setup-complete" ${allSelected ? "" : "hidden"}>That is the whole list</div>
      </div>`;
  }

  function renderGoalsCard() {
    if (mode === "setup") {
      renderSetup();
      return;
    }
    if (ensureWeek().goals.length === 0) {
      renderUnwritten();
    } else {
      renderActiveGoals();
    }
  }

  function render() {
    renderGoalsCard();
    renderWatchlist();
    els.heardBackSection.hidden = activeState().applications.length === 0;
  }

  function openRoles(company) {
    return company.roles
      .map((role) => ({ ...role, company: company.company }))
      .filter((role) => role.is_live !== false && !isPostingApplied(role));
  }

  function newestTime(company) {
    const roles = openRoles(company);
    if (roles.length === 0) return 0;
    return Math.max(...roles.map((role) => new Date(role.first_seen).getTime() || 0));
  }

  function isFresh(role) {
    return Date.now() - new Date(role.first_seen).getTime() < 48 * 60 * 60 * 1000;
  }

  function parseLegacyLocation(location) {
    if (!location) return [{ city: "Berlin", mode: "Remote" }];
    const parts = String(location).split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return [{ city: parts[0], mode: normalizeMode(parts[1]) }];
    }
    return [{ city: parts[0] || "Berlin", mode: "Remote" }];
  }

  function normalizeMode(mode) {
    const value = String(mode || "Remote").toLowerCase();
    if (value.includes("site")) return "On-site";
    if (value.includes("hybrid")) return "Hybrid";
    return "Remote";
  }

  function locationLabel(role) {
    const locations = role.locations || [];
    const first = locations[0] || { city: "Berlin", mode: "Remote" };
    const city = escapeText(first.city);
    const mode = escapeText(normalizeMode(first.mode));
    if (locations.length <= 1) {
      return `${city}, ${mode}`;
    }
    return `${city} <span class="more-cities">+${locations.length - 1}</span>, ${mode}`;
  }

  function roleRow(company, role) {
    const fresh = isFresh(role)
      ? `<span class="flame-slot has-flame" data-tooltip="New">${icon.flame}</span>`
      : '<span class="flame-slot"></span>';
    return `
      <div class="watch-role" data-role-id="${escapeText(role.id)}">
        ${fresh}
        <div class="role-main">
          <div class="role-title-line">
            <span class="role-name" title="${escapeText(role.title)}">${escapeText(role.title)}</span>
            <button class="round-icon small" type="button" data-open-role="${escapeText(role.url)}" aria-label="Open posting" data-tooltip="Open posting">${icon.open}</button>
          </div>
          <div class="role-loc">${locationLabel(role)}</div>
        </div>
        <button class="round-icon add-application" type="button" data-apply-role="${escapeText(role.id)}" data-company-id="${escapeText(company.id)}" aria-label="Add application" data-tooltip="Add application">${icon.plus}</button>
      </div>`;
  }

  function companyActions(company) {
    const bellLabel = company.alerts_on ? "Alerts on" : "Alerts off";
    const bellClass = company.alerts_on ? "on" : "off";
    const menuOpen = openMenuId === company.id ? " open" : "";
    return `
      <button class="round-icon bell ${bellClass}" type="button" data-toggle-alerts="${escapeText(company.id)}" aria-label="${bellLabel}" data-tooltip="Alerts">${company.alerts_on ? icon.bell : icon.bellOff}</button>
      <span class="company-spacer"></span>
      <span class="menu-wrap${menuOpen}">
        <button class="round-icon kebab" type="button" data-company-menu="${escapeText(company.id)}" aria-label="More" data-tooltip="More">${icon.kebab}</button>
        <span class="watch-menu">
          <button type="button" data-edit-company="${escapeText(company.id)}">Edit</button>
          <button type="button" data-remove-company="${escapeText(company.id)}">Remove</button>
        </span>
      </span>`;
  }

  function companyCard(company) {
    const rows = openRoles(company).map((role) => roleRow(company, role)).join("");
    return `
      <article class="watch-group" data-company-id="${escapeText(company.id)}">
        <div class="watch-head">
          <div class="company-name">${escapeText(company.company)}</div>
          ${companyActions(company)}
        </div>
        ${rows}
      </article>`;
  }

  function quietRow(company) {
    return `
      <div class="quiet-row" data-company-id="${escapeText(company.id)}">
        <div class="company-name">${escapeText(company.company)}</div>
        ${companyActions(company)}
      </div>`;
  }

  function renderWatchlist() {
    const companies = ensureWatchlist();
    if (companies.length === 0) {
      els.watchlistGroups.innerHTML = '<div class="watch-invite">Add a company you would fight for. We will watch its board for you.</div>';
      return;
    }

    const liveCompanies = companies
      .filter((company) => openRoles(company).length > 0)
      .sort((a, b) => newestTime(b) - newestTime(a));
    const quietCompanies = companies.filter((company) => openRoles(company).length === 0);
    const shouldOpenQuiet = quietOpen || liveCompanies.length === 0;
    const quiet = quietCompanies.length > 0
      ? `
        <section class="quiet-section ${shouldOpenQuiet ? "open" : ""}">
          <button class="quiet-toggle" type="button" data-toggle-quiet>
            <span class="quiet-chevron">${icon.chevron}</span>
            <span>Nothing open elsewhere right now</span>
          </button>
          <div class="quiet-list" ${shouldOpenQuiet ? "" : "hidden"}>
            ${quietCompanies.map(quietRow).join("")}
          </div>
        </section>`
      : "";

    els.watchlistGroups.innerHTML = `
      <div class="watch-card-list">${liveCompanies.map(companyCard).join("")}</div>
      ${quiet}`;
  }

  function markManualDay(kind, value) {
    const week = ensureWeek();
    week.activityDays[todayKey] = week.activityDays[todayKey] || {};
    week.activityDays[todayKey][kind] = value;
  }

  function adjustNetworking(delta) {
    const week = ensureWeek();
    week.manual.net = Math.max(0, (week.manual.net || 0) + delta);
    markManualDay("net", week.manual.net > 0);
    saveState();
    render();
  }

  function toggleBinary(id) {
    const week = ensureWeek();
    week.manual[id] = !week.manual[id];
    markManualDay(id, week.manual[id]);
    saveState();
    render();
  }

  function incrementGoal(id) {
    const week = ensureWeek();
    if (id === "net") {
      adjustNetworking(1);
      return;
    }
    if (id === "rest") {
      week.manual.restAdjust = (week.manual.restAdjust || 0) + 1;
      saveState();
      render();
      return;
    }
    if (id === "prep" || id === "docs") {
      week.manual[id] = true;
      markManualDay(id, true);
      saveState();
      render();
    }
  }

  function decrementGoal(id) {
    const week = ensureWeek();
    if (id === "net") {
      week.manual.net = Math.max(0, (week.manual.net || 0) - 1);
      markManualDay("net", week.manual.net > 0);
    } else if (id === "rest") {
      week.manual.restAdjust = (week.manual.restAdjust || 0) - 1;
    } else if (id === "prep" || id === "docs") {
      week.manual[id] = false;
      markManualDay(id, false);
    }
    saveState();
    render();
  }

  function showScreen(name) {
    const screenName = name === "watchlist" ? "watchlist" : "today";
    els.screens.forEach((screen) => {
      const active = screen.dataset.screen === screenName;
      screen.hidden = !active;
      screen.classList.toggle("active", active);
    });
    els.navLinks.forEach((link) => {
      const active = link.dataset.screenLink === screenName;
      link.classList.toggle("active", active);
      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    if (screenName !== "today") {
      mode = "view";
    }
  }

  function setModalOrigin(origin) {
    modalOrigin = origin;
    els.jobWatchHint.hidden = origin !== "watchlist";
  }

  function openModal(prefill = {}, returnFocus = els.addApplication, origin = "home") {
    modalReturnFocus = returnFocus;
    setModalOrigin(origin);
    els.form.reset();
    els.form.elements.appliedDate.value = todayKey;
    els.form.elements.status.value = "Applied";
    calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    openLayer = "";
    els.form.dataset.companyId = prefill.companyId || "";
    els.form.dataset.postingId = prefill.postingId || "";
    els.form.elements.company.value = prefill.company || "";
    els.form.elements.role.value = prefill.role || "";
    els.form.elements.link.value = prefill.link || "";
    renderSharedControls();
    updateApplicationSubmit();
    els.backdrop.hidden = false;
    syncSurfaceState();
    els.form.elements.link.focus();
  }

  function closeModal() {
    els.backdrop.hidden = true;
    setModalOrigin("home");
    closeFloatingLayers();
    if (modalReturnFocus) {
      modalReturnFocus.focus();
    }
    modalReturnFocus = null;
    syncSurfaceState();
  }

  function openHeardModal(returnFocus = els.heardBack) {
    heardReturnFocus = returnFocus;
    els.heardQuery.value = "";
    els.heardResults.hidden = true;
    els.heardResults.innerHTML = "";
    els.heardBackdrop.hidden = false;
    syncSurfaceState();
    els.heardQuery.focus();
  }

  function closeHeardModal() {
    els.heardBackdrop.hidden = true;
    els.heardResults.hidden = true;
    if (heardReturnFocus) {
      heardReturnFocus.focus();
    }
    heardReturnFocus = null;
    syncSurfaceState();
  }

  function openCompanyModal() {
    autoFilledCompany = false;
    userEditedCompany = false;
    els.companyForm.reset();
    els.companyPrefillNote.hidden = true;
    els.companyBackdrop.hidden = false;
    syncSurfaceState();
    els.companyForm.elements.link.focus();
  }

  function closeCompanyModal() {
    els.companyBackdrop.hidden = true;
    els.addCompany.focus();
    syncSurfaceState();
  }

  function openEditCompany(companyId) {
    const company = findCompany(companyId);
    if (!company) return;
    activeCompanyId = companyId;
    els.editCompanyForm.elements.link.value = company.link || "";
    els.editCompanyForm.elements.company.value = company.company;
    els.editCompanyBackdrop.hidden = false;
    syncSurfaceState();
    els.editCompanyForm.elements.link.focus();
  }

  function closeEditCompany() {
    els.editCompanyBackdrop.hidden = true;
    activeCompanyId = "";
    syncSurfaceState();
  }

  function openRemoveCompany(companyId) {
    const company = findCompany(companyId);
    if (!company) return;
    activeCompanyId = companyId;
    els.removeCompanyTitle.textContent = `Remove ${company.company}?`;
    els.removeCompanyBackdrop.hidden = false;
    syncSurfaceState();
    els.confirmRemoveCompany.focus();
  }

  function closeRemoveCompany() {
    els.removeCompanyBackdrop.hidden = true;
    activeCompanyId = "";
    syncSurfaceState();
  }

  function findCompany(companyId) {
    return ensureWatchlist().find((company) => company.id === companyId);
  }

  function findRole(companyId, roleId) {
    const company = findCompany(companyId);
    if (!company) return null;
    return company.roles.find((role) => role.id === roleId) || null;
  }

  function saveCompany(formData) {
    const company = formData.get("company").trim();
    const link = formData.get("link").trim();
    if (!company) return;
    ensureWatchlist().push({
      id: `company-${Date.now()}`,
      company,
      link,
      alerts_on: true,
      roles: sampleRolesForCompany(company, link)
    });
    saveState();
    renderWatchlist();
    showSnack(`${company} added. Checking its board for matching roles now.`);
  }

  function sampleRolesForCompany(company, link) {
    return [{
      id: `role-${Date.now()}`,
      title: `Product Manager, ${company}`,
      url: link,
      first_seen: new Date().toISOString(),
      is_live: true,
      locations: [{ city: "Berlin", mode: "Remote" }]
    }];
  }

  function saveEditedCompany(formData) {
    const company = findCompany(activeCompanyId);
    if (!company) return;
    company.link = formData.get("link").trim();
    company.company = formData.get("company").trim();
    saveState();
    renderWatchlist();
  }

  function removeActiveCompany() {
    const company = findCompany(activeCompanyId);
    if (!company) return;
    activeState().watchlist = ensureWatchlist().filter((item) => item.id !== activeCompanyId);
    saveState();
    renderWatchlist();
    showSnack(`${company.company} removed from your watchlist.`);
    closeRemoveCompany();
  }

  function saveApplication(formData) {
    const application = {
      id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
      postingId: els.form.dataset.postingId || "",
      companyId: els.form.dataset.companyId || "",
      link: formData.get("link").trim(),
      company: formData.get("company").trim(),
      role: formData.get("role").trim(),
      appliedDate: formData.get("appliedDate"),
      status: formData.get("status"),
      note: formData.get("note").trim()
    };

    activeState().applications.push(application);
    activeState().days[application.appliedDate] = "applied";
    saveState();
    pulseMini();
    showSnack("Application added.");
    render();
  }

  function updateApplicationSubmit() {
    const submit = els.form.querySelector('button[type="submit"]');
    const company = els.form.elements.company.value.trim();
    const role = els.form.elements.role.value.trim();
    submit.disabled = !company || !role;
  }

  function deriveRoleName(value) {
    try {
      const url = new URL(value.startsWith("http") ? value : `https://${value}`);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const slug = pathParts[pathParts.length - 1] || "";
      if (!slug || /^\d+$/.test(slug)) return "";
      return titleizeSlug(slug);
    } catch {
      return "";
    }
  }

  function maybeAutoFillApplication() {
    const link = els.form.elements.link.value;
    const company = deriveCompanyName(link);
    if (company && !els.form.elements.company.value.trim()) {
      els.form.elements.company.value = company;
    }
    const role = deriveRoleName(link);
    if (role && !els.form.elements.role.value.trim()) {
      els.form.elements.role.value = role;
    }
    updateApplicationSubmit();
  }

  function deriveCompanyName(value) {
    try {
      const url = new URL(value.startsWith("http") ? value : `https://${value}`);
      const host = url.hostname.replace(/^www\./, "");
      const hostParts = host.split(".");
      const isAts = atsHosts.some((hostName) => host.includes(hostName));
      const pathParts = url.pathname.split("/").filter(Boolean);
      const slug = isAts && pathParts.length > 0 ? pathParts[0] : hostParts[0];
      return titleizeSlug(slug);
    } catch {
      return "";
    }
  }

  function titleizeSlug(slug) {
    return String(slug || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .trim();
  }

  function maybeAutoFillCompany() {
    if (userEditedCompany) return;
    const name = deriveCompanyName(els.companyForm.elements.link.value);
    if (!name) return;
    els.companyForm.elements.company.value = name;
    autoFilledCompany = true;
    els.companyPrefillNote.hidden = false;
  }

  function toggleAlerts(companyId) {
    const company = findCompany(companyId);
    if (!company) return;
    company.alerts_on = !company.alerts_on;
    saveState();
    renderWatchlist();
    showSnack(company.alerts_on ? "Alerts on. New matching roles will reach your inbox." : "Alerts paused for this company.");
  }

  function heardMatches(query) {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return activeState().applications.filter((application) => String(application.company || "").toLowerCase().includes(needle));
  }

  function renderHeardResults() {
    const query = els.heardQuery.value;
    if (!query.trim()) {
      els.heardResults.hidden = true;
      els.heardResults.innerHTML = "";
      return;
    }
    const matches = heardMatches(query);
    els.heardResults.hidden = false;
    if (matches.length === 0) {
      els.heardResults.innerHTML = '<div class="typeahead-empty">Nothing logged under that name yet.</div>';
      return;
    }
    els.heardResults.innerHTML = matches.map((application) => `
      <button class="typeahead-row" type="button" data-heard-application="${escapeText(application.id)}">
        <span class="typeahead-company">${escapeText(application.company)}</span><span class="typeahead-sep">·</span><span>${escapeText(application.role)}</span>
      </button>`).join("");
  }

  function confirmHeardBack(applicationId) {
    const application = activeState().applications.find((item) => item.id === applicationId);
    if (!application) return;
    application.status = "1st stage";
    saveState();
    closeHeardModal();
    showSnack("In your pipeline now, first stage. Nothing to do yet.", {
      linkText: "pipeline",
      href: "#",
      duration: 5000
    });
    render();
  }

  function presetApplications(count, dates) {
    return Array.from({ length: count }, (_, index) => ({
      id: `demo-app-${index}`,
      link: "",
      company: "Demo company",
      role: "Demo role",
      appliedDate: dates[index % dates.length],
      status: "Applied",
      note: ""
    }));
  }

  function makeDemoPreset(name) {
    const tue = toDateKey(addDays(weekStart, 1));
    const wed = toDateKey(addDays(weekStart, 2));
    const thu = toDateKey(addDays(weekStart, 3));
    const fri = toDateKey(addDays(weekStart, 4));
    const base = {
      applications: [],
      days: {},
      watchlist: cloneWatchlist(defaultWatchlist),
      lastGoals: [
        { id: "apply", target: 5 },
        { id: "net", target: 3 },
        { id: "rest", target: 2 }
      ],
      weeks: {
        [weekKey]: {
          goals: [],
          manual: { net: 0, prep: false, docs: false },
          activityDays: {}
        }
      }
    };
    const week = base.weeks[weekKey];

    if (name === "empty" || name === "noApplications") {
      return base;
    }
    if (name === "hasApplication") {
      base.applications = presetApplications(1, [todayKey]);
      return base;
    }
    if (name === "progress") {
      week.goals = cloneGoals(base.lastGoals);
      week.manual.net = 1;
      week.activityDays[wed] = { net: true };
      base.applications = presetApplications(3, [tue, thu, fri]);
      return base;
    }
    if (name === "threeDone") {
      week.goals = cloneGoals(base.lastGoals);
      week.manual.net = 3;
      week.activityDays[todayKey] = { net: true };
      base.applications = presetApplications(5, [wed, thu, fri]);
      return base;
    }
    if (name === "mixed") {
      week.goals = [
        { id: "apply", target: 4 },
        { id: "net", target: 3 },
        { id: "prep", target: 1 },
        { id: "docs", target: 1 },
        { id: "rest", target: 2 }
      ];
      base.lastGoals = cloneGoals(week.goals);
      week.manual.net = 2;
      week.manual.prep = true;
      week.manual.docs = false;
      week.activityDays[wed] = { net: true };
      week.activityDays[todayKey] = { net: true, prep: true };
      base.applications = presetApplications(2, [thu, fri]);
      return base;
    }
    week.goals = [
      { id: "apply", target: 4 },
      { id: "net", target: 3 },
      { id: "prep", target: 1 },
      { id: "docs", target: 1 },
      { id: "rest", target: 2 }
    ];
    base.lastGoals = cloneGoals(week.goals);
    week.manual.net = 3;
    week.manual.prep = true;
    week.manual.docs = true;
    week.activityDays[todayKey] = { net: true, prep: true, docs: true };
    base.applications = presetApplications(4, [wed, thu, fri]);
    return base;
  }

  function setDemoPreset(name) {
    demoPreset = name;
    demoState = makeDemoPreset(name);
    mode = "view";
    renderDemoButtons();
    render();
  }

  function renderDemoButtons() {
    const homeStates = [
      ["noApplications", "No applications"],
      ["hasApplication", "At least 1 application"]
    ];
    const presets = [
      ["empty", "Week not set up"],
      ["progress", "Mid-week, in progress"],
      ["threeDone", "Three goals, all done"],
      ["mixed", "All five goals, mixed"],
      ["done", "All five goals, done"]
    ];
    els.demoHomeActions.innerHTML = homeStates.map(([id, label]) => `<button type="button" class="${demoPreset === id ? "active" : ""}" data-demo="${id}">${label}</button>`).join("");
    els.demoActions.innerHTML = presets.map(([id, label]) => `<button type="button" class="${demoPreset === id ? "active" : ""}" data-demo="${id}">${label}</button>`).join("");
  }

  function maybeEnableDemo() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("demo")) return;
    els.demoPanel.hidden = false;
    setDemoPreset("empty");
  }

  function initialScreen() {
    return window.location.hash === "#watchlist" ? "watchlist" : "today";
  }

  function closeMenus() {
    if (!openMenuId) return;
    openMenuId = "";
    syncSurfaceState();
    renderWatchlist();
  }

  function activeModal() {
    return [els.backdrop, els.heardBackdrop, els.companyBackdrop, els.editCompanyBackdrop, els.removeCompanyBackdrop].find((backdrop) => !backdrop.hidden);
  }

  function trapFocus(event) {
    if (event.key !== "Tab") return;
    const backdrop = activeModal();
    if (!backdrop) return;
    const focusable = Array.from(backdrop.querySelectorAll("button, input, select, textarea")).filter((item) => !item.disabled && item.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function wireEvents() {
    els.navLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const screenName = link.dataset.screenLink;
        if (window.location.hash !== `#${screenName}`) {
          window.location.hash = screenName;
        } else {
          showScreen(screenName);
        }
      });
    });
    window.addEventListener("hashchange", () => {
      showScreen(initialScreen());
    });
    els.addApplication.addEventListener("click", () => openModal({}, els.addApplication, "home"));
    els.heardBack.addEventListener("click", () => openHeardModal(els.heardBack));
    els.addCompany.addEventListener("click", openCompanyModal);
    els.cancelHeard.addEventListener("click", closeHeardModal);
    els.cancelJob.addEventListener("click", closeModal);
    els.cancelCompany.addEventListener("click", closeCompanyModal);
    els.cancelEditCompany.addEventListener("click", closeEditCompany);
    els.cancelRemoveCompany.addEventListener("click", closeRemoveCompany);
    els.confirmRemoveCompany.addEventListener("click", removeActiveCompany);
    els.editGoals.addEventListener("click", startSetup);
    els.interactionScrim.addEventListener("click", closeMenus);

    els.backdrop.addEventListener("click", (event) => {
      if (event.target !== els.backdrop) return;
      if (openLayer) {
        closeFloatingLayers();
        return;
      }
      closeModal();
    });
    els.heardBackdrop.addEventListener("click", (event) => {
      if (event.target === els.heardBackdrop) closeHeardModal();
    });
    els.companyBackdrop.addEventListener("click", (event) => {
      if (event.target === els.companyBackdrop) closeCompanyModal();
    });
    els.editCompanyBackdrop.addEventListener("click", (event) => {
      if (event.target === els.editCompanyBackdrop) closeEditCompany();
    });
    els.removeCompanyBackdrop.addEventListener("click", (event) => {
      if (event.target === els.removeCompanyBackdrop) closeRemoveCompany();
    });

    document.addEventListener("keydown", (event) => {
      trapFocus(event);
      if (event.key === "Escape" && openLayer) {
        closeFloatingLayers();
        return;
      }
      if (event.key === "Escape" && !els.backdrop.hidden) closeModal();
      if (event.key === "Escape" && !els.heardBackdrop.hidden) closeHeardModal();
      if (event.key === "Escape" && !els.companyBackdrop.hidden) closeCompanyModal();
      if (event.key === "Escape" && !els.editCompanyBackdrop.hidden) closeEditCompany();
      if (event.key === "Escape" && !els.removeCompanyBackdrop.hidden) closeRemoveCompany();
      if (event.key === "Escape") closeMenus();
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".menu-wrap")) {
        closeMenus();
      }
      if (!event.target.closest(".select-shell") && !event.target.closest(".date-shell")) {
        closeFloatingLayers();
      }
    });

    els.form.addEventListener("submit", (event) => {
      event.preventDefault();
      updateApplicationSubmit();
      if (els.form.querySelector('button[type="submit"]').disabled) return;
      saveApplication(new FormData(els.form));
      closeModal();
    });
    els.form.elements.link.addEventListener("input", maybeAutoFillApplication);
    els.form.elements.company.addEventListener("input", updateApplicationSubmit);
    els.form.elements.role.addEventListener("input", updateApplicationSubmit);
    els.form.addEventListener("click", (event) => {
      const statusToggle = event.target.closest("[data-toggle-status]");
      const statusOption = event.target.closest("[data-status-option]");
      const dateToggle = event.target.closest("[data-toggle-date]");
      const dateOption = event.target.closest("[data-date-option]");
      const prev = event.target.closest("[data-calendar-prev]");
      const next = event.target.closest("[data-calendar-next]");

      if (statusToggle) {
        event.stopPropagation();
        openLayer = openLayer === "status" ? "" : "status";
        syncSurfaceState();
        renderSharedControls();
      } else if (statusOption) {
        event.stopPropagation();
        els.form.elements.status.value = statusOption.dataset.statusOption;
        openLayer = "";
        syncSurfaceState();
        renderSharedControls();
      } else if (dateToggle) {
        event.stopPropagation();
        openLayer = openLayer === "date" ? "" : "date";
        syncSurfaceState();
        renderSharedControls();
      } else if (dateOption) {
        event.stopPropagation();
        const selectedDate = fromDateKey(dateOption.dataset.dateOption);
        els.form.elements.appliedDate.value = dateOption.dataset.dateOption;
        calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        openLayer = "";
        syncSurfaceState();
        renderSharedControls();
      } else if (prev) {
        event.stopPropagation();
        calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
        renderSharedControls();
      } else if (next) {
        event.stopPropagation();
        calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
        renderSharedControls();
      }
    });
    els.companyForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveCompany(new FormData(els.companyForm));
      closeCompanyModal();
    });
    els.editCompanyForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveEditedCompany(new FormData(els.editCompanyForm));
      closeEditCompany();
    });
    els.companyForm.elements.link.addEventListener("input", maybeAutoFillCompany);
    els.companyForm.elements.company.addEventListener("input", () => {
      if (autoFilledCompany) {
        userEditedCompany = true;
        els.companyPrefillNote.hidden = true;
      }
    });
    els.heardQuery.addEventListener("input", renderHeardResults);
    els.heardResults.addEventListener("click", (event) => {
      const row = event.target.closest("[data-heard-application]");
      if (row) confirmHeardBack(row.dataset.heardApplication);
    });

    els.watchlistGroups.addEventListener("click", (event) => {
      const quietToggle = event.target.closest("[data-toggle-quiet]");
      const alertButton = event.target.closest("[data-toggle-alerts]");
      const menuButton = event.target.closest("[data-company-menu]");
      const editButton = event.target.closest("[data-edit-company]");
      const removeButton = event.target.closest("[data-remove-company]");
      const openButton = event.target.closest("[data-open-role]");
      const applyButton = event.target.closest("[data-apply-role]");

      if (quietToggle) {
        quietOpen = !quietOpen;
        renderWatchlist();
        return;
      }
      if (alertButton) {
        toggleAlerts(alertButton.dataset.toggleAlerts);
        return;
      }
      if (menuButton) {
        event.stopPropagation();
        openMenuId = openMenuId === menuButton.dataset.companyMenu ? "" : menuButton.dataset.companyMenu;
        syncSurfaceState();
        renderWatchlist();
        return;
      }
      if (editButton) {
        openMenuId = "";
        syncSurfaceState();
        openEditCompany(editButton.dataset.editCompany);
        renderWatchlist();
        return;
      }
      if (removeButton) {
        openMenuId = "";
        syncSurfaceState();
        openRemoveCompany(removeButton.dataset.removeCompany);
        renderWatchlist();
        return;
      }
      if (openButton) {
        const url = openButton.dataset.openRole;
        if (url) window.open(url, "_blank", "noopener");
        return;
      }
      if (applyButton) {
        const role = findRole(applyButton.dataset.companyId, applyButton.dataset.applyRole);
        const company = findCompany(applyButton.dataset.companyId);
        if (!role || !company) return;
        openModal(
          {
            companyId: company.id,
            postingId: role.id,
            company: company.company,
            role: role.title,
            link: role.url
          },
          applyButton,
          "watchlist"
        );
      }
    });

    els.goalsBody.addEventListener("click", (event) => {
      const shape = event.target.closest("[data-shape-week]");
      const same = event.target.closest("[data-same-week]");
      const finish = event.target.closest("[data-finish-setup]");
      const info = event.target.closest("[data-info-tooltip]");
      const increment = event.target.closest("[data-increment-goal]");
      const decrement = event.target.closest("[data-decrement-goal]");
      const draftAdjust = event.target.closest("[data-draft-adjust]");
      const draftToggle = event.target.closest("[data-draft-toggle]");

      if (info) return;
      if (increment) {
        event.stopPropagation();
        incrementGoal(increment.dataset.incrementGoal);
        return;
      }
      if (decrement) {
        event.stopPropagation();
        decrementGoal(decrement.dataset.decrementGoal);
        return;
      }
      if (shape) startSetup();
      if (same) applyLastGoals();
      if (finish) finishSetup();
      if (draftAdjust) {
        event.stopPropagation();
        adjustDraft(draftAdjust.dataset.draftAdjust, Number(draftAdjust.dataset.delta));
      } else if (draftToggle && mode === "setup") {
        toggleDraft(draftToggle.dataset.draftToggle);
      }
    });
    els.demoActions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-demo]");
      if (button) setDemoPreset(button.dataset.demo);
    });
    els.demoHomeActions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-demo]");
      if (button) setDemoPreset(button.dataset.demo);
    });
  }

  setGreeting();
  ensureWeek();
  wireEvents();
  maybeEnableDemo();
  showScreen(initialScreen());
  render();
})();
