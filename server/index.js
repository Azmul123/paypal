/**
 * FlowPilot — AI-powered PayPal Dispute Evidence Copilot
 * Backend API Server (Module 1: Dispute Management)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const disputesRouter = require('./routes/disputes');
const paypalRouter = require('./routes/paypal');
const integrationRouter = require('./routes/integration');
const intelligenceRouter = require('./routes/intelligence');
const evidenceRouter = require('./routes/evidence');
const responseRouter = require('./routes/response');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', process.env.CLIENT_URL].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    product: 'FlowPilot',
    modules: ['Dispute Management', 'Evidence Management', 'AI Evidence Intelligence', 'Response Generation'],
    version: '1.4.0',
    mode: process.env.PAYPAL_MODE || 'demo',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/disputes', disputesRouter);
app.use('/api/paypal', paypalRouter);
app.use('/api/integration', integrationRouter);
app.use('/api/intelligence', intelligenceRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/response', responseRouter);

// Serve static frontend build if available
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 Handler for unhandled API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.path}`
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// Only listen when executed directly (not when required in tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 FlowPilot Backend API running on port ${PORT}`);
    console.log(`   Dispute Management Module Ready`);
    console.log(`   Mode: ${process.env.PAYPAL_MODE || 'demo'}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
