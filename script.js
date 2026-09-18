const repoData = window.trendingRepos || { updatedAt: new Date().toISOString(), repositories: [] };
const developerData = window.trendingDevelopers || { updatedAt: repoData.updatedAt, developers: [] };
let currentRange = 'daily';
let currentLang = 'en';

const translations = {
  en: {
    brand: 'Trending Repos Radar',
    'nav-repos': 'Repositories',
    'nav-devs': 'Developers',
    'nav-method': 'Snapshot',
    'nav-source': 'View source',
    'lang-en': 'EN',
    'lang-vi': 'VI',
    'hero-title': 'A signal board for repos moving fast right now.',
    'hero-desc': 'A static snapshot of notable projects the GitHub community is watching today, tuned for quick scanning: what it is, how much traction it has, and why it deserves a click.',
    'range-daily': 'Daily',
    'range-weekly': 'Weekly',
    'range-monthly': 'Monthly',
    'tab-repos': 'Repositories',
    'tab-devs': 'Developers',
    'label-stars': 'Stars',
    'label-forks': 'Forks',
    'label-today': 'Today',
    'label-week': 'This week',
    'label-month': 'This month',
    'label-profile': 'Profile',
    'label-repo': 'Popular repo',
    'label-rank': 'Rank',
    'why-default': 'It is trending because GitHub users are rapidly starring it today, signaling fresh community attention and practical curiosity.',
    'fit-default': 'Developers evaluating fast-moving repositories and deciding what deserves a deeper look.',
    'method-copy': 'Built from visible GitHub Trending data, last updated {date}. Plain HTML/CSS with generated data files — the workflow can refresh without redesigning the interface.',
    'no-desc': 'No repository description available.',
    'no-dev-desc': 'GitHub Trending did not list a popular repository description for this developer.',
    'open-gh': 'Open GitHub',
    'open-profile': 'Open profile',
    'why-it': 'Why it is trending',
    'why-dev': 'Why this developer is trending',
    'best-fit': 'Best fit',
    'popular-repo': 'Popular repository',
    'close': 'Close',
  },
  vi: {
    brand: 'Radar Repos Trending',
    'nav-repos': 'Kho',
    'nav-devs': 'Devs',
    'nav-method': 'Snapshot',
    'nav-source': 'Xem nguồn',
    'lang-en': 'EN',
    'lang-vi': 'VI',
    'hero-title': 'Bảng tín hiệu các repo đang bay nhanh right now.',
    'hero-desc': 'Snapshot tĩnh các dự án nổi bật community GitHub đang theo dõi hôm nay — nhanh, gọn, click để xem chi tiết.',
    'range-daily': 'Hôm nay',
    'range-weekly': 'Tuần',
    'range-monthly': 'Tháng',
    'tab-repos': 'Kho',
    'tab-devs': 'Devs',
    'label-stars': 'Sao',
    'label-forks': 'Fork',
    'label-today': 'Hôm nay',
    'label-week': 'Tuần này',
    'label-month': 'Tháng này',
    'label-profile': 'Hồ sơ',
    'label-repo': 'Repo nổi bật',
    'label-rank': 'Hạng',
    'why-default': 'Trending vì devs đang test AI workflows, agents, automation patterns.',
    'fit-default': 'Devs đánh giá repo nhanh và quyết định xem sâu.',
    'method-copy': 'Dữ liệu từ GitHub Trending, cập nhật {date}. HTML/CSS thuần + data files — workflow refresh mà không cần redesign.',
    'no-desc': 'Không có mô tả.',
    'no-dev-desc': 'GitHub Trending không liệt kê mô tả cho dev này.',
    'open-gh': 'Mở GitHub',
    'open-profile': 'Mở hồ sơ',
    'why-it': 'Vì sao trending',
    'why-dev': 'Vì sao dev trending',
    'best-fit': 'Phù hợp',
    'popular-repo': 'Repo nổi bật',
    'close': 'Đóng',
  },
};

const formatNumber = (value) => new Intl.NumberFormat("en-US").format(Number(value || 0));

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

function formatSnapshotDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Today";
  return new Intl.DateTimeFormat("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(date);
}

function languageClass(language = "") {
  const normalized = language.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const supported = new Set(["python", "typescript", "shell", "rust", "notebook", "html", "javascript", "dart"]);
  return supported.has(normalized) ? normalized : "default";
}

