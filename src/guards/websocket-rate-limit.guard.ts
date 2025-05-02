import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';

@Injectable()
export class WebSocketRateLimitGuard implements CanActivate {
  private readonly rateLimits = new Map<string, number>();
  private readonly WINDOW_MS = 60000; // 1 minute
  private readonly MAX_REQUESTS = 100;

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const userId = this.getUserIdFromSocket(client.id);
    
    if (!userId) return false;
    
    const now = Date.now();
    const userLimit = this.rateLimits.get(userId) || 0;
    
    if (userLimit >= this.MAX_REQUESTS) {
      client.emit('error', { message: 'Rate limit exceeded' });
      return false;
    }
    
    this.rateLimits.set(userId, userLimit + 1);
    setTimeout(() => {
      this.rateLimits.delete(userId);
    }, this.WINDOW_MS);
    
    return true;
  }

  private getUserIdFromSocket(socketId: string): string | undefined {
    // This should be implemented based on your user-socket mapping
    return undefined;
  }
} 