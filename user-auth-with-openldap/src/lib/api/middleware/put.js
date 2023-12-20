import util from '@/lib/api/util'

export default function put(handler) {
  return util.wrapper(handler, 'PUT')
}