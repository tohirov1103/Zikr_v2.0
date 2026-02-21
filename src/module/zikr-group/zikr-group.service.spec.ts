import { Test, TestingModule } from '@nestjs/testing';
import { ZikrGroupService } from './zikr-group.service';
import { PrismaService } from '@prisma';
import { NotFoundException } from '@nestjs/common';

const mockGroup = {
  idGroup: 'group-uuid',
  name: 'Zikr Group',
  isPublic: true,
  kimga: null,
  hatmSoni: 0,
  adminId: 'admin-uuid',
  groupType: 'ZIKR',
  guruhImg: null,
  created_at: new Date(),
};

const mockZikr = {
  id: 'zikr-uuid',
  name: 'Subhanallah',
  desc: '',
  hint: null,
  body: 'سُبْحَانَ اللَّهِ',
  goal: 1000,
  groupId: 'group-uuid',
};

const mockPrisma = {
  group: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  groupMembers: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  zikr: {
    create: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  groupZikrActivities: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  zikrCounts: {
    groupBy: jest.fn(),
  },
};

describe('ZikrGroupService', () => {
  let service: ZikrGroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZikrGroupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ZikrGroupService>(ZikrGroupService);
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create group, add admin, create zikr, and create activity', async () => {
      mockPrisma.group.create.mockResolvedValue(mockGroup);
      mockPrisma.groupMembers.create.mockResolvedValue({});
      mockPrisma.zikr.create.mockResolvedValue(mockZikr);
      mockPrisma.groupZikrActivities.create.mockResolvedValue({});

      const dto = {
        name: 'Zikr Group',
        isPublic: true,
        zikrName: 'Subhanallah',
        zikrBody: 'سُبْحَانَ اللَّهِ',
        goalZikrCount: 1000,
      };

      const result = await service.createGroup('admin-uuid', dto as any);

      expect(mockPrisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ groupType: 'ZIKR', hatmSoni: 0 }),
        }),
      );
      expect(mockPrisma.zikr.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ goal: 1000 }),
        }),
      );
      expect(mockPrisma.groupZikrActivities.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ zikr_count: 0 }),
        }),
      );
      expect(result).toEqual({ group: mockGroup, zikr: mockZikr });
    });
  });

  describe('getGroupById', () => {
    it('should throw NotFoundException if group not found', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null);
      await expect(service.getGroupById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should compute cycleCount and currentZikrCount correctly', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({
        ...mockGroup,
        admin: { userId: 'admin-uuid', name: 'Admin', surname: 'User', phone: '+998901234567' },
        members: [
          { user_id: 'user-1', role: 'GroupAdmin', user: { userId: 'user-1', image_url: null, name: 'Admin', surname: 'A', phone: '+998901234567' } },
          { user_id: 'user-2', role: 'USER', user: { userId: 'user-2', image_url: null, name: 'Member', surname: 'B', phone: '+998901234568' } },
        ],
        zikr: [{ id: 'zikr-uuid', name: 'Subhanallah', goal: 1000 }],
        zikrActivities: [{ zikr_count: 2500 }], // 2 full cycles + 500
      });
      mockPrisma.zikrCounts.groupBy.mockResolvedValue([]);

      const result = await service.getGroupById('group-uuid');

      expect(result.cycleCount).toBe(2);         // floor(2500 / 1000)
      expect(result.currentZikrCount).toBe(500); // 2500 % 1000
      expect(result.userZikrCount).toBe(500);    // ceil(1000 / 2)
    });
  });

  describe('getMyGroups', () => {
    it('should split groups into adminGroups and memberGroups', async () => {
      mockPrisma.group.findMany.mockResolvedValue([
        {
          ...mockGroup,
          adminId: 'user-uuid',
          admin: { userId: 'user-uuid', name: 'John', phone: '+998901234567' },
          zikr: [{ name: 'Subhanallah', goal: 1000 }],
          zikrActivities: [{ zikr_count: 300 }],
        },
        {
          ...mockGroup,
          idGroup: 'group-uuid-2',
          adminId: 'other-uuid',
          admin: { userId: 'other-uuid', name: 'Jane', phone: '+998901234568' },
          zikr: [{ name: 'Alhamdulillah', goal: 500 }],
          zikrActivities: [{ zikr_count: 100 }],
        },
      ]);

      const result = await service.getMyGroups('user-uuid');
      expect(result.adminGroups).toHaveLength(1);
      expect(result.memberGroups).toHaveLength(1);
      expect(result.adminGroups[0].currentZikrCount).toBe(300); // 300 % 1000
    });
  });
});
