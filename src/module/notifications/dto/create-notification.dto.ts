import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  @ApiProperty({ example: 'uuid of the sender' })
  senderId: string;

  @IsUUID()
  @ApiProperty({ example: 'uuid of the receiver' })
  receiverId: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ example: 'uuid of the group (optional)', required: false })
  groupId?: string;

  @IsBoolean()
  @ApiProperty({ example: true })
  isInvite: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: false, required: false })
  isRead?: boolean;
}
