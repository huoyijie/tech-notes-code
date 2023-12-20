import util from '@/lib/api/util'

export default function post(handler) {
  return util.wrapper(handler, 'POST')
}