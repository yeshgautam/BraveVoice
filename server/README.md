# BraveVoice Sync Server

Receives session data from the BraveVoice app (tagged only with anonymous student codes,
e.g. `YG011` — never a real name) and writes it into each therapist's Google Sheet.

## Setup

```bash
cd server
npm install
cp .env.example .env        # fill in API_SECRET
cp class-registry.example.json class-registry.json
```

Edit `.env`:

- `API_SECRET` — a long random string. The app sends this as its `Authorization` header;
  requests without a match get `401`.
- `GOOGLE_CREDENTIALS_PATH` — path to the service account JSON key (see below).
- `PORT` — defaults to `3000`.

Run it:

```bash
npm start        # or: npm run dev (auto-restarts on file changes)
```

## Connecting a therapist's Google Sheet (one-time, per therapist)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a
   project (e.g. "BraveVoice").
2. Enable the **Google Sheets API** for that project.
3. Create a **Service Account**, then generate and download its JSON key. Save it as
   `server/credentials.json` (or point `GOOGLE_CREDENTIALS_PATH` at wherever you put it).
   This file is gitignored — never commit it.
4. Open the therapist's Google Sheet and **share it with the service account's email**
   (found in the JSON key, looks like `...@...iam.gserviceaccount.com`) with **Editor**
   access.
5. Copy the spreadsheet ID from the sheet's URL — the segment between `/d/` and `/edit`.
6. Add an entry to `server/class-registry.json`:

```json
{
  "ABC123": {
    "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
    "therapistName": "Dr. Johnson"
  }
}
```

No restart needed — the registry reloads from disk on each lookup miss, or call
`classRegistry.reload()` after deploying a change if you've wired that into an admin route.

The sheet must have these tabs: **How To Use**, **Class Overview**, **Student Progress**,
**Homework Assignments**, **Fluency Scores**, **Student Identity Map**. Only the therapist's
own spreadsheet ever has real names — in the **Student Identity Map** tab, which this
server never reads or writes.

## Endpoints

All endpoints require `Authorization: <API_SECRET>`.

- `POST /sessions/sync` — body `{ sessions: [...] }`. Appends rows to Student Progress,
  and updates the matching student's latest score on Class Overview and Fluency Scores.
- `POST /homework/assign` — body `{ class_code, student_code, strategy, game, level, reps, due_date }`.
  Appends a row to Homework Assignments.
- `GET /homework/:studentCode` — header `x-class-code: <code>`. Returns pending homework
  for that student.

## Privacy & security

- Every session payload is validated: forbidden PII field names (`name`, `email`, `phone`,
  `address`, `school`, ...) reject that entry, student codes must match `AB123`, and
  fluency scores must be within `0.0`–`1.0`. Invalid entries are dropped and reported back
  under `rejected` rather than failing the whole batch.
- Rate limited to 100 requests / 15 minutes per IP.
- No audio, transcripts, or location data ever reach this server — the app never collects
  it in the first place.
