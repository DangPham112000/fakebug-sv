import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'email should not be empty' })
  @IsNumber()
  accountId: number;

  @IsOptional()
  displayName: string;
}
