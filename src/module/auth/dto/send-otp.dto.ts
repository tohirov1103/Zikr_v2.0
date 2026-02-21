import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'john@gmail.com' })
  email: string;
}
