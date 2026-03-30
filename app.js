const STORAGE_KEY = "summer_schedule_plan_v1";
const DATA_URL = "data/tournaments.json";

const state = {
  tournaments: [],
  filtered: [],
  plan: loadPlan(),
  quickFilter: "all",
};

const elements = {
  searchInput: document.getElementById("searchInput"),
  seriesFilter: document.getElementById("seriesFilter"),
  gameFilter: document.getElementById("gameFilter"),
  startDateFilter: document.getElementById("startDateFilter"),
  endDateFilter: document.getElementById("endDateFilter"),
  maxBuyinFilter: document.getElementById("maxBuyinFilter"),
  sortFilter: document.getElementById("sortFilter"),
  eventsContainer: document.getElementById("eventsContainer"),
  emptyState: document.getElementById("emptyState"),
  visibleCount: document.getElementById("visibleCount"),
  seriesCount: document.getElementById("seriesCount"),
  plannedBuyins: document.getElementById("plannedBuyins"),
  plannedCount: document.getElementById("plannedCount"),
  planEventCount: document.getElementById("planEventCount"),
  planTotalBuyins: document.getElementById("planTotalBuyins"),
  conflictCount: document.getElementById("conflictCount"),
  planList: document.getElementById("planList"),
  planConflicts: document.getElementById("planConflicts"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  clearPlanBtn: document.getElementById("clearPlanBtn"),
  viewPlanBtn: document.getElementById("viewPlanBtn"),
  planPanel: document.getElementById("planPanel"),
  eventCardTemplate: document.getElementById("eventCardTemplate"),
  planItemTemplate: document.getElementById("planItemTemplate"),
  quickChips: Array.from(document.querySelectorAll(".quick-chip")),
};

init();

async function init() {
  try {
    state.tournaments = await fetchTournaments();
  } catch (error) {
    console.error(error);
    state.tournaments = [];
  }

  normalizeTournaments();
  buildFilterOptions();
  bindEvents();
  render();
}

async function fetchTournaments() {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${DATA_URL}: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function normalizeTournaments() {
  state.tournaments = state.tournaments
    .map((item, index) => {
      const date = item.date || "";
      const time = item.time || "";
      const datetime = date ? new Date(time ? `${date}T${time}` : `${date}T09:00`) : null;

      return {
        id: item.id || `event-${index + 1}`,
        series: item.series || "Unknown",
        venue: item.venue || item.series || "Unknown venue",
        title: item.title || "Untitled event",
        date,
        time,
        game: item.game || "Tournament",
        buyIn: Number(item.buyIn || 0),
        tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
        notes: item.notes || "",
        flights: item.flights || "",
        url: item.url || "",
        datetime,
      };
    })
    .filter((item) => item.date)
    .sort((a, b) => a.datetime - b.datetime);
}

function buildFilterOptions() {
  populateSelect(elements.seriesFilter, uniqueValues(state.tournaments.map((t) => t.series)), "All series");
  populateSelect(elements.gameFilter, uniqueValues(state.tournaments.map((t) => t.game)), "All games");
  elements.seriesCount.textContent = String(uniqueValues(state.tournaments.map((t) => t.series)).length);
}

function populateSelect(select, values, allLabel) {
  select.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = allLabel;
  select.appendChild(allOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function bindEvents() {
  [
    elements.searchInput,
    elements.seriesFilter,
    elements.gameFilter,
    elements.startDateFilter,
    elements.endDateFilter,
    elements.maxBuyinFilter,
    elements.sortFilter,
  ].forEach((input) => input.addEventListener("input", render));

  elements.resetFiltersBtn.addEventListener("click", resetFilters);
  elements.clearPlanBtn.addEventListener("click", clearPlan);
  elements.viewPlanBtn.addEventListener("click", () => {
    elements.planPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  elements.quickChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      state.quickFilter = chip.dataset.quick;
      elements.quickChips.forEach((value) => value.classList.toggle("active", value === chip));
      render();
    });
  });
}

function render() {
  state.filtered = applyFilters();
  renderEvents();
  renderPlan();
  updateHeaderStats();
}

function applyFilters() {
  const search = elements.searchInput.value.trim().toLowerCase();
  const series = elements.seriesFilter.value;
  const game = elements.gameFilter.value;
  const startDate = elements.startDateFilter.value;
  const endDate = elements.endDateFilter.value;
  const maxBuyin = Number(elements.maxBuyinFilter.value || 0);
  const sort = elements.sortFilter.value;

  let results = [...state.tournaments].filter((event) => {
    const haystack = [event.series, event.venue, event.title, event.game, event.notes, event.flights, ...event.tags]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || haystack.includes(search);
    const matchesSeries = series === "all" || event.series === series;
    const matchesGame = game === "all" || event.game === game;
    const matchesStart = !startDate || event.date >= startDate;
    const matchesEnd = !endDate || event.date <= endDate;
    const matchesBuyin = !maxBuyin || event.buyIn <= maxBuyin;

    return matchesSearch && matchesSeries && matchesGame && matchesStart && matchesEnd && matchesBuyin;
  });

  if (state.quickFilter === "weekend") {
    results = results.filter((event) => {
      const day = new Date(`${event.date}T12:00`).getDay();
      return day === 0 || day === 6;
    });
  }

  if (state.quickFilter === "under1000") {
    results = results.filter((event) => event.buyIn <= 1000);
  }

  if (state.quickFilter === "planned") {
    results = results.filter((event) => state.plan.includes(event.id));
  }

  if (sort === "buyin-asc") {
    results.sort((a, b) => a.buyIn - b.buyIn || a.datetime - b.datetime);
  } else if (sort === "buyin-desc") {
    results.sort((a, b) => b.buyIn - a.buyIn || a.datetime - b.datetime);
  } else {
    results.sort((a, b) => a.datetime - b.datetime);
  }

  return results;
}

function renderEvents() {
  elements.eventsContainer.innerHTML = "";

  if (!state.filtered.length) {
    elements.emptyState.classList.remove("hidden");
    return;
  }

  elements.emptyState.classList.add("hidden");

  let currentDate = null;

  state.filtered.forEach((event) => {
    if (event.date !== currentDate) {
      currentDate = event.date;
      const heading = document.createElement("div");
      heading.className = "day-heading";
      heading.innerHTML = `
        <h3>${formatDateLong(event.date)}</h3>
        <span>${countEventsOnDate(event.date, state.filtered)} event${countEventsOnDate(event.date, state.filtered) === 1 ? "" : "s"}</span>
      `;
      elements.eventsContainer.appendChild(heading);
    }

    const fragment = elements.eventCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".event-card");
    const seriesBadge = fragment.querySelector(".series-badge");
    const venueLine = fragment.querySelector(".venue-line");
    const title = fragment.querySelector(".event-title");
    const meta = fragment.querySelector(".event-meta");
    const tags = fragment.querySelector(".event-tags");
    const buyin = fragment.querySelector(".event-buyin");
    const button = fragment.querySelector(".plan-toggle");

    seriesBadge.textContent = event.series;
    venueLine.textContent = event.venue;
    title.textContent = event.title;

    const timeLabel = event.time ? formatTime(event.time) : "Time TBD";
    meta.textContent = `${formatDate(event.date)} • ${timeLabel} • ${event.game}`;

    const extraTags = [
      event.flights ? `Flights: ${event.flights}` : "",
      event.notes ? event.notes : "",
      ...event.tags,
    ].filter(Boolean).slice(0, 4);

    extraTags.forEach((tagText) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = tagText;
      tags.appendChild(tag);
    });

    buyin.textContent = formatMoney(event.buyIn);
    updatePlanButton(button, event.id);
    button.addEventListener("click", () => togglePlan(event.id));

    if (event.url) {
      card.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        window.open(event.url, "_blank", "noopener,noreferrer");
      });
      card.style.cursor = "pointer";
    }

    elements.eventsContainer.appendChild(fragment);
  });
}

