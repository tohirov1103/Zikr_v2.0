import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateZikrDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Morning Zikr' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Description of zikr' })
  desc: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Text content of zikr' })
  body: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'https://example.com/sound.mp3', required: false })
  sound_url?: string;

  @IsInt()
  @ApiProperty({ example: 100 })
  goal: number;

  @IsUUID()
  @ApiProperty({ example: 'uuid of the group' })
  groupId: string;
}
