import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@prisma';
import { Group, GroupType, Role } from '@prisma/client';
import { CreateGroupDto, UpdateGroupDto } from './dto';

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) { }

  async createGroup(adminId: string, createGroupDto: CreateGroupDto): Promise<Group> {
    // Step 1: Create the group
    const group = await this.prisma.group.create({
      data: {
        ...createGroupDto,
        admin: { connect: { userId: adminId } }, // Connect the existing User by userId
      },
    });

    // Step 2: Automatically add the admin as GroupAdmin in GroupMembers
    await this.prisma.groupMembers.create({
      data: {
        group_id: group.idGroup,
        user_id: adminId,
        role: Role.GroupAdmin,  // Set the role as GroupAdmin
        joined_at: new Date(),
      },
    });

    // Step 3: Initialize the finishedPoralarCount for the new group
    await this.prisma.finishedPoralarCount.create({
      data: {
        idGroup: group.idGroup,
        juzCount: 0,  // Set the initial count to 0
      },
    });

    return group;
  }

  // Fetch user's public groups
  // async getUserPublicGroups(userId: string): Promise<Group[]> {
  //   return this.prisma.group.findMany({
  //     where: {
  //       isPublic: true,
  //       OR: [
  //         { adminId: userId },  // Groups where the user is the admin
  //         { members: { some: { user_id: userId } } },  // Groups where the user is a member
  //       ],
  //     },
  //   });
  // }

  // Fetch user's private groups
  // async getUserPrivateGroups(userId: string): Promise<Group[]> {
  //   return this.prisma.group.findMany({
  //     where: {
  //       isPublic: false,
  //       OR: [
  //         { adminId: userId },  // Private groups where the user is the admin
  //         { members: { some: { user_id: userId } } },  // Private groups where the user is a member
  //       ],
  //     },
  //   });
  // }

  async updateGroup(idGroup: string, updateGroupDto: UpdateGroupDto, userId: string): Promise<Group> {
    const group = await this.prisma.group.findUnique({
      where: { idGroup },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isAuthorized = await this.isUserGroupAdminOrGroupAdmin(idGroup, userId);
    if (!isAuthorized) {
      throw new ForbiddenException('You are not authorized to update this group');
    }

    return this.prisma.group.update({
      where: { idGroup },
      data: updateGroupDto,
    });
  }

  async deleteGroup(idGroup: string, userId: string): Promise<void> {
    const group = await this.prisma.group.findUnique({
      where: { idGroup },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if the user is the GroupAdmin or a GroupMember
    const groupMember = await this.prisma.groupMembers.findUnique({
      where: {
        group_id_user_id: {
          group_id: idGroup,
          user_id: userId,
        },
      },
      select: { role: true },
    });

    if (!groupMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    // If the user is the GroupAdmin (actual admin), delete the entire group
    if (groupMember.role === Role.GroupAdmin) {
      await this.prisma.group.delete({
        where: { idGroup },
      });
    } else {
      // If the user is a GroupMember, remove them from the group
      await this.prisma.groupMembers.delete({
        where: {
          group_id_user_id: {
            group_id: idGroup,
            user_id: userId,
          },
        },
      });
    }
  }


  async getGroupById(idGroup: string): Promise<Group> {
    const group = await this.prisma.group.findUnique({
      where: { idGroup },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  async getAllGroups(): Promise<Group[]> {
    return this.prisma.group.findMany();
  }

  // Subscribe a user to a group
  async subscribeUser(userId: string, groupId: string): Promise<{ message: string }> {
    // Step 1: Check if the user is already subscribed
    const existingSubscription = await this.prisma.groupMembers.findUnique({
      where: {
        group_id_user_id: {
          group_id: groupId,
          user_id: userId,
        },
      },
    });

    if (existingSubscription) {
      throw new BadRequestException('User already subscribed to the group');
    }

    // Step 2: Subscribe the user to the group
    await this.prisma.groupMembers.create({
      data: {
        group_id: groupId,
        user_id: userId,
        role: Role.USER, // Default role for members
        joined_at: new Date(),
      },
    });

    return {
      message: 'User subscribed to the group',
    };
  }

  // Method to fetch group details including group profile and members
  async showGroupDetails(groupId: string) {
    // Step 1: Fetch group profile information
    const groupProfile = await this.prisma.group.findUnique({
      where: {
        idGroup: groupId,
      },
      select: {
        name: true,
        kimga: true,
        hatmSoni: true,
      },
    });

    // Check if group exists
    if (!groupProfile) {
      throw new NotFoundException('Group not found');
    }

    // Step 2: Fetch group members (subscribers)
    const subscribers = await this.prisma.groupMembers.findMany({
      where: {
        group_id: groupId,
      },
      select: {
        user: {
          select: {
            name:true,
            surname:true,
            phone: true,
          },
        },
      },
    });

    // Combine the group profile and subscribers information
    const response = {
      groupProfile,
      subscribers: subscribers.map(member => ({
        name: member.user.name,
        surname:member.user.surname,
        phone: member.user.phone,
      })),
    };

    return {
      status: "200",
      message: "Success",
      data: response,
    };
  }

  async getGroupsByTypeForUser(userId: string, groupType: GroupType): Promise<Group[]> {
    return this.prisma.group.findMany({
      where: {
        groupType: groupType,
        OR: [
          { adminId: userId },  // Groups where the user is the admin
          { members: { some: { user_id: userId } } },  // Groups where the user is a member
        ],
      },
    });
  }

  async getUserPublicGroups(userId: string, groupType?: GroupType): Promise<any[]> {
    const groupFilter = groupType ? { groupType } : {}; // Filter by groupType if provided
  
    // Fetch the groups along with the Zikr progress from GroupZikrActivities
    const publicGroups = await this.prisma.group.findMany({
      where: {
        isPublic: true,
        OR: [
          { adminId: userId },  // Groups where the user is the admin
          { members: { some: { user_id: userId } } },  // Groups where the user is a member
        ],
        ...groupFilter, // Apply the group type filter if provided
      },
      include: {
        zikrActivities: {
          include: {
            zikr: {
              select: {
                name: true,
                goal: true,
              },
            },
          },
        },
      },
    });
  
    // Process groups and add Zikr progress calculation
    return publicGroups.map(group => {
      const zikrProgress = group.groupType === GroupType.ZIKR ? group.zikrActivities.map(activity => ({
        zikrName: activity.zikr.name,
        zikrCount: activity.zikr_count,
        goal: activity.zikr.goal,
        progress: (activity.zikr_count / activity.zikr.goal) * 100, // Calculate percentage progress
      })) : [];
  
      return {
        groupId: group.idGroup,
        groupName: group.name,
        groupType: group.groupType,
        zikrProgress,
      };
    });
  }
  

  async getUserPrivateGroups(userId: string, groupType?: GroupType): Promise<any[]> {
    const groupFilter = groupType ? { groupType } : {}; // Filter by groupType if provided
  
    // Fetch the groups along with the Zikr progress from GroupZikrActivities
    const privateGroups = await this.prisma.group.findMany({
      where: {
        isPublic: false,
        OR: [
          { adminId: userId },  // Private groups where the user is the admin
          { members: { some: { user_id: userId } } },  // Private groups where the user is a member
        ],
        ...groupFilter, // Apply the group type filter if provided
      },
      include: {
        zikrActivities: {
          include: {
            zikr: {
              select: {
                name: true,
                goal: true,
              },
            },
          },
        },
      },
    });
  
    // Process groups and add Zikr progress calculation
    return privateGroups.map(group => {
      const zikrProgress = group.groupType === GroupType.ZIKR ? group.zikrActivities.map(activity => ({
        zikrName: activity.zikr.name,
        zikrCount: activity.zikr_count,
        goal: activity.zikr.goal,
        progress: (activity.zikr_count / activity.zikr.goal) * 100, // Calculate percentage progress
      })) : [];
  
      return {
        groupId: group.idGroup,
        groupName: group.name,
        groupType: group.groupType,
        zikrProgress,
      };
    });
  }
  
  
  
  

  private async isUserGroupAdminOrGroupAdmin(idGroup: string, userId: string): Promise<boolean> {
    const group = await this.prisma.group.findUnique({
      where: { idGroup },
    });

    if (!group) {
      return false;
    }

    if (group.adminId === userId) {
      return true; // User is the admin of the group
    }

    const groupMember = await this.prisma.groupMembers.findUnique({
      where: {
        group_id_user_id: {
          group_id: idGroup,
          user_id: userId,
        },
      },
      select: { role: true },
    });

    return groupMember?.role === Role.GroupAdmin;
  }

}
