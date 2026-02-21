import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({}),
  }),
}));

jest.mock('otp-generator', () => ({
  generate: jest.fn().mockReturnValue('123456'),
}));

const mockUser = {
  userId: 'user-uuid',
  email: 'test@example.com',
  phone: '+998901234567',
  name: 'John',
  surname: 'Doe',
  role: 'USER',
  password: 'hashed_password',
};

const mockUsersService = {
  findOneByEmail: jest.fn(),
  createUser: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const cfg: any = {
      'mail.host': 'smtp.test.com',
      'mail.port': '587',
      'mail.user': 'test@mail.com',
      'mail.pass': 'pass',
    };
    return cfg[key];
  }),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockWebsocketGateway = {
  server: { emit: jest.fn(), to: jest.fn().mockReturnThis() },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: WebsocketGateway, useValue: mockWebsocketGateway },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('sendOtp', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      await expect(service.sendOtp({ email: 'notfound@test.com' })).rejects.toThrow(NotFoundException);
    });

    it('should generate OTP, cache it, and send email', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      const result = await service.sendOtp({ email: 'test@example.com' });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'otp:test@example.com',
        { otp: '123456', phone: mockUser.phone },
        300000,
      );
      expect(result).toEqual({ message: 'OTP sent to email' });
    });
  });

  describe('userLogin', () => {
    it('should throw UnauthorizedException for wrong password', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false as never);
      await expect(
        service.userLogin({ email: mockUser.email, password: 'wrong', otp: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if OTP not in cache', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true as never);
      mockCacheManager.get.mockResolvedValue(null);
      await expect(
        service.userLogin({ email: mockUser.email, password: 'pass', otp: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if OTP is wrong', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true as never);
      mockCacheManager.get.mockResolvedValue({ otp: '999999', phone: mockUser.phone });
      await expect(
        service.userLogin({ email: mockUser.email, password: 'pass', otp: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if phone mismatches', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true as never);
      mockCacheManager.get.mockResolvedValue({ otp: '123456', phone: '+998000000000' });
      await expect(
        service.userLogin({ email: mockUser.email, password: 'pass', otp: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token on valid credentials + OTP + phone match', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true as never);
      mockCacheManager.get.mockResolvedValue({ otp: '123456', phone: mockUser.phone });
      const result = await service.userLogin({ email: mockUser.email, password: 'pass', otp: '123456' });
      expect(mockCacheManager.del).toHaveBeenCalledWith(`otp:${mockUser.email}`);
      expect(result).toEqual({ message: 'Login successful', token: 'mock-token' });
    });
  });

  describe('adminLogin', () => {
    it('should throw UnauthorizedException if user is not ADMIN', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser); // role: USER
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true as never);
      await expect(
        service.adminLogin({ email: mockUser.email, password: 'pass', otp: '000000' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
