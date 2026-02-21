import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateQuranGroupDto {
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

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 2 })
  hatmSoni?: number;
}
