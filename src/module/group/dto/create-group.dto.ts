import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNotEmpty, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { GroupType } from '@prisma/client';

export class CreateGroupDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'Quran Reading Group' })
    name: string;
  
    @IsEnum(GroupType)
    @ApiProperty({ example: GroupType.QURAN })
    groupType: GroupType;
  
    @IsBoolean()
    @ApiProperty({ example: true })
    isPublic: boolean;  // No longer optional
  
    @IsOptional()
    @IsString()
    @ApiProperty({ example: 'Some image URL' })
    guruhImg?: string;
  
    @IsOptional()
    @IsString()
    @ApiProperty({ example: 'Beneficiary Name' })
    kimga?: string;
  
    @IsInt()
    @Min(1)
    @ApiProperty({ example: 30 })
    hatmSoni: number;
  }
  