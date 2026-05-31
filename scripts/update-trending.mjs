import fs from "node:fs/promises";
import path from "node:path";

const outputPath = new URL("../data/trending-repos.js", import.meta.url);
const developerOutputPath = new URL("../data/trending-developers.js", import.meta.url);
const sourceUrl = "https://github.com/trending?since=daily";
const developerSourceUrl = "https://github.com/trending/developers?since=daily";
const limit = Number(process.env.TRENDING_LIMIT || 14);

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function stripTags(value = "") {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value = "") {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function slugify(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fallbackWhy(repo) {
  const desc = repo.description.toLowerCase();

  if (desc.includes("ai") || desc.includes("agent") || desc.includes("llm")) {
    return "It is trending because developers are actively testing practical AI workflows, agents, and automation patterns.";
  }
  if (desc.includes("document") || desc.includes("markdown") || desc.includes("parser")) {
    return "It is trending because document processing is a core layer for search, knowledge bases, and AI retrieval workflows.";
  }
  if (desc.includes("open") || desc.includes("alternative")) {
    return "It is trending because open-source alternatives give teams more control, portability, and room to customize.";
  }

  return "It is trending because GitHub users are rapidly starring it today, signaling fresh community attention and practical curiosity.";
}

function fallbackFit(repo) {
  const language = repo.language || "project";
  return `Developers evaluating fast-moving ${language} repositories and deciding what deserves a deeper look.`;
}

function inferTags(repo) {
  const text = `${repo.title} ${repo.description} ${repo.language}`.toLowerCase();
  const tags = [];

  if (repo.language) tags.push(repo.language);
  if (text.includes("ai") || text.includes("agent") || text.includes("llm")) tags.push("AI");
  if (text.includes("plugin")) tags.push("Plugin");
  if (text.includes("document") || text.includes("markdown") || text.includes("parser")) tags.push("Docs");
  if (text.includes("open")) tags.push("Open source");
  if (text.includes("tool")) tags.push("Tooling");
  if (text.includes("learn") || text.includes("guide")) tags.push("Learning");

  return [...new Set(tags)].slice(0, 3);
}

function fallbackDeveloperWhy(developer) {
  if (developer.popularRepository?.name) {
    return `${developer.name} is trending because their repository ${developer.popularRepository.name} is receiving visible attention on GitHub today.`;
  }

  return `${developer.name} is trending because GitHub users are visiting and following their work today.`;
}

function inferDeveloperTags(developer) {
  const text = `${developer.name} ${developer.username} ${developer.popularRepository?.name || ""} ${developer.popularRepository?.description || ""}`.toLowerCase();
  const tags = ["Developer"];

  if (text.includes("ai") || text.includes("agent") || text.includes("llm")) tags.push("AI");
  if (text.includes("event")) tags.push("Events");
  if (text.includes("tool")) tags.push("Tooling");
  if (text.includes("web") || text.includes("app")) tags.push("Web");
  if (text.includes("data")) tags.push("Data");

  return [...new Set(tags)].slice(0, 3);
}

function parseTrending(html) {
  const articles = html.match(/<article[\s\S]*?class="[^"]*Box-row[^"]*"[\s\S]*?<\/article>/g) || [];

  return articles.slice(0, limit).map((article, index) => {
    const linkMatch = article.match(/<h2[\s\S]*?<a[^>]*href="\/([^"]+)"[\s\S]*?<\/a>[\s\S]*?<\/h2>/);
    if (!linkMatch) return null;

    const repoPath = decodeHtml(linkMatch[1]).replace(/^\/|\/$/g, "");
    const [owner, name] = repoPath.split("/");
    if (!owner || !name) return null;

    const pathPattern = escapeRegExp(repoPath);
    const title = `${owner} / ${name}`;
    const description = stripTags((article.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/) || [])[1] || "No repository description available.");
    const language = stripTags((article.match(/itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/) || [])[1] || "Unknown");
    const stars = parseNumber(stripTags((article.match(new RegExp(`href="/${pathPattern}/stargazers"[\\s\\S]*?>([\\s\\S]*?)<\\/a>`)) || [])[1] || "0"));
    const forks = parseNumber(stripTags((article.match(new RegExp(`href="/${pathPattern}/forks"[\\s\\S]*?>([\\s\\S]*?)<\\/a>`)) || [])[1] || "0"));
    const starsToday = parseNumber((article.match(/([\d,]+)\s+stars?\s+today/i) || [])[1] || "0");

    const repo = {
      id: slugify(name) || `${slugify(owner)}-${index + 1}`,
      owner,
      name,
      title,
      description,
      language,
      stars,
      forks,
      starsToday,
      url: `https://github.com/${repoPath}`,
      rank: `#${String(index + 1).padStart(2, "0")}`,
    };

    return {
      ...repo,
      why: fallbackWhy(repo),
      fit: fallbackFit(repo),
      tags: inferTags(repo),
    };
  }).filter(Boolean);
}

