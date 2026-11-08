# Project status

## Appwrite backend

- Project idea-graveyard is active in Frankfurt.
- TablesDB database: graveyard-db (7 tables, row security enabled).
- Storage bucket: grave-images.
- API Function: graveyard-api, Node.js 22, enabled, active deployment ready.
- Scheduler Function: graveyard-scheduler, Node.js 22, daily interval, active deployment ready.
- Public Explore read-only smoke test returned HTTP 200 with an empty-graveyard response.
- Cloudflare Pages hostname idea-graveyard-4ld.pages.dev is registered as an Appwrite web platform, alongside localhost and the GitHub Pages hostname.

## Frontend

- The former root index.html was only a static landing page; it did not expose the cemetery app.
- The replacement frontend is plain HTML, CSS, and JavaScript under assets/; no build command is required.
- Implemented UI flows: public Explore, status filter, local title search, Hall of Fame, sign-up/login, create public/private grave, view grave, flowers, tributes, resurrection/reburial, and My Graves.
- Search filters the latest public Explore result in the browser; it deliberately avoids Appwrite full-text search until a matching index is configured.
- The GitHub branch fix/real-frontend contains the frontend changes. Review/merge and a successful public deployment are still required.

## Hosting and release

- Cloudflare Pages project: idea-graveyard; hostname: idea-graveyard-4ld.pages.dev.
- The last recorded Cloudflare deployment (2026-11-05) was a manual/ad-hoc upload with no commit SHA. Its deploy stage succeeded, but that does not verify that the expected app files were served.
- Cloudflare's Git source connection could not be enabled because its API reported an internal Git installation issue. Automated Cloudflare Git deployments are therefore not confirmed.
- A GitHub Pages workflow is present, but the repository's GitHub Pages settings and deployment state still need verification.
- The new frontend has not yet been verified in a live browser on the production host.

## Remaining before public launch

- Review and merge the frontend branch.
- Complete a working deployment to the chosen production hostname.
- Test sign-up/login and all write actions from a real browser.
- Test private graves with two separate accounts.
- Add abuse protection and rate limits before opening the service to a large public audience.
- Review the scheduler separately before enabling any additional automated task.

Never commit API keys or secrets. Flowers are symbolic only; there are no real-money payments, cryptocurrency, deposits, or withdrawals.