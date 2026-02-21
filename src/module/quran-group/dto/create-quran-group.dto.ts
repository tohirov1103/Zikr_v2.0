import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateQuranGroupDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'My Quran Group' })
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
  @ApiPropertyOptional({ example: 'For family members' })
  kimga?: string;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'Target number of hatm completions' })
  hatmSoni: number;
}
