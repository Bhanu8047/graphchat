import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(80)
  label!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];
}

export class ExchangeApiKeyDto {
  @IsString()
  api_key!: string;
}

export class RefreshTokenDto {
  @IsString()
  refresh_token!: string;
}
