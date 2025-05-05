import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsNotEmpty({ message: 'email should not be empty' })
  @IsEmail(
    {
      require_tld: false, // Requires top-level domain (e.g., .com, .net)
    },
    { message: 'email is invalid' },
  )
  email: string;

  @IsNotEmpty({ message: 'username should not be empty' })
  username: string;

  @IsNotEmpty({ message: 'password should not be empty' })
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password: string;

  @IsOptional()
  displayName: string;
}
