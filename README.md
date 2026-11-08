# Idea Graveyard
**Ideas may die. Their stories never do.**

A quiet, atmospheric home for unfinished, abandoned, and occasionally resurrected ideas.

## What works in the current MVP

The frontend is a static HTML/CSS/JavaScript app connected to Appwrite through the graveyard-api Function.

- Browse public graves and filter by resting/resurrected status.
- Search the currently loaded public graves by title.
- Create public or private graves after signing in.
- Open public graves and owner-only private graves.
- Leave virtual flowers and written tributes on public graves.
- Bring your own idea back to life, or lay it to rest again.
- View the Hall of Fame for ideas that have been resurrected.
- View and manage your own graves.

The interface is responsive and uses the existing Appwrite backend. It does not require a frontend build step.

## Technology

- Frontend: HTML, CSS, vanilla JavaScript
- Authentication and backend: Appwrite
- Database: Appwrite TablesDB
- Functions: Node.js 22
- Hosting: Cloudflare Pages project configured; GitHub Pages workflow also included

## Repository layout

- index.html
- assets/app.js
- assets/styles.css
- functions/graveyard-api/
- functions/graveyard-scheduler/
- docs/STATUS.md

## Appwrite resources

- Project: idea-graveyard
- Database: graveyard-db
- Storage bucket: grave-images
- Functions: graveyard-api, graveyard-scheduler
- Web platforms: localhost, GitHub Pages hostname, and Cloudflare Pages hostname

The public Explore endpoint passed a read-only smoke test (HTTP 200). The API Function uses its per-execution server key for database access and the user's session JWT for authenticated actions. No API key is stored in the frontend.

## Before calling this production-ready

- Run sign-up/login and every write action in a real browser.
- Test private graves with two separate accounts.
- Confirm the production host serves the current files and Appwrite requests succeed from that domain.
- Add moderation and rate limiting before opening the service to a large public audience.
- Review the daily scheduler separately before enabling any future automated tasks.

Password recovery, image uploads, moderation, anniversaries, wallet features, and any shop are not part of this MVP. Flowers are symbolic only: there are no real-money payments, cryptocurrency, deposits, or withdrawals.

## Safety and scope

Private graves must remain private. Never commit API keys or secrets. Site-wide events are symbolic and must never delete or disable the real website or its data.