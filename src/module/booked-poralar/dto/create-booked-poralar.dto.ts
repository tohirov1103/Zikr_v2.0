import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateBookedPoralarDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'group-uuid' })
  idGroup: string;

  // @IsUUID()
  // @IsNotEmpty()
  // @ApiProperty({ example: 'user-uuid' })
  // userId: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'pora-uuid' })
  poraId: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true })
  isBooked?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: false })
  isDone?: boolean;
}
