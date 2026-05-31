import fs from "node:fs/promises";
import path from "node:path";

const rootDir = new URL("..", import.meta.url);
const outputPath = new URL("../data/trending-repos.js", import.meta.url);
const sourceUrl = "https://github.com/trending?since=daily";
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

async function fetchTrendingHtml() {
  const response = await fetch(sourceUrl, {
    headers: {
      "accept": "text/html",
      "user-agent": "github-trending-landing-updater/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub Trending request failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function main() {
  const html = await fetchTrendingHtml();
  const repositories = parseTrending(html);

  if (repositories.length === 0) {
    throw new Error("No repositories parsed from GitHub Trending.");
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    source: sourceUrl,
    repositories,
  };

  await fs.mkdir(path.dirname(new URL(outputPath).pathname), { recursive: true });
  await fs.writeFile(outputPath, `window.trendingRepos = ${JSON.stringify(payload, null, 2)};\n`);

  console.log(`Updated ${repositories.length} trending repositories at ${new URL(outputPath).pathname}`);
}

await main();