function renderPlan() {
  const plannedEvents = state.tournaments.filter((event) => state.plan.includes(event.id));
  plannedEvents.sort((a, b) => a.datetime - b.datetime);

  elements.planList.innerHTML = "";

  if (!plannedEvents.length) {
    elements.planList.innerHTML = `<p class="muted">No events saved yet. Tap “Add to plan” on anything you might play.</p>`;
  } else {
    plannedEvents.forEach((event) => {
      const fragment = elements.planItemTemplate.content.cloneNode(true);
      fragment.querySelector(".plan-item-title").textContent = event.title;
      fragment.querySelector(".plan-item-meta").textContent =
        `${event.series} • ${formatDate(event.date)} • ${event.time ? formatTime(event.time) : "Time TBD"} • ${formatMoney(event.buyIn)}`;
      fragment.querySelector(".remove-plan").addEventListener("click", () => togglePlan(event.id));
      elements.planList.appendChild(fragment);
    });
  }

  const totalBuyins = plannedEvents.reduce((sum, event) => sum + event.buyIn, 0);
  const conflicts = findConflicts(plannedEvents);

  elements.planEventCount.textContent = String(plannedEvents.length);
  elements.planTotalBuyins.textContent = formatMoney(totalBuyins);
  elements.plannedCount.textContent = String(plannedEvents.length);
  elements.plannedBuyins.textContent = formatMoney(totalBuyins);
  elements.conflictCount.textContent = String(conflicts.length);

  if (!conflicts.length) {
    elements.planConflicts.classList.add("hidden");
    elements.planConflicts.innerHTML = "";
  } else {
    elements.planConflicts.classList.remove("hidden");
    elements.planConflicts.innerHTML = `
      <h4>Date conflicts to review</h4>
      <ul>
        ${conflicts.map((conflict) => `<li>${conflict}</li>`).join("")}
      </ul>
    `;
  }
}

