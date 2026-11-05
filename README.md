# Idea Graveyard
**Ideas may die. Their stories never do.**

A dark, atmospheric community cemetery for unfinished, abandoned, and occasionally resurrected ideas.

## Project
Idea Graveyard gives every unfinished idea a place to rest and a story worth remembering. A grave can include a title, story, reason for abandonment, visibility, and a visual theme. Ideas can receive flowers and tributes, and their owners can bring them back to life.

## Planned experience
- Explore public graves and search by title
- Create public or private graves
- Keep a history of burial and resurrection
- Leave flowers and written tributes
- View community Hall of Fame
- Add anniversaries, a virtual shop, and a wallet in later milestones

## Technology
- Frontend: HTML, CSS, JavaScript
- Authentication and backend: Appwrite
- Database: Appwrite TablesDB
- Functions: Node.js 22
- Static hosting: GitHub Pages

## Repository layout
```
index.html                 GitHub Pages entry point
frontend/                  Main frontend source
functions/graveyard-api/   API Function source
functions/graveyard-scheduler/ Scheduled Function source
docs/                      Project notes
```

## Appwrite project
- Project ID: `idea-graveyard`
- Database ID: `graveyard-db`
- Storage bucket: `grave-images`

The Appwrite project is being configured. Function source and deployments, database schema compatibility, authentication flows, and GitHub Pages hosting must be verified before the site is considered live. No API keys or secrets belong in this repository.

## Safety and scope
The initial version uses virtual flowers only. There are no real-money payments, cryptocurrency, deposits, or withdrawals. Private graves must remain private. Site-wide events are symbolic and must never delete or disable the real website or its data.

## Development status
This is an early MVP. Before public launch, test all authenticated actions, review Appwrite row permissions, add abuse protection and rate limits, and finish password recovery, image uploads, moderation, and anniversary features.
