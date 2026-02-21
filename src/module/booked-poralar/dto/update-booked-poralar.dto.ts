import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateBookedPoralarDto {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true })
  isBooked?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: false })
  isDone?: boolean;
}