function getTopLanguage() {
  const counts = new Map();
  repositories.forEach((repo) => {
    counts.set(repo.language || "Unknown", (counts.get(repo.language || "Unknown") || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
}

function getFastestMover() {
  return [...repositories].sort((a, b) => Number(b.starsToday || 0) - Number(a.starsToday || 0))[0];
}

function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || key;
}

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
}

function setTextI18n(selector, key) {
  setText(selector, t(key));
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });
  // Update metric labels in modal
  setTextI18n('#detail-metric-label-1', currentRange === 'daily' ? 'label-today' : currentRange === 'weekly' ? 'label-week' : 'label-month');
  setTextI18n('#detail-section-title-1', 'why-it');
  setTextI18n('#detail-section-title-2', 'best-fit');
  setTextI18n('#detail-link', 'open-gh');
  // Update lang toggle label
  const toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.textContent = currentLang === 'en' ? t('lang-vi') : t('lang-en');
    toggle.setAttribute('data-i18n', currentLang === 'en' ? 'lang-vi' : 'lang-en');
  }
}

function renderSnapshotCopy() {
  const dateLabel = formatSnapshotDate(repoData.updatedAt || developerData.updatedAt);
  const totalStarsToday = repositories.reduce((total, repo) => total + Number(repo.starsToday || 0), 0);
  const fastest = getFastestMover();

  setText("[data-snapshot-date]", `GitHub Trending · Today · ${dateLabel}`);
  setText("[data-repo-count]", repositories.length);
  setText("[data-developer-count]", developers.length);
  setText("[data-total-stars-today]", formatNumber(totalStarsToday));
  setText("[data-top-language]", getTopLanguage());
  setText("[data-method-copy]", `The page uses visible repository and developer data from GitHub Trending, last updated ${dateLabel}. It is built as plain HTML and CSS with generated data files, so the GitHub Actions workflow can refresh the page without redesigning the interface.`);
  document.querySelector(".nav-cta")?.setAttribute("href", repoData.source || "https://github.com/trending");

  if (fastest) {
    document.querySelector(".hero-text").textContent = `A static snapshot of ${repositories.length} repositories and ${developers.length} developers the GitHub community is watching today, tuned for quick scanning and daily refreshes.`;
  }
}

function renderLeaderCard() {
  const leader = repositories[0];
  if (!leader) return;
  const leaderCard = document.querySelector("[data-leader-card]");
  if (!leaderCard) return;

  leaderCard.innerHTML = `
    <div class="card-topline">
      <span class="rank">${escapeHtml(leader.rank)}</span>
      <span class="language-dot ${languageClass(leader.language)}"></span>
      <span>${escapeHtml(leader.language || "Unknown")}</span>
    </div>
    <h2>${escapeHtml(leader.title)}</h2>
    <p>${escapeHtml(leader.description)}</p>
    <dl class="repo-metrics compact">
      <div>
        <dt>Stars</dt>
        <dd>${formatNumber(leader.stars)}</dd>
      </div>
      <div>
        <dt>Today</dt>
        <dd>${formatNumber(leader.starsToday)}</dd>
      </div>
      <div>
        <dt>Forks</dt>
        <dd>${formatNumber(leader.forks)}</dd>
      </div>
    </dl>
  `;
}

function renderRepoCard(repo, index) {
  const accentClass = index === 0 || index === 12 ? " featured" : "";
  const standoutClass = index === 5 ? " standout" : "";
  const detailsBtn = window.innerWidth <= 680 ? "" : `<button class="details-button" type="button">Details</button>`;

  return `
    <article class="repo-card${accentClass}${standoutClass}" data-repo-id="${escapeAttr(repo.id)}" tabindex="0" role="button" aria-label="View details for ${escapeAttr(repo.title)}">
      <div class="repo-card-header">
        <span class="rank">${escapeHtml(repo.rank)}</span>
        <span class="language"><span class="language-dot ${languageClass(repo.language)}"></span>${escapeHtml(repo.language || "Unknown")}</span>
      </div>
      <h3><a href="${escapeAttr(repo.url)}" data-card-link>${escapeHtml(repo.title)}</a></h3>
      <p>${escapeHtml(repo.description || "No repository description available.")}</p>
      <dl class="repo-metrics">
        <div><dt>Stars</dt><dd>${formatNumber(repo.stars)}</dd></div>
        <div><dt>Forks</dt><dd>${formatNumber(repo.forks)}</dd></div>
        <div><dt>Today</dt><dd>${formatNumber(repo.starsToday)}</dd></div>
      </dl>
      ${detailsBtn}
    </article>
  `;
}

