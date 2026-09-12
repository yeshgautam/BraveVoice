const cors = require('cors');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const homeworkRoutes = require('./routes/homework');
const sessionsRoutes = require('./routes/sessions');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Prevent abuse — 100 requests per 15 minutes per IP across the whole API.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(sessionsRoutes);
app.use(homeworkRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
