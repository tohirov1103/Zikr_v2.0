// src/websocket/websocket.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@prisma';
import { Injectable, UseGuards } from '@nestjs/common';
import { instrument } from '@socket.io/admin-ui';
import { WebSocketRateLimitGuard } from '../../guards/websocket-rate-limit.guard';
import { 
    NotificationPayload, 
    UserConnection, 
    WebSocketError,
    GroupEventPayload,
    PoraEventPayload,
    ZikrEventPayload 
} from './interfaces/websocket.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
@WebSocketGateway({
    cors: {
        origin: true, // Allow all origins for testing
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['authorization', 'content-type']
    },
    namespace: '/zikr-app',
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly connectedUsers = new Map<string, string>(); // userId -> socketId
    private readonly userConnections = new Map<string, UserConnection>();

    constructor(
        private readonly jwtService: JwtService,
        private readonly prismaService: PrismaService,
        private readonly configService: ConfigService
    ) {
        if (process.env.NODE_ENV === 'development') {
            instrument(this.server, {
                auth: {
                    type: 'basic',
                    username: process.env.SOCKET_ADMIN_USER || 'admin',
                    password: process.env.SOCKET_ADMIN_PASS || 'changeit'
                },
                mode: 'development'
            });
        }
    }

    private handleError(client: Socket, message: string, error?: any) {
        const errorResponse: WebSocketError = {
            message,
            error: error?.message || 'Unknown error',
            code: error?.code || 'UNKNOWN_ERROR',
            timestamp: new Date()
        };
        
        console.error(`Error for client ${client.id}:`, errorResponse);
        client.emit('error', errorResponse);
    }

    private updateUserConnection(userId: string, socketId: string, update: Partial<UserConnection>) {
        const existing = this.userConnections.get(userId) || {
            socketId,
            lastActive: new Date(),
            groups: new Set<string>(),
            isAuthenticated: false
        };
        
        this.userConnections.set(userId, { ...existing, ...update });
    }

    async handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
        console.log('Handshake headers:', client.handshake.headers);
        console.log('Handshake auth:', client.handshake.auth);

        try {
            const token = client.handshake.auth.token ||
                client.handshake.headers.authorization?.split(' ')[1];

            console.log('Extracted token:', token ? 'Token exists' : 'No token found');

            if (!token) {
                console.log('No token provided, disconnecting client');
                this.handleError(client, 'Authentication token required');
                client.disconnect();
                return;
            }

            try {
                // Use the JWT secret from the config service
                const jwtSecret = this.configService.get<string>('jwt.secret');
                console.log('Using JWT secret:', jwtSecret ? 'Secret exists' : 'No secret found');
                
                const payload = this.jwtService.verify(token, {
                    secret: jwtSecret
                });
                console.log('JWT verification successful, payload:', payload);
                const userId = payload.id;

                this.connectedUsers.set(userId, client.id);
                this.updateUserConnection(userId, client.id, { 
                    isAuthenticated: true,
                    lastActive: new Date()
                });

                client.join(`user:${userId}`);

                client.emit('connection_status', {
                    status: 'connected',
                    userId,
                    timestamp: new Date()
                });
            } catch (jwtError) {
                console.error('JWT verification failed:', jwtError);
                this.handleError(client, 'Invalid token', jwtError);
                client.disconnect();
            }
        } catch (error) {
            console.error('Connection handling error:', error);
            this.handleError(client, 'Connection failed', error);
            client.disconnect();
        }
    }

    async handleDisconnect(client: Socket) {
        const userId = this.getUserIdFromSocket(client.id);
        if (userId) {
            const userConnection = this.userConnections.get(userId);
            if (userConnection) {
                // Notify all groups user was in
                for (const groupId of userConnection.groups) {
                    this.server.to(`group:${groupId}`).emit('user_offline', {
                        groupId,
                        userId,
                        timestamp: new Date()
                    });
                }
                
                // Clean up user connection
                this.userConnections.delete(userId);
                this.connectedUsers.delete(userId);
            }
        }
    }

    @SubscribeMessage('ping')
    handlePing(@ConnectedSocket() client: Socket) {
        const userId = this.getUserIdFromSocket(client.id);
        if (userId) {
            this.updateUserConnection(userId, client.id, { lastActive: new Date() });
        }
        client.emit('pong', { timestamp: new Date() });
    }

    // Method to get userId from socketId
    getUserIdFromSocket(socketId: string): string | undefined {
        for (const [userId, connectedSocketId] of this.connectedUsers.entries()) {
            if (connectedSocketId === socketId) {
                return userId;
            }
        }
        return undefined;
    }

    // Helper method to join group room
    @UseGuards(WebSocketRateLimitGuard)
    @SubscribeMessage('join_group')
    async handleJoinGroup(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { groupId: string }
    ) {
        try {
            const userId = this.getUserIdFromSocket(client.id);

            if (!userId) {
                this.handleError(client, 'Authentication required');
                return;
            }

            const { groupId } = payload;

            const membership = await this.prismaService.groupMembers.findUnique({
                where: {
                    group_id_user_id: {
                        group_id: groupId,
                        user_id: userId
                    }
                }
            });

            if (!membership) {
                this.handleError(client, 'Not a member of this group');
                return;
            }

            client.join(`group:${groupId}`);
            
            // Update user's groups
            const userConnection = this.userConnections.get(userId);
            if (userConnection) {
                userConnection.groups.add(groupId);
                this.userConnections.set(userId, userConnection);
            }

            const groupEvent: GroupEventPayload = {
                groupId,
                userId,
                timestamp: new Date()
            };

            client.emit('joined_group', groupEvent);
            client.to(`group:${groupId}`).emit('user_online', groupEvent);
        } catch (error) {
            this.handleError(client, 'Failed to join group', error);
        }
    }

    // Method to leave group room
    @SubscribeMessage('leave_group')
    async handleLeaveGroup(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { groupId: string }
    ) {
        try {
            const userId = this.getUserIdFromSocket(client.id);

            if (!userId) {
                client.emit('error', { message: 'Authentication required' });
                return;
            }

            const { groupId } = payload;

            // Leave the group room
            client.leave(`group:${groupId}`);

            client.emit('left_group', {
                groupId,
                message: 'Successfully left group channel'
            });

            // Notify other group members
            client.to(`group:${groupId}`).emit('user_offline', {
                groupId,
                userId
            });
        } catch (error) {
            client.emit('error', {
                message: 'Failed to leave group',
                error: error.message
            });
        }
    }
    // Add these methods to the WebsocketGateway class

    // Method to book a Pora (Juz)
    @SubscribeMessage('book_pora')
    async handleBookPora(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { poraId: string, groupId: string }
    ) {
        try {
            const userId = this.getUserIdFromSocket(client.id);

            if (!userId) {
                client.emit('error', { message: 'Authentication required' });
                return;
            }

            const { poraId, groupId } = payload;

            // Check if user is a member of the group
            const membership = await this.prismaService.groupMembers.findUnique({
                where: {
                    group_id_user_id: {
                        group_id: groupId,
                        user_id: userId
                    }
                }
            });

            if (!membership) {
                client.emit('error', { message: 'Not a member of this group' });
                return;
            }

            // Check if the pora is already booked
            const existingBooking = await this.prismaService.bookedPoralar.findFirst({
                where: {
                    poraId,
                    idGroup: groupId,
                    isBooked: true,
                    isDone: false
                }
            });

            if (existingBooking) {
                client.emit('error', { message: 'This pora is already booked' });
                return;
            }

            // Create booking
            const booking = await this.prismaService.bookedPoralar.create({
                data: {
                    poraId,
                    idGroup: groupId,
                    userId,
                    isBooked: true,
                    isDone: false
                }
            });

            // Get user info
            const user = await this.prismaService.user.findUnique({
                where: { userId },
                select: { name: true, surname: true }
            });

            // Get pora info
            const pora = await this.prismaService.poralar.findUnique({
                where: { id: poraId },
                select: { name: true }
            });

            // Notify all group members
            this.server.to(`group:${groupId}`).emit('pora_booked', {
                bookingId: booking.id,
                poraId,
                poraName: pora?.name,
                groupId,
                userId,
                userName: `${user?.name} ${user?.surname}`,
                timestamp: new Date()
            });

            client.emit('booking_confirmed', {
                bookingId: booking.id,
                poraId,
                poraName: pora?.name
            });
        } catch (error) {
            client.emit('error', {
                message: 'Failed to book pora',
                error: error.message
            });
        }
    }

    // Method to mark a pora as completed
    @SubscribeMessage('complete_pora')
    async handleCompletePora(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { bookingId: string }
    ) {
        try {
            const userId = this.getUserIdFromSocket(client.id);

            if (!userId) {
                client.emit('error', { message: 'Authentication required' });
                return;
            }

            const { bookingId } = payload;

            // Find the booking
            const booking = await this.prismaService.bookedPoralar.findUnique({
                where: { id: bookingId },
                include: {
                    pora: true,
                    group: true
                }
            });

            if (!booking) {
                client.emit('error', { message: 'Booking not found' });
                return;
            }

            if (booking.userId !== userId) {
                client.emit('error', { message: 'Not authorized to complete this pora' });
                return;
            }

            if (booking.isDone) {
                client.emit('error', { message: 'Pora already completed' });
                return;
            }

            // Mark as done
            await this.prismaService.bookedPoralar.update({
                where: { id: bookingId },
                data: { isDone: true }
            });

            // Find or create a finishedPoralarCount for the group
            let finishedCount = await this.prismaService.finishedPoralarCount.findFirst({
                where: { idGroup: booking.idGroup }
            });

            if (finishedCount) {
                finishedCount = await this.prismaService.finishedPoralarCount.update({
                    where: { id: finishedCount.id },
                    data: { juzCount: { increment: 1 } }
                });
            } else {
                finishedCount = await this.prismaService.finishedPoralarCount.create({
                    data: {
                        idGroup: booking.idGroup,
                        juzCount: 1
                    }
                });
            }

            // Check if hatm is completed
            let hatmCompleted = false;
            if (finishedCount.juzCount >= 30) {
                // Reset juz count
                await this.prismaService.finishedPoralarCount.update({
                    where: { id: finishedCount.id },
                    data: { juzCount: 0 }
                });

                // Increment hatm count
                await this.prismaService.group.update({
                    where: { idGroup: booking.idGroup },
                    data: { hatmSoni: { increment: 1 } }
                });

                hatmCompleted = true;
            }

            // Get user info
            const user = await this.prismaService.user.findUnique({
                where: { userId },
                select: { name: true, surname: true }
            });

            // Notify all group members
            this.server.to(`group:${booking.idGroup}`).emit('pora_completed', {
                bookingId,
                poraId: booking.poraId,
                poraName: booking.pora.name,
                groupId: booking.idGroup,
                groupName: booking.group.name,
                userId,
                userName: `${user?.name} ${user?.surname}`,
                totalFinished: finishedCount.juzCount,
                hatmCompleted,
                timestamp: new Date()
            });

            client.emit('completion_confirmed', {
                bookingId,
                poraId: booking.poraId,
                poraName: booking.pora.name
            });
        } catch (error) {
            client.emit('error', {
                message: 'Failed to complete pora',
                error: error.message
            });
        }
    }
    // Add these methods to the WebsocketGateway class

    // Method to update zikr count
    @SubscribeMessage('update_zikr_count')
    async handleUpdateZikrCount(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { groupId: string, zikrId: string, count: number }
    ) {
        try {
            const userId = this.getUserIdFromSocket(client.id);

            if (!userId) {
                client.emit('error', { message: 'Authentication required' });
                return;
            }

            const { groupId, zikrId, count } = payload;

            // Check if user is a member of the group
            const membership = await this.prismaService.groupMembers.findUnique({
                where: {
                    group_id_user_id: {
                        group_id: groupId,
                        user_id: userId
                    }
                }
            });

            if (!membership) {
                client.emit('error', { message: 'Not a member of this group' });
                return;
            }

            // Get the zikr details
            const zikr = await this.prismaService.zikr.findUnique({
                where: { id: zikrId },
                select: { name: true, goal: true }
            });

            if (!zikr) {
                client.emit('error', { message: 'Zikr not found' });
                return;
            }

            // Record the user's zikr count
            const zikrCount = await this.prismaService.zikrCounts.create({
                data: {
                    groupId,
                    userId,
                    count,
                    sessionDate: new Date(),
                    zikr_goal_id: zikrId
                }
            });

            // Update or create group zikr activity
            const existingActivity = await this.prismaService.groupZikrActivities.findFirst({
                where: {
                    group_id: groupId,
                    zikr_id: zikrId
                }
            });

            let totalCount = 0;
            let goalReached = false;

            if (existingActivity) {
                // Update existing activity
                totalCount = existingActivity.zikr_count + count;
                await this.prismaService.groupZikrActivities.update({
                    where: { id: existingActivity.id },
                    data: {
                        zikr_count: totalCount,
                        last_updated: new Date()
                    }
                });
            } else {
                // Create new activity
                totalCount = count;
                await this.prismaService.groupZikrActivities.create({
                    data: {
                        group_id: groupId,
                        zikr_id: zikrId,
                        zikr_count: count,
                        last_updated: new Date()
                    }
                });
            }

            // Check if goal is reached
            goalReached = totalCount >= zikr.goal;

            // Get user info
            const user = await this.prismaService.user.findUnique({
                where: { userId },
                select: { name: true, surname: true }
            });

            // Notify all group members
            this.server.to(`group:${groupId}`).emit('zikr_count_updated', {
                groupId,
                zikrId,
                zikrName: zikr.name,
                userId,
                userName: `${user?.name} ${user?.surname}`,
                count,
                totalCount,
                progress: Math.min(100, (totalCount / zikr.goal) * 100).toFixed(2),
                goalReached,
                timestamp: new Date()
            });

            client.emit('zikr_update_confirmed', {
                id: zikrCount.id,
                count,
                totalCount,
                goalReached
            });
        } catch (error) {
            client.emit('error', {
                message: 'Failed to update zikr count',
                error: error.message
            });
        }
    }
    // Add these methods to the WebsocketGateway class

    // Method to send group invitation
    @SubscribeMessage('send_invitation')
    async handleSendInvitation(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { receiverId: string, groupId: string }
    ) {
        try {
            const senderId = this.getUserIdFromSocket(client.id);

            if (!senderId) {
                client.emit('error', { message: 'Authentication required' });
                return;
            }

            const { receiverId, groupId } = payload;

            // Check if sender is admin of the group
            const group = await this.prismaService.group.findUnique({
                where: { idGroup: groupId },
                select: {
                    adminId: true,
                    name: true
                }
            });

            if (!group) {
                client.emit('error', { message: 'Group not found' });
                return;
            }

            if (group.adminId !== senderId) {
                client.emit('error', { message: 'Only group admins can send invitations' });
                return;
            }

            // Check if receiver is already a member
            const existingMember = await this.prismaService.groupMembers.findUnique({
                where: {
                    group_id_user_id: {
                        group_id: groupId,
                        user_id: receiverId
                    }
                }
            });

            if (existingMember) {
                client.emit('error', { message: 'User is already a member of this group' });
                return;
            }

            // Create notification
            const notification = await this.prismaService.notifications.create({
                data: {
                    senderId,
                    receiverId,
                    groupId,
                    isInvite: true,
                    isRead: false,
                    time: new Date()
                }
            });

            // Get sender details
            const sender = await this.prismaService.user.findUnique({
                where: { userId: senderId },
                select: { name: true, surname: true }
            });

            // Send notification to receiver if online
            const receiverSocketId = this.connectedUsers.get(receiverId);
            if (receiverSocketId) {
                this.server.to(`user:${receiverId}`).emit('new_invitation', {
                    id: notification.id,
                    senderId,
                    senderName: `${sender?.name} ${sender?.surname}`,
                    groupId,
                    groupName: group.name,
                    time: notification.time
                });
            }

            client.emit('invitation_sent', {
                id: notification.id,
                receiverId,
                groupId,
                time: notification.time
            });
        } catch (error) {
            client.emit('error', {
                message: 'Failed to send invitation',
                error: error.message
            });
        }
    }

    // Method to respond to invitation
    @SubscribeMessage('respond_to_invitation')
    async handleRespondToInvitation(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { notificationId: string, accept: boolean }
    ) {
        try {
            const userId = this.getUserIdFromSocket(client.id);

            if (!userId) {
                client.emit('error', { message: 'Authentication required' });
                return;
            }

            const { notificationId, accept } = payload;

            // Get notification details
            const notification = await this.prismaService.notifications.findUnique({
                where: { id: notificationId },
                include: {
                    sender: {
                        select: { name: true, surname: true }
                    },
                    group: true
                }
            });

            if (!notification) {
                client.emit('error', { message: 'Invitation not found' });
                return;
            }

            if (notification.receiverId !== userId) {
                client.emit('error', { message: 'Not authorized to respond to this invitation' });
                return;
            }

            if (!notification.isInvite) {
                client.emit('error', { message: 'This notification is not an invitation' });
                return;
            }

            // Mark as read
            await this.prismaService.notifications.update({
                where: { id: notificationId },
                data: { isRead: true }
            });

            if (accept) {
                // Check if already a member
                const existingMember = await this.prismaService.groupMembers.findUnique({
                    where: {
                        group_id_user_id: {
                            group_id: notification.groupId,
                            user_id: userId
                        }
                    }
                });

                if (!existingMember) {
                    // Add to group members
                    await this.prismaService.groupMembers.create({
                        data: {
                            group_id: notification.groupId,
                            user_id: userId,
                            role: 'USER',
                            joined_at: new Date()
                        }
                    });
                }

                // Join the group room
                client.join(`group:${notification.groupId}`);

                // Get user details
                const user = await this.prismaService.user.findUnique({
                    where: { userId },
                    select: { name: true, surname: true }
                });

                // Notify all group members
                this.server.to(`group:${notification.groupId}`).emit('member_joined', {
                    groupId: notification.groupId,
                    groupName: notification.group.name,
                    userId,
                    userName: `${user?.name} ${user?.surname}`,
                    timestamp: new Date()
                });

                // Notify invitation sender
                this.server.to(`user:${notification.senderId}`).emit('invitation_accepted', {
                    notificationId,
                    groupId: notification.groupId,
                    groupName: notification.group.name,
                    userId,
                    userName: `${user?.name} ${user?.surname}`
                });
            } else {
                // Notify invitation sender of rejection
                this.server.to(`user:${notification.senderId}`).emit('invitation_rejected', {
                    notificationId,
                    groupId: notification.groupId,
                    groupName: notification.group.name,
                    userId
                });
            }

            client.emit('invitation_responded', {
                notificationId,
                accepted: accept,
                groupId: notification.groupId,
                groupName: notification.group.name
            });
        } catch (error) {
            client.emit('error', {
                message: 'Failed to respond to invitation',
                error: error.message
            });
        }
    }
    // Add these methods to the WebsocketGateway class

    // Method to get unread notifications
    @SubscribeMessage('get_notifications')
    async handleGetNotifications(
        @ConnectedSocket() client: Socket
    ) {
        try {
            const userId = this.getUserIdFromSocket(client.id);

            if (!userId) {
                client.emit('error', { message: 'Authentication required' });
                return;
            }

            // Get unread notifications
            const notifications = await this.prismaService.notifications.findMany({
                where: {
                    receiverId: userId,
                    isRead: false
                },
                include: {
                    sender: {
                        select: { name: true, surname: true }
                    },
                    group: {
                        select: { name: true }
                    }
                },
                orderBy: {
                    time: 'desc'
                }
            });

            // Transform notifications
            const formattedNotifications = notifications.map(notification => ({
                id: notification.id,
                type: notification.isInvite ? 'invitation' : 'notification',
                senderId: notification.senderId,
                senderName: `${notification.sender.name} ${notification.sender.surname}`,
                groupId: notification.groupId,
                groupName: notification.group?.name,
                time: notification.time,
                isRead: notification.isRead
            }));

            client.emit('notifications', formattedNotifications);
        } catch (error) {
            client.emit('error', {
                message: 'Failed to get notifications',
                error: error.message
            });
        }
    }

    // Method to mark notification as read
    @SubscribeMessage('mark_notification_read')
    async handleMarkNotificationRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { notificationId: string }
    ) {
        try {
            const userId = this.getUserIdFromSocket(client.id);

            if (!userId) {
                client.emit('error', { message: 'Authentication required' });
                return;
            }

            const { notificationId } = payload;

            // Check if notification belongs to user
            const notification = await this.prismaService.notifications.findUnique({
                where: { id: notificationId }
            });

            if (!notification) {
                client.emit('error', { message: 'Notification not found' });
                return;
            }

            if (notification.receiverId !== userId) {
                client.emit('error', { message: 'Not authorized to mark this notification as read' });
                return;
            }

            // Mark as read
            await this.prismaService.notifications.update({
                where: { id: notificationId },
                data: { isRead: true }
            });

            client.emit('notification_marked_read', {
                notificationId,
                success: true
            });
        } catch (error) {
            client.emit('error', {
                message: 'Failed to mark notification as read',
                error: error.message
            });
        }
    }
}
