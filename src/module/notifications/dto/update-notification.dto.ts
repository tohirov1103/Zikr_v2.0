import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateNotificationDto {
  @IsBoolean()
  @ApiProperty({ example: true })
  isRead: boolean;
}
