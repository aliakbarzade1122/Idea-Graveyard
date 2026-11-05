# Idea Graveyard
**Ideas may die. Their stories never do.**

A dark, atmospheric community cemetery for unfinished, abandoned, and occasionally resurrected ideas.

## Project
Give unfinished ideas a place to rest and a story worth remembering. A grave can include a title, story, reason for abandonment, visibility, and a visual theme. Ideas can receive flowers and tributes, and their owners can bring them back to life.

## Planned experience
- Explore public graves and search by title
- Create public or private graves
- Keep a history of burial and resurrection
- Leave flowers and written tributes
- View a community Hall of Fame
- Add anniversaries, a virtual shop, and a wallet in later milestones

## Technology
- Frontend: HTML, CSS, JavaScript
- Authentication and backend: Appwrite
- Database: Appwrite TablesDB
- Functions: Node.js 22
- Static hosting: GitHub Pages

## Repository layout
```
index.html
functions/graveyard-api/
functions/graveyard-scheduler/
docs/STATUS.md
```

## Appwrite resources
- Project: `idea-graveyard`
- Database: `graveyard-db`
- Storage bucket: `grave-images`
- Functions: `graveyard-api`, `graveyard-scheduler`

Both Functions have active deployments. The public Explore endpoint passed a read-only smoke test (HTTP 200). The API Function has only `rows.read` and `rows.write` scopes; the scheduler has only `rows.read`. The API uses Appwrite's per-execution key header server-side and accepts the user's session JWT for authenticated actions.

## Safety and scope
The initial version uses virtual flowers only. There are no real-money payments, cryptocurrency, deposits, or withdrawals. Private graves must remain private. Site-wide events are symbolic and must never delete or disable the real website or its data. Never commit API keys or secrets.

## Development status
This is an early MVP, not a finished public service. Before launch, test authenticated sign-up/login and all write actions, review private-row access with separate accounts, and add abuse protection and rate limits. Password recovery, image upload, moderation, and anniversary features remain future work.
