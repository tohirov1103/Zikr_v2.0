import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @ApiProperty({example: "John Doe"})
  fullname?: string;

  @IsOptional()
  @IsEmail()
  @ApiProperty({example: "john@gmail.com"})
  email?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({example: "12345"})
  password?: string;

  @IsPhoneNumber('UZ')
  @IsOptional()
  @ApiProperty({example: "+998999999999"})
  phone?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({example: "image_url.jpg"})
  image_url?: string;
}