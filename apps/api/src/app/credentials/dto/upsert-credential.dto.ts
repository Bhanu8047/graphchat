import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

const PROVIDERS = [
  'claude',
  'openai',
  'gemini',
  'ollama',
  'openrouter',
  'voyage',
] as const;

export class UpsertCredentialDto {
  @IsString()
  @IsIn(PROVIDERS as unknown as string[])
  provider!: (typeof PROVIDERS)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(400)
  apiKey!: string;
}
