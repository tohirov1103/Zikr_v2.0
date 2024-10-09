import { JwtPayload } from "../interfaces";

declare module 'express' {
  interface Request {
    user?: JwtPayload;
  }
}
