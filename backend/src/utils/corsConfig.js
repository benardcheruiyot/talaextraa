const normalizeOrigins = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const defaultOrigins = ['http://localhost:3000', 'http://localhost:5000'];
const allowedOrigins = normalizeOrigins(process.env.ALLOWED_ORIGINS); 
const configuredOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins;

const corsConfig = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (configuredOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = corsConfig;
