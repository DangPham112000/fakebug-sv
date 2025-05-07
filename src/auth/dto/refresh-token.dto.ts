import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'refreshToken should not be empty' })
  @IsString({ message: 'refreshToken must be a string' })
  refreshToken: string;
}