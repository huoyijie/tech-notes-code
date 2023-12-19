export default {
  wait(milliseconds) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      }, milliseconds)
    })
  },

  title(...contents) {
    return contents.join(' | ')
  },
}