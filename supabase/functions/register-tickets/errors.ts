export class ResponseError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, details?: unknown) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(code: string, details?: unknown) {
  return new ResponseError(400, code, details);
}

export function forbidden(code: string, details?: unknown) {
  return new ResponseError(403, code, details);
}

export function conflict(code: string, details?: unknown) {
  return new ResponseError(409, code, details);
}

export function internal(code: string, details?: unknown) {
  return new ResponseError(500, code, details);
}

export function badGateway(code: string, details?: unknown) {
  return new ResponseError(502, code, details);
}