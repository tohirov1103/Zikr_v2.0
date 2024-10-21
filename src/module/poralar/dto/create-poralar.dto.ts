// src/module/poralar/dto/create-pora.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePoraDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Pora Name' })
  name: string;
}