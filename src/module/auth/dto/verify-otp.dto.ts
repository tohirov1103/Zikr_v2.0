import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyOtpDto {
    @IsEmail()
    @IsNotEmpty()
    @ApiProperty({ example: 'john@gmail.com' })
    email: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: '000000', description: 'OTP sent to email' })
    otp: string;
}
