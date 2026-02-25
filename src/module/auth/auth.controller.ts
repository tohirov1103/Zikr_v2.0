import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LoginDto, RegisterDto, SendOtpDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto } from './dto';

@ApiTags('AUTH')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Step 1: Submit registration data (OTP will be sent to email)' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-registration')
  @ApiOperation({ summary: 'Step 2: Verify OTP to complete registration' })
  async verifyRegistration(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyRegistration(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'User Login (email or phone + password)' })
  async userLogin(@Body() loginDto: LoginDto) {
    return this.authService.userLogin(loginDto);
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Admin Login' })
  async adminLogin(@Body() loginDto: LoginDto) {
    return this.authService.adminLogin(loginDto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Step 1: Send OTP to email for password reset' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Step 2: Verify OTP and set new password' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP to email' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }
}
