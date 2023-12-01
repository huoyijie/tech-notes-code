import util from '#util'
import { configDotenv } from 'dotenv'

const nodeEnv = process.env.NODE_ENV || 'development'
const path = nodeEnv === 'test' ? '.env.test' : (nodeEnv === 'production' ? '.env.prod' : '.env');
configDotenv({ path })

export default {
  nodeEnv,
  log: process.env.LOG || true,
  logSql: (process.env.LOG_SQL || 'query,info,warn,error').split(','),
  port: process.env.PORT || 3000,
  secretKey: util.sha256(process.env.SECRET_KEY),
  // in hours
  accessTokenExpires: process.env.ACCESS_TOKEN_EXPIRES || 2,
  refreshTokenExpires: process.env.REFRESH_TOKEN_EXPIRES || 7 * 24,
}