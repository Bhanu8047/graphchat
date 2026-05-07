import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateModelQuotaDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  adminMonthlyUsdLimit?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
