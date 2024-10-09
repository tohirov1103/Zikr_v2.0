import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsInt } from 'class-validator';

export class AddCount {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'group-uuid' })
  groupId: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'zikr-uuid' })
   zikrId: string;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 1 })
   count: number
}
