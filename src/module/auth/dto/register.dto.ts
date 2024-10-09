import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John Doe' })
  fullname: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'john@gmail.com' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @ApiProperty({ example: '12345' })
  password: string;

  @IsPhoneNumber('UZ')
  @IsNotEmpty()
  @ApiProperty({ example: '+998999999999' })
  phone: string;
}
