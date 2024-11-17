import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  //   handleConnection(client: Socket) {
  //     const token = client.handshake.query.token as string;

  //     try {
  //       const decoded = this.jwtService.verify(token);
  //       client.join(decoded.id); // Join a room named after the user's ID
  //     } catch (error) {
  //       client.disconnect();  // Disconnect if JWT is invalid
  //     }
  //   }

  handleConnection(client: Socket) {
    // Skip JWT verification temporarily for debugging
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    // Leave all rooms except the default room (which is the client's ID)
    const rooms = Array.from(client.rooms);
    rooms.forEach((room) => {
      if (room !== client.id) {
        client.leave(room);
      }
    });
  }

  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(userId).emit('notification', notification);
  }
}
