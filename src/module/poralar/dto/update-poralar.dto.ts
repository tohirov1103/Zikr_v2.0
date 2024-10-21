// src/module/poralar/dto/update-pora.dto.ts
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { CreatePoraDto } from './index';

export class UpdatePoraDto extends PartialType(CreatePoraDto) {
  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'Updated Pora Name' })
  name?: string;
}
