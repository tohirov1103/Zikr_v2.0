import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class SubscribeUserDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'group-uuid' })
  groupId: string;
}
