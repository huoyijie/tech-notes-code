import util from '@/lib/api/util'

export default function get(handler) {
  return util.wrapper(handler, 'GET')
}