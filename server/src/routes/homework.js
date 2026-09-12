const express = require('express');

const { authenticate } = require('../auth');
const { getSpreadsheetId } = require('../classRegistry');
const { getSheetsClient } = require('../sheetsClient');
const { ValidationError, validateHomeworkAssignment, STUDENT_CODE_PATTERN } = require('../validation');

const router = express.Router();

const TECHNIQUE_FOCUS = {
  'Easy Onset': 'Gentle airflow start',
  'Slow Speech': 'Rate < 2.5 syl/sec',
  'Stretchy Speech': 'Word duration 600ms+',
  'Light Contact': 'Gentle lip/tongue contact',
  Cancellations: 'Finish-pause-retry',
};

function getTechniqueFocus(strategy) {
  return TECHNIQUE_FOCUS[strategy] || strategy;
}

router.post('/homework/assign', authenticate, async (req, res) => {
  try {
    validateHomeworkAssignment(req.body);
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    throw error;
  }

  const { class_code, student_code, strategy, game, level, reps, due_date } = req.body;

  const spreadsheetId = getSpreadsheetId(class_code);
  if (!spreadsheetId) return res.status(404).json({ error: 'Class not found' });

  try {
    const sheets = await getSheetsClient();

    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dueFormatted = new Date(due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Homework Assignments!B5:J',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [
          [
            student_code,
            strategy,
            game,
            getTechniqueFocus(strategy),
            level,
            reps,
            today,
            dueFormatted,
            'Pending ⬜',
          ],
        ],
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Assign homework error:', error);
    res.status(500).json({ error: 'Failed to assign homework' });
  }
});

router.get('/homework/:studentCode', authenticate, async (req, res) => {
  const { studentCode } = req.params;
  const classCode = req.headers['x-class-code'];

  if (!STUDENT_CODE_PATTERN.test(studentCode)) {
    return res.status(400).json({ error: 'Invalid student code format' });
  }
  if (typeof classCode !== 'string' || classCode.length === 0) {
    return res.status(400).json({ error: 'Missing x-class-code header' });
  }

  const spreadsheetId = getSpreadsheetId(classCode);
  if (!spreadsheetId) return res.status(404).json({ error: 'Class not found' });

  try {
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Homework Assignments!B6:J50',
    });

    const rows = response.data.values || [];
    const studentHomework = rows
      .filter((row) => row[0] === studentCode)
      .filter((row) => row[8] !== 'Done ✅')
      .map((row) => ({
        strategy: row[1],
        game: row[2],
        focus: row[3],
        level: row[4],
        reps: Number.parseInt(row[5], 10),
        assigned: row[6],
        due: row[7],
        status: row[8],
      }));

    res.json({ homework: studentHomework });
  } catch (error) {
    console.error('Fetch homework error:', error);
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

module.exports = router;
