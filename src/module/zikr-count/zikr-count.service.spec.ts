import { Test, TestingModule } from '@nestjs/testing';
import { ZikrCountsService } from './zikr-count.service';
import { PrismaService } from '@prisma';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { NotFoundException } from '@nestjs/common';

const mockZikr = { id: 'zikr-uuid', name: 'Subhanallah', goal: 1000 };

const mockPrisma = {
  zikr: { findFirst: jest.fn() },
  zikrCounts: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  groupZikrActivities: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  group: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
};

const mockWebsocket = {
  server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
};

describe('ZikrCountsService', () => {
  let service: ZikrCountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZikrCountsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebsocketGateway, useValue: mockWebsocket },
      ],
    }).compile();

    service = module.get<ZikrCountsService>(ZikrCountsService);
    jest.clearAllMocks();
  });

  describe('addZikrCountForGroup', () => {
    it('should throw NotFoundException if no zikr found for group', async () => {
      mockPrisma.zikr.findFirst.mockResolvedValue(null);
      await expect(service.addZikrCountForGroup('group-uuid', 10, 'user-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should auto-find zikrId without client providing it', async () => {
      mockPrisma.zikr.findFirst.mockResolvedValue(mockZikr);
      mockPrisma.zikrCounts.findFirst.mockResolvedValue(null); // no existing session record
      mockPrisma.zikrCounts.create.mockResolvedValue({});
      mockPrisma.groupZikrActivities.findFirst.mockResolvedValue(null);
      mockPrisma.groupZikrActivities.create.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'John', surname: 'Doe' });

      await service.addZikrCountForGroup('group-uuid', 10, 'user-uuid');

      expect(mockPrisma.zikr.findFirst).toHaveBeenCalledWith({ where: { groupId: 'group-uuid' }, select: expect.anything() });
      expect(mockPrisma.zikrCounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ zikr_goal_id: 'zikr-uuid', count: 10 }),
        }),
      );
    });

    it('should upsert today session record (increment if exists)', async () => {
      mockPrisma.zikr.findFirst.mockResolvedValue(mockZikr);
      mockPrisma.zikrCounts.findFirst.mockResolvedValue({ id: 'existing-session' }); // existing today
      mockPrisma.zikrCounts.update.mockResolvedValue({});
      mockPrisma.groupZikrActivities.findFirst.mockResolvedValue({ id: 'activity-uuid', zikr_count: 100 });
      mockPrisma.groupZikrActivities.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'John', surname: 'Doe' });

      await service.addZikrCountForGroup('group-uuid', 5, 'user-uuid');

      // Should update, not create
      expect(mockPrisma.zikrCounts.update).toHaveBeenCalledWith({
        where: { id: 'existing-session' },
        data: { count: { increment: 5 } },
      });
      expect(mockPrisma.zikrCounts.create).not.toHaveBeenCalled();
    });

    it('should report goalReached when total >= goal', async () => {
      mockPrisma.zikr.findFirst.mockResolvedValue(mockZikr); // goal: 1000
      mockPrisma.zikrCounts.findFirst.mockResolvedValue(null);
      mockPrisma.zikrCounts.create.mockResolvedValue({});
      mockPrisma.groupZikrActivities.findFirst.mockResolvedValue({ id: 'act', zikr_count: 990 });
      mockPrisma.groupZikrActivities.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'John', surname: 'Doe' });

      const result = await service.addZikrCountForGroup('group-uuid', 10, 'user-uuid');

      expect(result.totalCount).toBe(1000);
      expect(result.goalReached).toBe(true);
    });

    it('should emit WebSocket event after adding count', async () => {
      mockPrisma.zikr.findFirst.mockResolvedValue(mockZikr);
      mockPrisma.zikrCounts.findFirst.mockResolvedValue(null);
      mockPrisma.zikrCounts.create.mockResolvedValue({});
      mockPrisma.groupZikrActivities.findFirst.mockResolvedValue(null);
      mockPrisma.groupZikrActivities.create.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'John', surname: 'Doe' });

      await service.addZikrCountForGroup('group-uuid', 50, 'user-uuid');

      expect(mockWebsocket.server.to).toHaveBeenCalledWith('group:group-uuid');
      expect(mockWebsocket.server.emit).toHaveBeenCalledWith(
        'zikr_count_updated',
        expect.objectContaining({ groupId: 'group-uuid', count: 50 }),
      );
    });
  });
});
