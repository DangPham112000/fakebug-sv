import { IsEmail, IsNotEmpty, MinLength, ValidateIf } from 'class-validator';

export class LoginUserDto {
  @ValidateIf((o) => !o.username || o.email)
  @IsNotEmpty({ message: 'email should not be empty' })
  @IsEmail(
    {
      require_tld: false, // Requires top-level domain (e.g., .com, .net)
    },
    { message: 'email is invalid' },
  )
  email?: string;

  @ValidateIf((o) => !o.email || o.username)
  @IsNotEmpty({ message: 'username should not be empty' })
  username?: string;

  @IsNotEmpty({ message: 'password should not be empty' })
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password: string;
}
