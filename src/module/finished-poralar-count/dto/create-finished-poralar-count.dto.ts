import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateFinishedPoralarCountDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'group-uuid', description: 'The group for which a hatm has been completed' })
  idGroup: string;
}
