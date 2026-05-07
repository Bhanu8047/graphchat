import { IsString } from 'class-validator';

export class GithubCliPollDto {
  @IsString()
  device_code!: string;
}
