import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
    @IsEmail()
    @IsNotEmpty()
    @ApiProperty({ example: 'john@gmail.com' })
    email: string;
}

export class ResetPasswordDto {
    @IsEmail()
    @IsNotEmpty()
    @ApiProperty({ example: 'john@gmail.com' })
    email: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: '000000', description: 'OTP sent to email' })
    otp: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    @ApiProperty({ example: 'newPassword123' })
    newPassword: string;
}
