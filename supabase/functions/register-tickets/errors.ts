export class ResponseError extends Error {
  status;
  code;
  details;
  constructor(status, code, details){
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export function badRequest(code, details) {
  return new ResponseError(400, code, details);
}
export function forbidden(code, details) {
  return new ResponseError(403, code, details);
}
export function conflict(code, details) {
  return new ResponseError(409, code, details);
}
export function internal(code, details) {
  return new ResponseError(500, code, details);
}
export function badGateway(code, details) {
  return new ResponseError(502, code, details);
}
