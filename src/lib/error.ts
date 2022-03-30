export class MalformedRequestError implements Error {
  name: string;
  message: string;
  constructor(message: string) {
    this.message = `malformed request: ${message}`;
    this.name = "MalformedRequestError";
  }
}

export class NotFoundError implements Error {
  name: string;
  message: string;
  constructor(message: string) {
    this.message = `asset not found: ${message}`;
    this.name = "NotFoundError";
  }
}

export class InternalServerError implements Error {
  name: string;
  message: string;
  constructor(message: string) {
    this.message = `internal server error: ${message}`;
    this.name = "InternalServerError";
  }
}

export class HttpError implements Error {
  name: string;
  message: string;
  status: number;
  constructor(error: MalformedRequestError | NotFoundError | InternalServerError | Error) {
    this.name = error.name;
    this.message = error.message;
    if (error instanceof MalformedRequestError) {
      this.status = 400;
    } else if (error instanceof NotFoundError) {
      this.status = 404
    } else {
      this.name = "InternalServerError"
      this.status = 500
    }
  }
}