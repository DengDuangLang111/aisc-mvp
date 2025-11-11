export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || 'http://localhost:4000',

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  upload: {
    destination: process.env.UPLOAD_DIR || './uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10), // 60 seconds
    limit: parseInt(process.env.RATE_LIMIT_MAX || '20', 10), // 20 requests
  },

  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '60000', 10), // 60 seconds
    max: parseInt(process.env.CACHE_MAX || '100', 10), // 100 entries
  },

  ai: {
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_API_BASE_URL || '',
    model: process.env.AI_MODEL || 'glm-4',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  ocr: {
    useQueue: process.env.ENABLE_OCR_QUEUE !== 'false',
  },
});
