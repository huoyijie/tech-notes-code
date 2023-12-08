export class ClientError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message)
    this.code = code
    this.statusCode = statusCode
  }
}

export class ServerError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
  }
}