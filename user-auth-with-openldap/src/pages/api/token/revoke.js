import handleUncaughtError from '@/lib/api/middleware/handleUncaughtError'
import post from '@/lib/api/middleware/post'

async function revoke(req) {
  return {}
}

export default handleUncaughtError(post(revoke))