import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsInt, IsDateString } from 'class-validator';

export class CreateZikrCountDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'group-uuid' })
  groupId: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'user-uuid' })
  userId: string;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 100 })
  count: number;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2024-10-08T00:00:00Z' })
  sessionDate: Date;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'goal-uuid' })
  zikr_goal_id: string;
}
