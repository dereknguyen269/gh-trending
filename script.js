const repoData = window.trendingRepos || { updatedAt: new Date().toISOString(), repositories: [] };
const developerData = window.trendingDevelopers || { updatedAt: repoData.updatedAt, developers: [] };
const repositories = repoData.repositories || [];
const developers = developerData.developers || [];
const repoDetails = Object.fromEntries(repositories.map((repo) => [repo.id, repo]));
const developerDetails = Object.fromEntries(developers.map((developer) => [developer.id, developer]));

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
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
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
    const language = repo.language || "Unknown";
    counts.set(language, (counts.get(language) || 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
}

function getFastestMover() {
  return [...repositories].sort((a, b) => Number(b.starsToday || 0) - Number(a.starsToday || 0))[0];
}

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
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

  return `
    <article class="repo-card${accentClass}${standoutClass}" data-repo-id="${escapeAttr(repo.id)}">
      <div class="repo-card-header">
        <span class="rank">${escapeHtml(repo.rank)}</span>
        <span class="language"><span class="language-dot ${languageClass(repo.language)}"></span>${escapeHtml(repo.language || "Unknown")}</span>
      </div>
      <h3><a href="${escapeAttr(repo.url)}">${escapeHtml(repo.title)}</a></h3>
      <p>${escapeHtml(repo.description || "No repository description available.")}</p>
      <dl class="repo-metrics">
        <div><dt>Stars</dt><dd>${formatNumber(repo.stars)}</dd></div>
        <div><dt>Forks</dt><dd>${formatNumber(repo.forks)}</dd></div>
        <div><dt>Today</dt><dd>${formatNumber(repo.starsToday)}</dd></div>
      </dl>
      <button class="details-button" type="button">Details</button>
    </article>
  `;
}

function renderDeveloperCard(developer, index) {
  const popularRepo = developer.popularRepository;
  const accentClass = index === 0 || index === 5 ? " featured" : "";

  return `
    <article class="developer-card${accentClass}" data-developer-id="${escapeAttr(developer.id)}">
      <div class="developer-card-top">
        <img src="${escapeAttr(developer.avatarUrl)}" alt="@${escapeAttr(developer.username)}" width="56" height="56" loading="lazy">
        <div>
          <span class="rank">${escapeHtml(developer.rank)}</span>
          <h3><a href="${escapeAttr(developer.url)}">${escapeHtml(developer.name)}</a></h3>
          <p>@${escapeHtml(developer.username)}</p>
        </div>
      </div>
      <div class="popular-repo">
        <span class="stat-label">Popular repo</span>
        <a href="${escapeAttr(popularRepo?.url || developer.url)}">${escapeHtml(popularRepo?.name || "No public repo listed")}</a>
        <p>${escapeHtml(popularRepo?.description || "GitHub Trending did not list a popular repository description for this developer.")}</p>
      </div>
      <button class="details-button" type="button">Details</button>
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

document.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-feed-tab]");
  if (tab) {
    setActiveTab(tab.dataset.feedTab);
    return;
  }

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
  }
});

closeButtons.forEach((button) => {
  button.addEventListener("click", closeRepoDetail);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal?.getAttribute("aria-hidden") === "false") {
    closeRepoDetail();
  }
});

renderSnapshotCopy();
renderLeaderCard();
renderRepoGrid();
renderDeveloperGrid();
