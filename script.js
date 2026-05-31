const trendingData = window.trendingRepos || { updatedAt: new Date().toISOString(), repositories: [] };
const repositories = trendingData.repositories || [];
const repoDetails = Object.fromEntries(repositories.map((repo) => [repo.id, repo]));

const formatNumber = (value) => new Intl.NumberFormat("en-US").format(Number(value || 0));

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
  const supported = new Set(["python", "typescript", "shell", "rust", "notebook", "html", "javascript"]);
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
  const dateLabel = formatSnapshotDate(trendingData.updatedAt);
  const totalStarsToday = repositories.reduce((total, repo) => total + Number(repo.starsToday || 0), 0);
  const fastest = getFastestMover();

  setText("[data-snapshot-date]", `GitHub Trending · Today · ${dateLabel}`);
  setText("[data-repo-count]", repositories.length);
  setText("[data-total-stars-today]", formatNumber(totalStarsToday));
  setText("[data-top-language]", getTopLanguage());
  setText("[data-fastest-mover]", fastest?.name || "Unknown");
  setText("[data-method-copy]", `The page uses visible repository data from GitHub Trending, last updated ${dateLabel}. It is built as plain HTML and CSS with a generated data file, so the GitHub Actions workflow can refresh the page without redesigning the interface.`);
}

function renderLeaderCard() {
  const leader = repositories[0];
  if (!leader) return;

  const leaderCard = document.querySelector("[data-leader-card]");
  if (!leaderCard) return;

  leaderCard.innerHTML = `
    <div class="card-topline">
      <span class="rank">${leader.rank}</span>
      <span class="language-dot ${languageClass(leader.language)}"></span>
      <span>${leader.language || "Unknown"}</span>
    </div>
    <h2>${leader.title}</h2>
    <p>${leader.description}</p>
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
    <article class="repo-card${accentClass}${standoutClass}" data-repo-id="${repo.id}">
      <div class="repo-card-header">
        <span class="rank">${repo.rank}</span>
        <span class="language"><span class="language-dot ${languageClass(repo.language)}"></span>${repo.language || "Unknown"}</span>
      </div>
      <h3><a href="${repo.url}">${repo.title}</a></h3>
      <p>${repo.description || "No repository description available."}</p>
      <dl class="repo-metrics">
        <div><dt>Stars</dt><dd>${formatNumber(repo.stars)}</dd></div>
        <div><dt>Forks</dt><dd>${formatNumber(repo.forks)}</dd></div>
        <div><dt>Today</dt><dd>${formatNumber(repo.starsToday)}</dd></div>
      </dl>
      <button class="details-button" type="button">Details</button>
    </article>
  `;
}

function renderRepoGrid() {
  const grid = document.querySelector("[data-repo-grid]");
  if (!grid) return;

  grid.innerHTML = repositories.map(renderRepoCard).join("");
}

const modal = document.querySelector("#repo-modal");
const panel = document.querySelector(".repo-detail-panel");
const closeButtons = document.querySelectorAll("[data-close-detail]");
let lastFocusedElement = null;

function openRepoDetail(repoId) {
  const repo = repoDetails[repoId];
  if (!repo || !modal || !panel) return;

  lastFocusedElement = document.activeElement;

  setText("#detail-rank", repo.rank);
  setText("#detail-language", repo.language || "Unknown");
  setText("#detail-title", repo.title);
  setText("#detail-description", repo.description || "No repository description available.");
  setText("#detail-stars", formatNumber(repo.stars));
  setText("#detail-forks", formatNumber(repo.forks));
  setText("#detail-today", formatNumber(repo.starsToday));
  setText("#detail-why", repo.why);
  setText("#detail-fit", repo.fit);

  const link = document.querySelector("#detail-link");
  if (link) link.href = repo.url;

  const tags = document.querySelector("#detail-tags");
  if (tags) {
    tags.replaceChildren(...(repo.tags || []).map((tag) => {
      const chip = document.createElement("span");
      chip.textContent = tag;
      return chip;
    }));
  }

  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  panel.focus();
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
  const detailsButton = event.target.closest(".details-button");
  if (detailsButton) {
    const card = detailsButton.closest(".repo-card");
    openRepoDetail(card?.dataset.repoId);
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
