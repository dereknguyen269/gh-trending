# GitHub Trending Landing

A static landing page that displays the latest repositories and developers from [GitHub Trending](https://github.com/trending).

## How it works

- `index.html`, `styles.css`, and `script.js` render the landing page.
- `data/trending-repos.js` stores the current trending repository snapshot.
- `data/trending-developers.js` stores the current trending developer snapshot.
- `scripts/update-trending.mjs` fetches `https://github.com/trending?since=daily` and `https://github.com/trending/developers?since=daily`, then regenerates both data files.
- `.github/workflows/update-trending-landing.yml` runs daily and can also be triggered manually.

## GitHub Pages

Enable **Settings -> Pages -> Source: GitHub Actions** for this repository. The workflow deploys the repository root as the Pages artifact.

## Local update

```bash
node scripts/update-trending.mjs
```
