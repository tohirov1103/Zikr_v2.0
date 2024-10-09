import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class UpdateBookedPoralarDto {
  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true, required: false })
  isBooked?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: false, required: false })
  isDone?: boolean;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ example: 'pora-uuid', required: false })
  poraId?: string;
}
