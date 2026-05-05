import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  EdgeConfidence,
  NodeType,
  SearchQueryDto as ISearchQueryDto,
} from '@graphchat/shared-types';

/**
 * Validated DTO for `GET /api/search`.
 *
 * The shared-types interface (`ISearchQueryDto`) defines the contract used by
 * clients; this class adds the runtime validators required by Nest's global
 * `ValidationPipe({ whitelist: true, transform: true })`. Without a class,
 * the pipe strips every property → `q` becomes undefined → embedding throws
 * → 500. This is the root cause we are guarding against.
 */
export class SearchQueryDto implements ISearchQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'Query "q" must not be empty.' })
  @MaxLength(1000)
  q!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  repoId?: string;

  @IsOptional()
  @IsString()
  type?: NodeType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  k?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32_000)
  budget?: number;

  @IsOptional()
  @IsEnum(['EXTRACTED', 'INFERRED', 'SPECULATIVE'] as EdgeConfidence[])
  minConfidence?: EdgeConfidence;
}
