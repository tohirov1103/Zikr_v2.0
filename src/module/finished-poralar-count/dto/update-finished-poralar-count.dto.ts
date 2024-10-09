import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty } from "class-validator";

export class UpdateFinishedPoralarCountDto {
    @IsInt()
    @IsNotEmpty()
    @ApiProperty({ example: 30 })
    juzCount: number;
  }
  