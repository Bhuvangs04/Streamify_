// Load environment variables from .env file
require('dotenv').config();

const Redis = require("ioredis");

const redisClient = new Redis({
  host: process.env.REDIS_HOST, 
  port: process.env.REDIS_PORT, 
  password: process.env.REDISCLI_AUTH, 
  username: process.env.REDIS_USER, 
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  connectTimeout: 10000,
});

module.exports = redisClient;
