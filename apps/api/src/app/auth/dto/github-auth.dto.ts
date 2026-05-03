import { IsString, MinLength } from 'class-validator';

export class GithubAuthDto {
  @IsString()
  @MinLength(20)
  accessToken!: string;
}