export default function handleUncaughtError(handler) {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }
}