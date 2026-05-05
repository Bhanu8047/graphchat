import { IsIn, IsInt, Min } from 'class-validator';

export class UpsertRateLimitDto {
  @IsIn(['ai-assist', 'embedding'])
  service!: 'ai-assist' | 'embedding';

  @IsInt()
  @Min(0)
  dailyLimit!: number;

  @IsInt()
  @Min(0)
  sessionLimit!: number;
}