function findConflicts(events) {
  const byDate = new Map();

  events.forEach((event) => {
    if (!byDate.has(event.date)) {
      byDate.set(event.date, []);
    }
    byDate.get(event.date).push(event);
  });

  return Array.from(byDate.entries())
    .filter(([, dayEvents]) => dayEvents.length > 1)
    .map(([date, dayEvents]) => {
      const names = dayEvents.map((event) => `${event.series}: ${event.title}`).join(" / ");
      return `${formatDate(date)} — ${names}`;
    });
}

function countEventsOnDate(date, list) {
  return list.filter((event) => event.date === date).length;
}

function updateHeaderStats() {
  elements.visibleCount.textContent = String(state.filtered.length);
}

function togglePlan(eventId) {
  const exists = state.plan.includes(eventId);
  state.plan = exists ? state.plan.filter((id) => id !== eventId) : [...state.plan, eventId];
  savePlan();
  render();
}

function updatePlanButton(button, eventId) {
  const planned = state.plan.includes(eventId);
  button.textContent = planned ? "Planned" : "Add to plan";
  button.classList.toggle("secondary-button", planned);
  button.classList.toggle("primary-button", !planned);
}

function loadPlan() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function savePlan() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.plan));
}

function resetFilters() {
  elements.searchInput.value = "";
  elements.seriesFilter.value = "all";
  elements.gameFilter.value = "all";
  elements.startDateFilter.value = "";
  elements.endDateFilter.value = "";
  elements.maxBuyinFilter.value = "";
  elements.sortFilter.value = "date-asc";
  state.quickFilter = "all";
  elements.quickChips.forEach((chip) => chip.classList.toggle("active", chip.dataset.quick === "all"));
  render();
}

function clearPlan() {
  state.plan = [];
  savePlan();
  render();
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value) {
  const date = new Date(`${value}T12:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatDateLong(value) {
  const date = new Date(`${value}T12:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatTime(value) {
  const [hour = "0", minute = "00"] = String(value).split(":");
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
