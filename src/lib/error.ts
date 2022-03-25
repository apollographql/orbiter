export class MalformedRequestError extends Error {
  constructor(message: string) {
    super(`Malformed request: ${message}`);
    this.name = "MalformedRequestError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(`Asset not found: ${message}`);
    this.name = "NotFoundError";
  }
}
