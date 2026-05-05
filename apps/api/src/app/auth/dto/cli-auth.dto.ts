import { IsString, Length } from 'class-validator';

export class CliPollDto {
  @IsString()
  device_code!: string;
}

export class CliApproveDto {
  @IsString()
  @Length(8, 12)
  user_code!: string;
}
