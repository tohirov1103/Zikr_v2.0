import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateBookedPoralarDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'group-uuid' })
  idGroup: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'pora-uuid' })
  poraId: string;
}
