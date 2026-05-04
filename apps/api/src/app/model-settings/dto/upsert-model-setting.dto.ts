import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const SERVICES = ['ai-assist', 'embedding'] as const;
const PROVIDERS = [
  'claude',
  'openai',
  'gemini',
  'ollama',
  'openrouter',
  'voyage',
] as const;

export class UpsertModelSettingDto {
  @IsString()
  @IsIn(SERVICES as unknown as string[])
  service!: (typeof SERVICES)[number];

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  @IsIn(PROVIDERS as unknown as string[])
  provider?: (typeof PROVIDERS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsBoolean()
  useOwnKey?: boolean;
}