function renderDeveloperCard(developer, index) {
  const popularRepo = developer.popularRepository;
  const accentClass = index === 0 || index === 5 ? " featured" : "";
  const detailsBtn = window.innerWidth <= 680 ? "" : `<button class="details-button" type="button">Details</button>`;

  return `
    <article class="developer-card${accentClass}" data-developer-id="${escapeAttr(developer.id)}" tabindex="0" role="button" aria-label="View details for ${escapeAttr(developer.name)}">
      <div class="developer-card-top">
        <img src="${escapeAttr(developer.avatarUrl)}" alt="@${escapeAttr(developer.username)}" width="56" height="56" loading="lazy">
        <div>
          <span class="rank">${escapeHtml(developer.rank)}</span>
          <h3><a href="${escapeAttr(developer.url)}" data-card-link>${escapeHtml(developer.name)}</a></h3>
          <p>@${escapeHtml(developer.username)}</p>
        </div>
      </div>
      <div class="popular-repo">
        <a href="${escapeAttr(popularRepo?.url || developer.url)}">${escapeHtml(popularRepo?.name || "No public repo listed")}</a>
        <p>${escapeHtml(popularRepo?.description || "GitHub Trending did not list a popular repository description for this developer.")}</p>
      </div>
      ${detailsBtn}
    </article>
  `;
}

function renderRepoGrid() {
  const grid = document.querySelector("[data-repo-grid]");
  if (!grid) return;
  grid.innerHTML = repositories.map(renderRepoCard).join("");
}

function renderDeveloperGrid() {
  const grid = document.querySelector("[data-developer-grid]");
  if (!grid) return;
  grid.innerHTML = developers.map(renderDeveloperCard).join("");
}

function setActiveTab(feedName) {
  const target = feedName === "developers" ? "developers" : "repositories";

  document.querySelectorAll("[data-feed-tab]").forEach((tab) => {
    const isActive = tab.dataset.feedTab === target;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  const repoPanel = document.querySelector("#repositories-panel");
  const developerPanel = document.querySelector("#developers-panel");
  if (repoPanel && developerPanel) {
    repoPanel.hidden = target !== "repositories";
    developerPanel.hidden = target !== "developers";
    repoPanel.classList.toggle("active", target === "repositories");
    developerPanel.classList.toggle("active", target === "developers");
  }
}

const modal = document.querySelector("#repo-modal");
const panel = document.querySelector(".repo-detail-panel");
const closeButtons = document.querySelectorAll("[data-close-detail]");
let lastFocusedElement = null;

// ── Mobile: track swipe-to-close gesture ──
let touchStartY = 0;
let touchCurrentY = 0;
let isDragging = false;

function setMetricLabels(first, second, third) {
  setText("#detail-metric-label-1", first);
  setText("#detail-metric-label-2", second);
  setText("#detail-metric-label-3", third);
}

function setMetricValues(first, second, third) {
  setText("#detail-metric-1", first);
  setText("#detail-metric-2", second);
  setText("#detail-metric-3", third);
}

function setTags(tags = []) {
  const tagContainer = document.querySelector("#detail-tags");
  if (!tagContainer) return;
  tagContainer.replaceChildren(...tags.map((tag) => {
    const chip = document.createElement("span");
    chip.textContent = tag;
    return chip;
  }));
}

function showModal() {
  if (!modal || !panel) return;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  panel.focus();
  panel.style.transform = "";
  panel.style.transition = "";
}

function openRepoDetail(repoId) {
  const repo = repoDetails[repoId];
  if (!repo || !modal || !panel) return;

  lastFocusedElement = document.activeElement;

  setText("#detail-rank", repo.rank);
  setText("#detail-language", repo.language || "Unknown");
  setText("#detail-title", repo.title);
  setText("#detail-description", repo.description || "No repository description available.");
  setMetricLabels("Stars", "Forks", "Today");
  setMetricValues(formatNumber(repo.stars), formatNumber(repo.forks), formatNumber(repo.starsToday));
  setText("#detail-section-title-1", "Why it is trending");
  setText("#detail-section-title-2", "Best fit");
  setText("#detail-why", repo.why);
  setText("#detail-fit", repo.fit);
  setTags(repo.tags || []);

  const link = document.querySelector("#detail-link");
  if (link) {
    link.href = repo.url;
    link.textContent = "Open GitHub";
  }

  showModal();
}

function openDeveloperDetail(developerId) {
  const developer = developerDetails[developerId];
  if (!developer || !modal || !panel) return;

  lastFocusedElement = document.activeElement;
  const popularRepo = developer.popularRepository;

  setText("#detail-rank", developer.rank);
  setText("#detail-language", "Developer");
  setText("#detail-title", developer.name);
  setText("#detail-description", `@${developer.username}`);
  setMetricLabels("Profile", "Popular repo", "Rank");
  setMetricValues("Developer", popularRepo?.name || "None", developer.rank);
  setText("#detail-section-title-1", "Why this developer is trending");
  setText("#detail-section-title-2", "Popular repository");
  setText("#detail-why", developer.why);
  setText("#detail-fit", popularRepo?.description || "GitHub Trending did not list a popular repository description for this developer.");
  setTags(developer.tags || []);

  const link = document.querySelector("#detail-link");
  if (link) {
    link.href = developer.url;
    link.textContent = "Open profile";
  }

  showModal();
}

function closeRepoDetail() {
  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }
}

// ── Click handling: cards are tappable on mobile, details button on desktop ──
document.addEventListener("click", (event) => {
  // Tab switch
  const tab = event.target.closest("[data-feed-tab]");
  if (tab) {
    setActiveTab(tab.dataset.feedTab);
    return;
  }

  // Details button (desktop) or card tap (mobile, but not on the repo link)
  const detailsButton = event.target.closest(".details-button");
  if (detailsButton) {
    const repoCard = detailsButton.closest(".repo-card");
    if (repoCard) {
      openRepoDetail(repoCard.dataset.repoId);
      return;
    }
    const developerCard = detailsButton.closest(".developer-card");
    if (developerCard) {
      openDeveloperDetail(developerCard.dataset.developerId);
    }
    return;
  }

  // Mobile: card tap — only if not clicking the title link
  if (window.innerWidth <= 680) {
    const repoCard = event.target.closest(".repo-card");
    if (repoCard && !event.target.closest("[data-card-link]")) {
      openRepoDetail(repoCard.dataset.repoId);
      return;
    }
    const developerCard = event.target.closest(".developer-card");
    if (developerCard && !event.target.closest("[data-card-link]")) {
      openDeveloperDetail(developerCard.dataset.developerId);
      return;
    }
  }
});

// ── Range filter tabs ──
document.querySelector('.range-tabs')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-range]');
  if (btn) setActiveRange(btn.dataset.range);
});

