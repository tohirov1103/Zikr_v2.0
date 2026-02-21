import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateZikrGroupDto {
  // Group fields
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Updated Group Name' })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  guruhImg?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ example: false })
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'For friends' })
  kimga?: string;

  // Zikr fields
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Alhamdulillah' })
  zikrName?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Updated description' })
  zikrDesc?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Updated hint' })
  zikrHint?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'اَلْحَمْدُ لِلَّه' })
  zikrBody?: string;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 500 })
  goalZikrCount?: number;
}
