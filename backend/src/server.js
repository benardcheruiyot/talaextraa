require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const pushService = require('./services/pushService');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsConfig = require('./utils/corsConfig');
app.use((req, res, next) => {
  if (req.headers.origin) {
    console.log(`[CORS DEBUG] Incoming request Origin: ${req.headers.origin}`);
  }
  next();
});
app.use(cors(corsConfig));
app.use(morgan('combined'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// ✅ Request timeout handler - ensure we don't hang requests
app.use((req, res, next) => {
  // Set a timeout of 25 seconds for all requests
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.warn(`[Timeout] Request timeout for ${req.method} ${req.path}`);
      res.status(504).json({
        success: false,
        message: 'Request timeout - server took too long to respond',
      });
    }
  }, 25000);

  // Clear timeout if response is sent
  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));

  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: 'file-based',
    services: {
      push: pushService.isEnabled(),
    },
  });
});

// Routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: File-based JSON storage\n`);

  // Configure Web Push
  const pushConfigured = pushService.configure();
  if (pushConfigured) {
    console.log('🔔 Web Push notifications enabled');
    
    setTimeout(() => {
      pushService.broadcastHourlyReminder().catch(err => {
        console.warn('[Push] Initial reminder failed:', err.message);
      });
    }, 2 * 60 * 1000);

    setInterval(() => {
      pushService.broadcastHourlyReminder().catch(err => {
        console.warn('[Push] Hourly reminder failed:', err.message);
      });
    }, 60 * 60 * 1000);
  } else {
    console.warn('🔕 Web Push disabled');
  }
});

module.exports = server;