// ── Language toggle ─-
document.getElementById('lang-toggle')?.addEventListener('click', () => {
  setActiveLang(currentLang === 'en' ? 'vi' : 'en');
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal?.getAttribute("aria-hidden") === "false") {
    closeRepoDetail();
  }
});

// ── Mobile: swipe-to-close bottom sheet ──
if (panel) {
  panel.addEventListener("touchstart", (e) => {
    if (panel.scrollTop > 0) return; // only when scrolled to top
    touchStartY = e.touches[0].clientY;
    touchCurrentY = touchStartY;
    isDragging = true;
    panel.style.transition = "none";
  }, { passive: true });

  panel.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    touchCurrentY = e.touches[0].clientY;
    const delta = touchCurrentY - touchStartY;
    if (delta > 0) {
      panel.style.transform = `translateY(${delta}px)`;
      modal.style.opacity = Math.max(0, 1 - delta / 300);
    }
  }, { passive: true });

  panel.addEventListener("touchend", () => {
    if (!isDragging) return;
    isDragging = false;
    panel.style.transition = "transform 260ms ease, opacity 260ms ease";
    const delta = touchCurrentY - touchStartY;
    if (delta > 120) {
      closeRepoDetail();
    } else {
      panel.style.transform = "translateY(0)";
      modal.style.opacity = "1";
    }
  }, { passive: true });
}

// ── Range filter: daily/weekly/monthly ──
function filterByRange(repos, range) {
  if (range === 'daily') return repos;
  if (range === 'weekly') return repos.filter((r) => Number(r.starsToday || 0) >= 50);
  return repos.filter((r) => Number(r.starsToday || 0) >= 200);
}

function setActiveRange(range) {
  currentRange = range;
  document.querySelectorAll('[data-range]').forEach((btn) => {
    const active = btn.dataset.range === range;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  renderAll();
}

function setActiveLang(lang) {
  currentLang = lang;
  applyI18n();
  renderAll();
}

function renderAll() {
  const filtered = filterByRange(repositories, currentRange);
  const grid = document.querySelector('[data-repo-grid]');
  if (grid) {
    grid.innerHTML = filtered.map((repo, i) => renderRepoCard(repo, i)).join('');
  }
  renderSnapshotCopy();
  renderLeaderCard();
  renderDeveloperGrid();
}
