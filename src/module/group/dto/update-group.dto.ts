import { ApiProperty } from "@nestjs/swagger";
import { GroupType } from "@prisma/client";
import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min } from "class-validator";

export class UpdateGroupDto {
    @IsString()
    @IsOptional()
    @ApiProperty({ example: 'Updated Group Name' })
    name?: string;
  
    @IsEnum(GroupType)
    @IsOptional()
    @ApiProperty({ example: GroupType.ZIKR })
    groupType?: GroupType;
  
    @IsBoolean()
    @IsOptional()
    @ApiProperty({ example: true })
    isPublic?: boolean;
  
    @IsOptional()
    @IsString()
    @ApiProperty({ example: 'Updated image URL' })
    guruhImg?: string;
  
    @IsOptional()
    @IsString()
    @ApiProperty({ example: 'Updated Beneficiary Name' })
    kimga?: string;
  
    @IsInt()
    @IsOptional()
    @Min(1)
    @ApiProperty({ example: 50 })
    hatmSoni?: number;
  }