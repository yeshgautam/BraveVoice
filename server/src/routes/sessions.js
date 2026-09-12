const express = require('express');

const { authenticate } = require('../auth');
const { getSpreadsheetId } = require('../classRegistry');
const { getSheetsClient } = require('../sheetsClient');
const { ValidationError, validateSessionPayload } = require('../validation');

const router = express.Router();

const STRATEGY_COLUMN = {
  'Easy Onset': 'G',
  'Slow Speech': 'H',
  'Stretchy Speech': 'I',
  'Light Contact': 'J',
  Cancellations: 'K',
};

const FLUENCY_STRATEGY_COLUMN = {
  'Easy Onset': 'D',
  'Slow Speech': 'E',
  'Stretchy Speech': 'F',
  'Light Contact': 'G',
  Cancellations: 'H',
};

function getAutoNote(session) {
  const pct = Math.round(session.fluency_score * 100);
  if (pct === 100) return 'Perfect session!';
  if (pct >= 85) return 'Strong session';
  if (pct >= 70) return 'Good progress';
  if (session.block_count > 2) return `${session.block_count} blocks — review technique`;
  if (session.repetition_count > 2) return `${session.repetition_count} repetitions detected`;
  return 'Needs practice';
}

/** Appends new rows to Student Progress — the Sheets API locates the next empty row itself. */
async function writeSessionsToSheet(sheets, spreadsheetId, sessions) {
  const rows = sessions.map((s) => [
    new Date(s.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    s.game_name,
    s.strategy_name,
    s.words_attempted,
    s.words_correct,
    `${Math.round(s.fluency_score * 100)}%`,
    s.stars_earned,
    Math.round(s.duration_seconds / 60),
    s.stutter_events,
    s.block_count,
    getAutoNote(s),
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Student Progress!B16:L',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: rows },
  });
}

/** Updates each student's last-active date and latest strategy score on Class Overview. */
async function updateClassOverview(sheets, spreadsheetId, sessions) {
  const current = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Class Overview!B8:N25',
  });
  const rows = current.data.values || [];

  for (const session of sessions) {
    const rowIndex = rows.findIndex((row) => row[0] === session.student_code);
    if (rowIndex === -1) continue;
    const sheetRow = 8 + rowIndex;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Class Overview!F${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['Today']] },
    });

    const strategyColumn = STRATEGY_COLUMN[session.strategy_name];
    if (strategyColumn) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Class Overview!${strategyColumn}${sheetRow}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[session.fluency_score]] },
      });
    }
  }
}

/** Updates each student's latest strategy score and weekly session count on Fluency Scores. */
async function updateFluencyScores(sheets, spreadsheetId, sessions) {
  const current = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Fluency Scores!B6:L25',
  });
  const rows = current.data.values || [];

  for (const session of sessions) {
    const rowIndex = rows.findIndex((row) => row[0] === session.student_code);
    if (rowIndex === -1) continue;
    const sheetRow = 6 + rowIndex;

    const strategyColumn = FLUENCY_STRATEGY_COLUMN[session.strategy_name];
    if (strategyColumn) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Fluency Scores!${strategyColumn}${sheetRow}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[session.fluency_score]] },
      });
    }

    const weeklyCountCell = rows[rowIndex]?.[8]; // column J, index 8 within B6:L range
    const currentCount = Number.parseInt(weeklyCountCell, 10) || 0;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Fluency Scores!J${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[currentCount + 1]] },
    });
  }
}

router.post('/sessions/sync', authenticate, async (req, res) => {
  const { sessions } = req.body;
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const validSessions = [];
  const rejected = [];
  for (const session of sessions) {
    try {
      validateSessionPayload(session);
      validSessions.push(session);
    } catch (error) {
      if (error instanceof ValidationError) {
        rejected.push({ student_code: session?.student_code, reason: error.message });
      } else {
        throw error;
      }
    }
  }

  if (validSessions.length === 0) {
    return res.status(400).json({ error: 'No valid sessions in payload', rejected });
  }

  try {
    const sheets = await getSheetsClient();

    const byClass = {};
    validSessions.forEach((session) => {
      const code = session.class_code;
      if (!byClass[code]) byClass[code] = [];
      byClass[code].push(session);
    });

    for (const [classCode, classSessions] of Object.entries(byClass)) {
      const spreadsheetId = getSpreadsheetId(classCode);
      if (!spreadsheetId) continue;

      await writeSessionsToSheet(sheets, spreadsheetId, classSessions);
      await updateClassOverview(sheets, spreadsheetId, classSessions);
      await updateFluencyScores(sheets, spreadsheetId, classSessions);
    }

    res.json({ success: true, synced: validSessions.length, rejected });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

module.exports = router;
