import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync, hash } from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login.dto';
import { UserRegistrationDto } from 'src/common/dto/user-registration.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  private async hashPassword(
    plainText: string,
    saltRounds: number,
  ): Promise<string> {
    return await hash(plainText, saltRounds);
  }

  async register(registerDto: UserRegistrationDto): Promise<any> {
    const existedUser = await this.usersService.findFirstByUsernameOrEmail({
      username: registerDto.username,
      email: registerDto.email,
    });

    if (existedUser) {
      throw new BadRequestException('User is already exist', {
        cause: new Error(),
        description: 'Email or username is already exist',
      });
    }

    const hashedPassword = await this.hashPassword(registerDto.password, 10);

    registerDto.password = hashedPassword;

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    return user;
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    if (loginDto.email && loginDto.username) {
      throw new BadRequestException('Login failed', {
        cause: new Error(),
        description: 'Should only provide either email or username',
      });
    }

    const existedUser = await this.usersService.findFirstByUsernameOrEmail({
      username: loginDto.username,
      email: loginDto.email,
    });
    if (!existedUser) {
      throw new BadRequestException('Email or username is not found', {
        cause: new Error(),
        description: 'Email or username is not found',
      });
    }

    const isCorrectPassword = compareSync(
      loginDto.password,
      existedUser.password,
    );
    if (!isCorrectPassword) {
      throw new UnauthorizedException('Password is not correct', {
        cause: new Error(),
        description: 'Password is not correct',
      });
    }

    const tokenPayload = {
      sub: existedUser.id, // choose a property name of sub to hold our userId value to be consistent with JWT standards
      email: existedUser.email,
      username: existedUser.username,
    };
    const accessToken = await this.jwtService.signAsync(tokenPayload);

    return { accessToken };
  }
}
