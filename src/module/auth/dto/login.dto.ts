import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'john@gmail.com', description: 'Email or phone number' })
    emailOrPhone: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    @ApiProperty({ example: '12345' })
    password: string;
}
