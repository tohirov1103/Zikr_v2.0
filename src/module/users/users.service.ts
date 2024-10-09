import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) { }

  async findOneByEmail(email: string) {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    return user;
  }

  async findOneByPhone(phone: string) {
    const user = await this.prismaService.user.findUnique({ where: { phone } });
    return user;
  }

  async createUser(registerDto: CreateUserDto) {
    const user = await this.findOneByEmail(registerDto.email);
    if (user) {
      throw new BadRequestException("Email already exists");
    }

    const phone = await this.findOneByPhone(registerDto.phone);
    if (phone) {
      throw new BadRequestException("Phone already exists");
    }
    return await this.prismaService.user.create({
      data: { ...registerDto }
    });
  }

  async getUserById(id: string) {
    const user = await this.prismaService.user.findUnique({ where: { userId: id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getAllUsers() {
    return await this.prismaService.user.findMany();
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    await this.getUserById(id);
    return await this.prismaService.user.update({
      where: { userId: id },
      data: { ...updateUserDto },
    });
  }

  async deleteUser(id: string) {
    await this.getUserById(id);
    return await this.prismaService.user.delete({
      where: {
        userId: id
      }
    })
  }
  async findUserByPhone(phone: string) {
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    console.log("Phone number received:", phone);

    // Use Prisma to find user by phone
    const user = await this.prismaService.user.findUnique({
      where: {
        phone,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    console.log("User found:", user);

    return {
      status: "200",
      message: "Success",
      data: user,
    };
  }
}
