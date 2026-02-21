import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PasswordHasher } from '@common';
import { LoginDto, RegisterDto, SendOtpDto } from './dto';
import { Role } from '@prisma/client';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as otpGenerator from 'otp-generator';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await PasswordHasher.comparePassword(password, user.password))) {
      const { password: _pw, ...userData } = user;
      return userData;
    }
    return null;
  }

  private generateToken(user: any) {
    const payload = { id: user.userId, role: user.role };
    return this.jwtService.sign(payload);
  }

  async sendOtp(dto: SendOtpDto) {
    const user = await this.usersService.findOneByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    // TTL in milliseconds: 5 minutes
    await this.cacheManager.set(`otp:${dto.email}`, { otp, phone: user.phone }, 300000);

    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: Number(this.configService.get<string>('mail.port')),
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
    });

    await transporter.sendMail({
      from: this.configService.get<string>('mail.user'),
      to: dto.email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}. It expires in 5 minutes.`,
    });

    return { message: 'OTP sent to email' };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findOneByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await PasswordHasher.hashPassword(registerDto.password);
    const newUser = await this.usersService.createUser({
      ...registerDto,
      password: hashedPassword
    });

    const token = this.generateToken(newUser);

    this.websocketGateway.server.emit('newUserRegistered', { user: newUser });

    return { message: 'Registration successful', user: newUser, token };
  }

  async userLogin(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.role !== Role.USER) {
      throw new UnauthorizedException('Unauthorized role access');
    }

    const cached = await this.cacheManager.get<{ otp: string; phone: string }>(`otp:${loginDto.email}`);
    if (!cached) {
      throw new UnauthorizedException('OTP not found or expired. Please request a new OTP.');
    }

    if (cached.otp !== loginDto.otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    if (user.phone !== cached.phone) {
      throw new UnauthorizedException('Phone number mismatch');
    }

    await this.cacheManager.del(`otp:${loginDto.email}`);

    const token = this.generateToken(user);

    this.websocketGateway.server.emit('userLoggedIn', { user });

    return { message: 'Login successful', token };
  }

  async adminLogin(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.role !== Role.ADMIN) {
      throw new UnauthorizedException('Unauthorized role access');
    }

    const token = this.generateToken(user);

    return { message: 'Login successful', token };
  }
}
