import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

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
  findOneByPhone: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
};

const mockConfigService = {
  get: jest.fn(),
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

  describe('register', () => {
    it('should throw if email already exists', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      await expect(
        service.register({ name: 'A', surname: 'B', email: mockUser.email, password: '12345', phone: '+998900000000' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if phone already exists', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockUsersService.findOneByPhone.mockResolvedValue(mockUser);
      await expect(
        service.register({ name: 'A', surname: 'B', email: 'new@test.com', password: '12345', phone: mockUser.phone }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cache registration data and return message', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockUsersService.findOneByPhone.mockResolvedValue(null);
      const result = await service.register({ name: 'A', surname: 'B', email: 'new@test.com', password: '12345', phone: '+998900000000' });
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(result.message).toContain('OTP');
    });
  });

  describe('verifyRegistration', () => {
    it('should throw if OTP not in cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      await expect(service.verifyRegistration({ email: 'test@test.com', otp: '000000' })).rejects.toThrow(BadRequestException);
    });

    it('should throw if OTP is wrong', async () => {
      mockCacheManager.get.mockResolvedValue({ otp: '000000', name: 'A', surname: 'B', email: 'a@b.com', password: '12345', phone: '+998900000000' });
      await expect(service.verifyRegistration({ email: 'a@b.com', otp: '999999' })).rejects.toThrow(UnauthorizedException);
    });

    it('should create user on correct OTP', async () => {
      mockCacheManager.get.mockResolvedValue({ otp: '000000', name: 'A', surname: 'B', email: 'a@b.com', password: '12345', phone: '+998900000000' });
      mockUsersService.createUser.mockResolvedValue({ userId: 'new-id', role: 'USER' });
      const result = await service.verifyRegistration({ email: 'a@b.com', otp: '000000' });
      expect(result.token).toBe('mock-token');
      expect(mockCacheManager.del).toHaveBeenCalledWith('register:a@b.com');
    });
  });

  describe('userLogin', () => {
    it('should throw for wrong password', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false as never);
      await expect(
        service.userLogin({ emailOrPhone: mockUser.email, password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should login with email', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true as never);
      const result = await service.userLogin({ emailOrPhone: mockUser.email, password: 'pass' });
      expect(result).toEqual({ message: 'Login successful', token: 'mock-token' });
    });

    it('should login with phone number', async () => {
      mockUsersService.findOneByPhone.mockResolvedValue(mockUser);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true as never);
      const result = await service.userLogin({ emailOrPhone: mockUser.phone, password: 'pass' });
      expect(result).toEqual({ message: 'Login successful', token: 'mock-token' });
    });
  });

  describe('adminLogin', () => {
    it('should throw if user is not ADMIN', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser); // role: USER
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true as never);
      await expect(
        service.adminLogin({ emailOrPhone: mockUser.email, password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should throw if email not found', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      await expect(service.forgotPassword({ email: 'nope@test.com' })).rejects.toThrow(NotFoundException);
    });

    it('should cache OTP and return message', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      const result = await service.forgotPassword({ email: mockUser.email });
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(result.message).toContain('OTP');
    });
  });

  describe('resetPassword', () => {
    it('should throw if OTP expired', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      await expect(service.resetPassword({ email: 'a@b.com', otp: '000000', newPassword: '12345' })).rejects.toThrow(BadRequestException);
    });

    it('should throw if OTP wrong', async () => {
      mockCacheManager.get.mockResolvedValue({ otp: '000000' });
      await expect(service.resetPassword({ email: 'a@b.com', otp: '999999', newPassword: '12345' })).rejects.toThrow(UnauthorizedException);
    });

    it('should update password on correct OTP', async () => {
      mockCacheManager.get.mockResolvedValue({ otp: '000000' });
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      mockUsersService.updateUser.mockResolvedValue({});
      const result = await service.resetPassword({ email: mockUser.email, otp: '000000', newPassword: 'newpass' });
      expect(mockUsersService.updateUser).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalledWith(`forgot:${mockUser.email}`);
      expect(result.message).toContain('yangilandi');
    });
  });
});
