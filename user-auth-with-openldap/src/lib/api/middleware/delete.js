import util from '@/lib/api/util'

export default function del(handler) {
  return util.wrapper(handler, 'DELETE')
}