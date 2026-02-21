import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notifications.service';
import { PrismaService } from '@prisma';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

const mockNotification = {
  id: 'notif-uuid',
  senderId: 'sender-uuid',
  receiverId: 'receiver-uuid',
  groupId: 'group-uuid',
  status: 'PENDING',
  isInvite: true,
  isRead: false,
  time: new Date(),
  sender: { name: 'John', surname: 'Doe', image_url: null },
  group: { name: 'Test Group' },
};

const mockPrisma = {
  notifications: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  groupMembers: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockWebsocket = {
  server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebsocketGateway, useValue: mockWebsocket },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  describe('createInvite', () => {
    it('should throw ConflictException if PENDING invite already exists', async () => {
      mockPrisma.notifications.findFirst.mockResolvedValue(mockNotification);
      await expect(
        service.createInvite('sender-uuid', { receiverId: 'receiver-uuid', groupId: 'group-uuid' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create invite with isInvite=true and status=PENDING', async () => {
      mockPrisma.notifications.findFirst.mockResolvedValue(null);
      mockPrisma.notifications.create.mockResolvedValue(mockNotification);

      await service.createInvite('sender-uuid', { receiverId: 'receiver-uuid', groupId: 'group-uuid' });

      expect(mockPrisma.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isInvite: true, status: 'PENDING' }),
        }),
      );
    });

    it('should emit new_invitation WebSocket event to receiver', async () => {
      mockPrisma.notifications.findFirst.mockResolvedValue(null);
      mockPrisma.notifications.create.mockResolvedValue(mockNotification);

      await service.createInvite('sender-uuid', { receiverId: 'receiver-uuid', groupId: 'group-uuid' });

      expect(mockWebsocket.server.to).toHaveBeenCalledWith('user:receiver-uuid');
      expect(mockWebsocket.server.emit).toHaveBeenCalledWith('new_invitation', expect.anything());
    });
  });

  describe('getPendingInvitesForUser', () => {
    it('should only return PENDING invites', async () => {
      mockPrisma.notifications.findMany.mockResolvedValue([mockNotification]);
      await service.getPendingInvitesForUser('receiver-uuid');
      expect(mockPrisma.notifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });
  });

  describe('acceptInvite', () => {
    it('should throw NotFoundException if notification not found', async () => {
      mockPrisma.notifications.findUnique.mockResolvedValue(null);
      await expect(service.acceptInvite('nonexistent', 'user-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if receiver does not match current user', async () => {
      mockPrisma.notifications.findUnique.mockResolvedValue({
        ...mockNotification,
        receiverId: 'other-user',
      });
      await expect(service.acceptInvite('notif-uuid', 'receiver-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if status is not PENDING', async () => {
      mockPrisma.notifications.findUnique.mockResolvedValue({
        ...mockNotification,
        status: 'ACCEPTED',
      });
      await expect(service.acceptInvite('notif-uuid', 'receiver-uuid')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should add user to GroupMembers and set status to ACCEPTED', async () => {
      mockPrisma.notifications.findUnique.mockResolvedValue(mockNotification);
      mockPrisma.groupMembers.findUnique.mockResolvedValue(null); // not yet a member
      mockPrisma.groupMembers.create.mockResolvedValue({});
      mockPrisma.notifications.update.mockResolvedValue({ ...mockNotification, status: 'ACCEPTED' });

      await service.acceptInvite('notif-uuid', 'receiver-uuid');

      expect(mockPrisma.groupMembers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ group_id: 'group-uuid', user_id: 'receiver-uuid', role: 'USER' }),
        }),
      );
      expect(mockPrisma.notifications.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACCEPTED' }),
        }),
      );
    });

    it('should not add to GroupMembers if already a member', async () => {
      mockPrisma.notifications.findUnique.mockResolvedValue(mockNotification);
      mockPrisma.groupMembers.findUnique.mockResolvedValue({ group_id: 'group-uuid', user_id: 'receiver-uuid' }); // already member
      mockPrisma.notifications.update.mockResolvedValue({ ...mockNotification, status: 'ACCEPTED' });

      await service.acceptInvite('notif-uuid', 'receiver-uuid');

      expect(mockPrisma.groupMembers.create).not.toHaveBeenCalled();
    });
  });

  describe('ignoreInvite', () => {
    it('should set status to IGNORED', async () => {
      mockPrisma.notifications.findUnique.mockResolvedValue(mockNotification);
      mockPrisma.notifications.update.mockResolvedValue({ ...mockNotification, status: 'IGNORED' });

      await service.ignoreInvite('notif-uuid', 'receiver-uuid');

      expect(mockPrisma.notifications.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'IGNORED' }),
        }),
      );
    });

    it('should throw ForbiddenException if user is not the receiver', async () => {
      mockPrisma.notifications.findUnique.mockResolvedValue({
        ...mockNotification,
        receiverId: 'other-user',
      });
      await expect(service.ignoreInvite('notif-uuid', 'receiver-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
