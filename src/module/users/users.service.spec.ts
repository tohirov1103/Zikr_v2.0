import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '@prisma';
import { NotFoundException } from '@nestjs/common';

const mockUser = {
  userId: 'user-uuid',
  email: 'test@example.com',
  phone: '+998901234567',
  name: 'John',
  surname: 'Doe',
  role: 'USER',
  password: 'hashed',
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  group: {
    count: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.group.count.mockResolvedValue(0);
      await expect(service.getUserById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return user with quranGroupCount and zikrGroupCount', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.group.count
        .mockResolvedValueOnce(3)  // quranGroupCount
        .mockResolvedValueOnce(2); // zikrGroupCount

      const result = await service.getUserById('user-uuid');
      expect(result).toMatchObject({
        userId: mockUser.userId,
        quranGroupCount: 3,
        zikrGroupCount: 2,
      });
    });

    it('should query group counts with correct groupType filters', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.group.count.mockResolvedValue(0);

      await service.getUserById('user-uuid');

      expect(mockPrisma.group.count).toHaveBeenCalledTimes(2);
      const calls = mockPrisma.group.count.mock.calls;
      expect(calls[0][0]).toMatchObject({ where: { groupType: 'QURAN' } });
      expect(calls[1][0]).toMatchObject({ where: { groupType: 'ZIKR' } });
    });
  });

  describe('deleteUser', () => {
    it('should delete user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.group.count.mockResolvedValue(0);
      mockPrisma.user.delete.mockResolvedValue(mockUser);
      await service.deleteUser('user-uuid');
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { userId: 'user-uuid' } });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.group.count.mockResolvedValue(0);
      await expect(service.deleteUser('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
