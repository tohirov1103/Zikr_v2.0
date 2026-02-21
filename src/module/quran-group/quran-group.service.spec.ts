import { Test, TestingModule } from '@nestjs/testing';
import { QuranGroupService } from './quran-group.service';
import { PrismaService } from '@prisma';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockGroup = {
  idGroup: 'group-uuid',
  name: 'Test Quran Group',
  isPublic: true,
  kimga: null,
  hatmSoni: 1,
  adminId: 'admin-uuid',
  groupType: 'QURAN',
  guruhImg: null,
  created_at: new Date(),
};

const mockPrisma = {
  group: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  groupMembers: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  finishedPoralarCount: {
    create: jest.fn(),
  },
  poralar: {
    findMany: jest.fn(),
  },
  bookedPoralar: {
    findMany: jest.fn(),
  },
};

describe('QuranGroupService', () => {
  let service: QuranGroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuranGroupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<QuranGroupService>(QuranGroupService);
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create group, add admin to members, and initialize FinishedPoralarCount', async () => {
      mockPrisma.group.create.mockResolvedValue(mockGroup);
      mockPrisma.groupMembers.create.mockResolvedValue({});
      mockPrisma.finishedPoralarCount.create.mockResolvedValue({});

      const dto = { name: 'Test Quran Group', isPublic: true, hatmSoni: 1 };
      const result = await service.createGroup('admin-uuid', dto as any);

      expect(mockPrisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ groupType: 'QURAN' }),
        }),
      );
      expect(mockPrisma.groupMembers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'GroupAdmin', user_id: 'admin-uuid' }),
        }),
      );
      expect(mockPrisma.finishedPoralarCount.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ juzCount: 0 }) }),
      );
      expect(result).toEqual(mockGroup);
    });
  });

  describe('getMyGroups', () => {
    it('should split groups into adminGroups and memberGroups', async () => {
      const adminGroup = {
        ...mockGroup,
        adminId: 'user-uuid',
        admin: { userId: 'user-uuid', name: 'John', phone: '+998901234567' },
        finishedPoralarCounts: [{ juzCount: 2 }],
      };
      const memberGroup = {
        ...mockGroup,
        idGroup: 'group-uuid-2',
        adminId: 'other-uuid',
        admin: { userId: 'other-uuid', name: 'Jane', phone: '+998901234568' },
        finishedPoralarCounts: [{ juzCount: 0 }],
      };

      mockPrisma.group.findMany.mockResolvedValue([adminGroup, memberGroup]);

      const result = await service.getMyGroups('user-uuid');

      expect(result.adminGroups).toHaveLength(1);
      expect(result.memberGroups).toHaveLength(1);
      expect(result.adminGroups[0].completedHatmCount).toBe(2);
      expect(result.memberGroups[0].completedHatmCount).toBe(0);
    });
  });

  describe('getGroupById', () => {
    it('should throw NotFoundException if group not found', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null);
      await expect(service.getGroupById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return group with poralar status', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({
        ...mockGroup,
        admin: { userId: 'admin-uuid', name: 'Admin', surname: 'User', phone: '+998901234567' },
        members: [],
        finishedPoralarCounts: [{ juzCount: 1 }],
      });
      mockPrisma.poralar.findMany.mockResolvedValue([
        { id: 'pora-1', name: 'Juz 1', created_at: new Date() },
        { id: 'pora-2', name: 'Juz 2', created_at: new Date() },
      ]);
      // First call: poralar with booking status (include user)
      mockPrisma.bookedPoralar.findMany
        .mockResolvedValueOnce([
          { poraId: 'pora-1', isDone: false, id: 'booking-1', userId: 'user-uuid',
            user: { userId: 'user-uuid', name: 'John', image_url: null, phone: '+998901234567' } },
        ])
        // Second call: member bookings (include pora)
        .mockResolvedValueOnce([
          { poraId: 'pora-1', id: 'booking-1', userId: 'user-uuid',
            pora: { id: 'pora-1', name: 'Juz 1' } },
        ]);

      const result = await service.getGroupById('group-uuid');

      expect(result.poralar).toHaveLength(2);
      expect(result.poralar[0].status).toBe('Booked');
      expect(result.poralar[1].status).toBe('Available');
      expect(result.completedHatmCount).toBe(1);
    });
  });

  describe('updateGroup', () => {
    it('should throw ForbiddenException if not group admin', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({ ...mockGroup, adminId: 'other-uuid' });
      mockPrisma.groupMembers.findUnique.mockResolvedValue({ role: 'USER' });
      await expect(service.updateGroup('group-uuid', { name: 'New Name' }, 'user-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
