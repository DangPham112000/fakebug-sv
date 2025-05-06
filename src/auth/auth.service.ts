import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync, hash } from 'bcrypt';
import { LoginUserDto } from 'src/users/dto/login-user.dto';
import { UsersService } from 'src/users/users.service';

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

  // async register(registerUserDto: RegisterUserDto): Promise<any> {
  //   const existedUser = await this.prisma.user.findFirst({
  //     where: {
  //       OR: [
  //         { email: registerUserDto.email },
  //         { username: registerUserDto.username },
  //       ],
  //     },
  //   });

  //   if (existedUser) {
  //     throw new BadRequestException('Email or username is already exist', {
  //       cause: new Error(),
  //       description: 'User is already exist',
  //     });
  //   }

  //   const hashedPassword = await this.hashPassword(
  //     registerUserDto.password,
  //     10,
  //   );

  //   const hashedPassword2 = await this.hashPassword(
  //     registerUserDto.password,
  //     10,
  //   );

  //   console.log(hashedPassword, hashedPassword2);

  //   registerUserDto.password = hashedPassword;

  //   const user = await this.prisma.user.create({
  //     data: registerUserDto,
  //     select: { email: true, id: true },
  //   });

  //   return user;
  // }

  async login(loginUserDto: LoginUserDto): Promise<{ accessToken: string }> {
    const existedUser = await this.usersService.findFirstByUsernameOrEmail({
      username: loginUserDto.username,
      email: loginUserDto.email,
    });
    if (!existedUser) {
      throw new BadRequestException('Email or username is not found', {
        cause: new Error(),
        description: 'Email or username is not found',
      });
    }

    const isCorrectPassword = compareSync(
      loginUserDto.password,
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
