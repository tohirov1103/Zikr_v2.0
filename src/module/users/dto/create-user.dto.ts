import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({example: "John"})
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({example: "Doe"})
  surname: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({example: "john@gmail.com"})
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({example: "12345"})
  password: string;

  @IsPhoneNumber('UZ')
  @IsNotEmpty()
  @ApiProperty({example: "+998999999999"})
  phone: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({example: "image_url.jpg"})
  image_url?: string;

  @IsEnum(Role)
  @IsOptional()
  @ApiPropertyOptional({example: Role.USER})
  role?: Role;
}