function parseTrendingDevelopers(html) {
  const articles = html.match(/<article[\s\S]*?class="[^"]*Box-row[^"]*"[\s\S]*?<\/article>/g) || [];

  return articles.slice(0, limit).map((article, index) => {
    const avatarMatch = article.match(/<img[^>]*class="[^"]*avatar-user[^"]*"[^>]*src="([^"]+)"[^>]*alt="@([^"]+)"/);
    const nameMatch = article.match(/<h1 class="h3[\s\S]*?<a[^>]*href="\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const usernameMatch = article.match(/<p class="f4[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);
    if (!nameMatch && !avatarMatch) return null;

    const username = stripTags(usernameMatch?.[1] || avatarMatch?.[2] || nameMatch?.[1] || "unknown");
    const name = stripTags(nameMatch?.[2] || username);
    const profilePath = decodeHtml(nameMatch?.[1] || username).replace(/^\/|\/$/g, "");
    const avatarUrl = decodeHtml(avatarMatch?.[1] || "").replace(/&amp;/g, "&");

    const popularSection = (article.match(/Popular repo[\s\S]*$/) || [])[0] || "";
    const popularRepoMatch = popularSection.match(/<h1 class="h4[\s\S]*?<a[^>]*href="\/([^"]+)"[^>]*>[\s\S]*?([\w.-]+)\s*<\/a>/);
    const popularDescription = stripTags((popularSection.match(/<div class="f6 color-fg-muted mt-1">([\s\S]*?)<\/div>/) || [])[1] || "");

    const developer = {
      id: slugify(username) || `${slugify(name)}-${index + 1}`,
      rank: `#${String(index + 1).padStart(2, "0")}`,
      name,
      username,
      avatarUrl,
      url: `https://github.com/${profilePath}`,
      popularRepository: popularRepoMatch ? {
        name: stripTags(popularRepoMatch[2]),
        url: `https://github.com/${decodeHtml(popularRepoMatch[1])}`,
        description: popularDescription || "No popular repository description available.",
      } : null,
    };

    return {
      ...developer,
      why: fallbackDeveloperWhy(developer),
      tags: inferDeveloperTags(developer),
    };
  }).filter(Boolean);
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "text/html",
      "user-agent": "github-trending-landing-updater/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub Trending request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function writeDataFile(fileUrl, globalName, payload) {
  await fs.mkdir(path.dirname(new URL(fileUrl).pathname), { recursive: true });
  await fs.writeFile(fileUrl, `window.${globalName} = ${JSON.stringify(payload, null, 2)};\n`);
}

async function main() {
  const html = await fetchHtml(sourceUrl);
  const developerHtml = await fetchHtml(developerSourceUrl);
  const repositories = parseTrending(html);
  const developers = parseTrendingDevelopers(developerHtml);

  if (repositories.length === 0) {
    throw new Error("No repositories parsed from GitHub Trending.");
  }

  if (developers.length === 0) {
    throw new Error("No developers parsed from GitHub Trending Developers.");
  }

  const updatedAt = new Date().toISOString();
  const repoPayload = {
    updatedAt,
    source: sourceUrl,
    repositories,
  };
  const developerPayload = {
    updatedAt,
    source: developerSourceUrl,
    developers,
  };

  await writeDataFile(outputPath, "trendingRepos", repoPayload);
  await writeDataFile(developerOutputPath, "trendingDevelopers", developerPayload);

  console.log(`Updated ${repositories.length} trending repositories at ${new URL(outputPath).pathname}`);
  console.log(`Updated ${developers.length} trending developers at ${new URL(developerOutputPath).pathname}`);
}

await main();
