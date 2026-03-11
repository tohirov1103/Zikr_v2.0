import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PasswordHasher } from '@common';
import { LoginDto, RegisterDto, SendOtpDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { Role } from '@prisma/client';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as otpGenerator from 'otp-generator';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: Number(this.configService.get<string>('mail.port')),
      secure: false,
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
    });
  }

  private generateToken(user: any) {
    const payload = { id: user.userId, role: user.role };
    return this.jwtService.sign(payload);
  }

  private generateOtp(): string {
    return otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
  }

  private async sendOtpEmail(to: string, otp: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get<string>('mail.user'),
      to,
      subject: 'Hatm App - Tasdiqlash kodi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50; text-align: center;">Hatm App</h2>
          <p style="text-align: center; font-size: 16px;">Sizning tasdiqlash kodingiz:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2c3e50;">${otp}</span>
          </div>
          <p style="text-align: center; color: #888; font-size: 14px;">Kod 5 daqiqa ichida amal qiladi.</p>
        </div>
      `,
    });
  }

  // ===================== REGISTER FLOW =====================

  // Step 1: User submits registration data → OTP sent to email
  async register(registerDto: RegisterDto) {
    const existingEmail = await this.usersService.findOneByEmail(registerDto.email);
    if (existingEmail) {
      throw new BadRequestException('Bu email uchun allaqachon account mavjud');
    }

    const existingPhone = await this.usersService.findOneByPhone(registerDto.phone);
    if (existingPhone) {
      throw new BadRequestException('Bu telefon raqam uchun allaqachon account mavjud');
    }

    const otp = this.generateOtp();

    // Cache registration data + OTP for 5 minutes
    await this.cacheManager.set(`register:${registerDto.email}`, {
      otp,
      ...registerDto,
    }, 300000);

    await this.sendOtpEmail(registerDto.email, otp);

    return { message: 'OTP sent to email. Please verify to complete registration.' };
  }

  // Step 2: User submits OTP → account is created
  async verifyRegistration(dto: VerifyOtpDto) {
    const cached = await this.cacheManager.get<{ otp: string; name: string; surname: string; email: string; password: string; phone: string }>(`register:${dto.email}`);
    if (!cached) {
      throw new BadRequestException('OTP expired or not found. Please register again.');
    }

    if (cached.otp !== dto.otp) {
      throw new UnauthorizedException('OTP noto\'g\'ri');
    }

    const hashedPassword = await PasswordHasher.hashPassword(cached.password);
    const newUser = await this.usersService.createUser({
      name: cached.name,
      surname: cached.surname,
      email: cached.email,
      phone: cached.phone,
      password: hashedPassword,
    });

    await this.cacheManager.del(`register:${dto.email}`);

    const token = this.generateToken(newUser);
    this.websocketGateway.server.emit('newUserRegistered', { user: newUser });

    return { message: 'Registration successful', user: newUser, token };
  }

  // ===================== LOGIN FLOW =====================

  // Login with email or phone + password (no OTP required)
  async userLogin(loginDto: LoginDto) {
    const { emailOrPhone, password } = loginDto;

    // Determine if it's email or phone
    const isEmail = emailOrPhone.includes('@');
    let user: any;

    if (isEmail) {
      user = await this.usersService.findOneByEmail(emailOrPhone);
    } else {
      user = await this.usersService.findOneByPhone(emailOrPhone);
    }

    if (!user) {
      throw new UnauthorizedException('Email/telefon yoki parol noto\'g\'ri');
    }

    const isPasswordValid = await PasswordHasher.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email/telefon yoki parol noto\'g\'ri');
    }

    if (user.role !== Role.USER) {
      throw new UnauthorizedException('Unauthorized role access');
    }

    const { password: _pw, ...userData } = user;
    const token = this.generateToken(userData);

    this.websocketGateway.server.emit('userLoggedIn', { user: userData });

    return { message: 'Login successful', token };
  }

  // Admin login (email + password, no OTP)
  async adminLogin(loginDto: LoginDto) {
    const { emailOrPhone, password } = loginDto;

    const user = await this.usersService.findOneByEmail(emailOrPhone);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await PasswordHasher.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.role !== Role.ADMIN) {
      throw new UnauthorizedException('Unauthorized role access');
    }

    const { password: _pw, ...userData } = user;
    const token = this.generateToken(userData);

    return { message: 'Login successful', token };
  }

  // ===================== FORGOT PASSWORD FLOW =====================

  // Step 1: User submits email → OTP sent
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findOneByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('Bu email bilan foydalanuvchi topilmadi');
    }

    const otp = this.generateOtp();

    await this.cacheManager.set(`forgot:${dto.email}`, { otp }, 300000);

    await this.sendOtpEmail(dto.email, otp);

    return { message: 'OTP sent to email' };
  }

  // Step 2: User submits OTP + new password → password updated
  async resetPassword(dto: ResetPasswordDto) {
    const cached = await this.cacheManager.get<{ otp: string }>(`forgot:${dto.email}`);
    if (!cached) {
      throw new BadRequestException('OTP expired or not found. Please request a new OTP.');
    }

    if (cached.otp !== dto.otp) {
      throw new UnauthorizedException('OTP noto\'g\'ri');
    }

    const user = await this.usersService.findOneByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await PasswordHasher.hashPassword(dto.newPassword);
    await this.usersService.updateUser(user.userId, { password: hashedPassword });

    await this.cacheManager.del(`forgot:${dto.email}`);

    return { message: 'Parol muvaffaqiyatli yangilandi' };
  }

  // ===================== SEND OTP (general) =====================

  async sendOtp(dto: SendOtpDto) {
    const user = await this.usersService.findOneByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('Bu email bilan foydalanuvchi topilmadi');
    }

    const otp = this.generateOtp();

    await this.cacheManager.set(`otp:${dto.email}`, { otp, phone: user.phone }, 300000);

    await this.sendOtpEmail(dto.email, otp);

    return { message: 'OTP sent to email' };
  }
}
