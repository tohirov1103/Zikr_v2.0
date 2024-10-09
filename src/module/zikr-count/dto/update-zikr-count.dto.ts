import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsDateString, IsUUID } from 'class-validator';

export class UpdateZikrCountDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ example: 'user-uuid', required: false })
  userId?: string;

  @IsOptional()
  @IsInt()
  @ApiProperty({ example: 200, required: false })
  count?: number;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ example: '2024-10-08T00:00:00Z', required: false })
  sessionDate?: Date;
}
