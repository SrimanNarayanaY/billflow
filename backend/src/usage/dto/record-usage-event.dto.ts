import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class RecordUsageEventDto {
  @IsString()
  @IsNotEmpty()
  metric: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity?: number;
}
