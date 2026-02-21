import { Test, TestingModule } from '@nestjs/testing';
import { FinishedPoralarCountService } from './finished-poralar-count.service';
import { PrismaService } from '@prisma';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  groupMembers: { findFirst: jest.fn() },
  finishedPoralarCount: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  bookedPoralar: { deleteMany: jest.fn() },
  group: { findUnique: jest.fn() },
};

const mockWebsocket = {
  server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
};

describe('FinishedPoralarCountService', () => {
  let service: FinishedPoralarCountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinishedPoralarCountService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebsocketGateway, useValue: mockWebsocket },
      ],
    }).compile();

    service = module.get<FinishedPoralarCountService>(FinishedPoralarCountService);
    jest.clearAllMocks();
  });

  describe('createFinishedPoralarCount (completeHatm)', () => {
    it('should throw ForbiddenException if user is not a member', async () => {
      mockPrisma.groupMembers.findFirst.mockResolvedValue(null);
      await expect(
        service.createFinishedPoralarCount({ idGroup: 'group-uuid' }, 'user-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if no FinishedPoralarCount record exists', async () => {
      mockPrisma.groupMembers.findFirst.mockResolvedValue({ group_id: 'group-uuid', user_id: 'user-uuid' });
      mockPrisma.finishedPoralarCount.findFirst.mockResolvedValue(null);
      await expect(
        service.createFinishedPoralarCount({ idGroup: 'group-uuid' }, 'user-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should increment juzCount and delete all BookedPoralar on hatm completion', async () => {
      mockPrisma.groupMembers.findFirst.mockResolvedValue({ group_id: 'group-uuid', user_id: 'user-uuid' });
      mockPrisma.finishedPoralarCount.findFirst.mockResolvedValue({ id: 'fpc-uuid', juzCount: 1 });
      mockPrisma.finishedPoralarCount.update.mockResolvedValue({ id: 'fpc-uuid', juzCount: 2 });
      mockPrisma.bookedPoralar.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.group.findUnique.mockResolvedValue({ name: 'Test Group' });

      await service.createFinishedPoralarCount({ idGroup: 'group-uuid' }, 'user-uuid');

      expect(mockPrisma.finishedPoralarCount.update).toHaveBeenCalledWith({
        where: { id: 'fpc-uuid' },
        data: { juzCount: { increment: 1 } },
      });
      expect(mockPrisma.bookedPoralar.deleteMany).toHaveBeenCalledWith({
        where: { idGroup: 'group-uuid' },
      });
      expect(mockWebsocket.server.emit).toHaveBeenCalledWith(
        'hatm_completed',
        expect.objectContaining({ groupId: 'group-uuid' }),
      );
    });
  });
});
