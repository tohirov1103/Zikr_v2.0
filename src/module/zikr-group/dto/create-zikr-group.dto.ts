import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateZikrGroupDto {
  // Group fields
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Morning Zikr Group' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  guruhImg?: string;

  @IsBoolean()
  @IsNotEmpty()
  @ApiProperty({ example: true })
  isPublic: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'For family' })
  kimga?: string;

  // Zikr fields
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Subhanallah' })
  zikrName: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Morning dhikr description' })
  zikrDesc?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Say it with full attention' })
  zikrHint?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'سُبْحَانَ اللَّهِ' })
  zikrBody: string;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 1000 })
  goalZikrCount: number;
}
