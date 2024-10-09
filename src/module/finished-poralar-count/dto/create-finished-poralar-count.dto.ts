import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, IsNotEmpty } from 'class-validator';

export class CreateFinishedPoralarCountDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'group-uuid' })
  idGroup: string;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 30 })
  juzCount: number;
}