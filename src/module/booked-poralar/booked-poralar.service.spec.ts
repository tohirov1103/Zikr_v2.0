import { Test, TestingModule } from '@nestjs/testing';
import { BookedPoralarService } from './booked-poralar.service';
import { PrismaService } from '@prisma';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockBooking = {
  id: 'booking-uuid',
  poraId: 'pora-uuid',
  idGroup: 'group-uuid',
  userId: 'user-uuid',
  isBooked: true,
  isDone: false,
  pora: { id: 'pora-uuid', name: 'Juz 1' },
  user: { userId: 'user-uuid', name: 'John', surname: 'Doe', image_url: null, phone: '+998901234567' },
};

const mockPrisma = {
  bookedPoralar: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  finishedPoralarCount: { findFirst: jest.fn() },
  user: { findUnique: jest.fn() },
  group: { findUnique: jest.fn() },
  groupMembers: { findUnique: jest.fn() },
};

const mockWebsocket = {
  server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
};

describe('BookedPoralarService', () => {
  let service: BookedPoralarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookedPoralarService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebsocketGateway, useValue: mockWebsocket },
      ],
    }).compile();

    service = module.get<BookedPoralarService>(BookedPoralarService);
    jest.clearAllMocks();
  });

  describe('createBookedPoralar', () => {
    it('should hardcode isBooked=true and isDone=false', async () => {
      mockPrisma.bookedPoralar.create.mockResolvedValue(mockBooking);

      await service.createBookedPoralar({ idGroup: 'group-uuid', poraId: 'pora-uuid' }, 'user-uuid');

      expect(mockPrisma.bookedPoralar.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isBooked: true, isDone: false }),
        }),
      );
    });

    it('should include user info in create include', async () => {
      mockPrisma.bookedPoralar.create.mockResolvedValue(mockBooking);

      await service.createBookedPoralar({ idGroup: 'group-uuid', poraId: 'pora-uuid' }, 'user-uuid');

      const call = mockPrisma.bookedPoralar.create.mock.calls[0][0];
      expect(call.include.user.select).toMatchObject({
        userId: true,
        name: true,
        surname: true,
        image_url: true,
        phone: true,
      });
    });
  });

  describe('getBookedPoralarById', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrisma.bookedPoralar.findUnique.mockResolvedValue(null);
      await expect(service.getBookedPoralarById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should include user info in response', async () => {
      mockPrisma.bookedPoralar.findUnique.mockResolvedValue(mockBooking);
      await service.getBookedPoralarById('booking-uuid');
      const call = mockPrisma.bookedPoralar.findUnique.mock.calls[0][0];
      expect(call.include).toMatchObject({
        user: { select: { userId: true, name: true, image_url: true, phone: true } },
      });
    });
  });

  describe('updateBookedPoralar', () => {
    it('should throw ForbiddenException if not the booking owner', async () => {
      mockPrisma.bookedPoralar.findUnique.mockResolvedValue({ ...mockBooking, userId: 'other-user' });
      await expect(
        service.updateBookedPoralar('booking-uuid', { isDone: true }, 'user-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
