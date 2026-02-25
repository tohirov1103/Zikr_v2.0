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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private generateToken(user: any) {
    const payload = { id: user.userId, role: user.role };
    return this.jwtService.sign(payload);
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

    // TODO: replace '000000' with real OTP generation in production
    const otp = '000000';

    // Cache registration data + OTP for 5 minutes
    await this.cacheManager.set(`register:${registerDto.email}`, {
      otp,
      ...registerDto,
    }, 300000);

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

    // TODO: replace '000000' with real OTP generation in production
    const otp = '000000';

    await this.cacheManager.set(`forgot:${dto.email}`, { otp }, 300000);

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

    // TODO: replace '000000' with real OTP generation in production
    const otp = '000000';

    await this.cacheManager.set(`otp:${dto.email}`, { otp, phone: user.phone }, 300000);

    return { message: 'OTP sent to email' };
  }
}
