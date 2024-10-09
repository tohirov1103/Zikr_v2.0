import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtHelper {
  constructor(private readonly jwtService: JwtService) {}

  decode(token: string) {
    return this.jwtService.decode(token);
  }

  verify(token: string, secret: string) {
    return this.jwtService.verify(token, { secret });
  }
}
