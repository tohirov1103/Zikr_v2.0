import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateZikrDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Morning Zikr (updated)' })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Updated description of zikr' })
  desc?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Updated text content of zikr' })
  body?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'https://example.com/updated-sound.mp3', required: false })
  sound_url?: string;

  @IsOptional()
  @IsInt()
  @ApiProperty({ example: 150 })
  goal?: number;
}
