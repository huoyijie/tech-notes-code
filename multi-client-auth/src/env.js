import util from './util.js'
import dotenv from 'dotenv'
dotenv.config()

export default {
  nodeEnv: process.env.NODE_ENV || 'development',
  log: process.env.LOG || true,
  port: process.env.PORT || 3000,
  secretKey: util.sha256(process.env.SECRET_KEY),
}