import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'uuid-of-receiver' })
  receiverId: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'uuid-of-group' })
  groupId: string;
}
