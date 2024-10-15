import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @IsEmail()
    @IsOptional()
    @ApiPropertyOptional({ example: 'john@gmail.com' })
    email?: string;

    @IsPhoneNumber('UZ')
    @IsOptional()
    @ApiPropertyOptional({ example: '+998999999999' })
    phone?: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    @ApiProperty({ example: '12345' })
    password: string;
}
