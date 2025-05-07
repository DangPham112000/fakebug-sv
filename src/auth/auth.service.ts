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
import { PrismaService } from 'src/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  private async hashPassword(
    plainText: string,
    saltRounds: number,
  ): Promise<string> {
    return await hash(plainText, saltRounds);
  }

  private generateTokenSecret(): string {
    return randomBytes(32).toString('hex');
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
    const tokenSecret = this.generateTokenSecret();

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      tokenSecret,
      tokenVersion: 0,
    });

    return { id: user.id, email: user.email, username: user.username };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
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

    if (!existedUser.tokenSecret) {
      const tokenSecret = this.generateTokenSecret();
      await this.usersService.updateTokenSecret({
        id: existedUser.id,
        tokenSecret,
      });
      existedUser.tokenSecret = tokenSecret;
    }

    return this.generateTokenPair({ user: existedUser });
  }

  private async generateTokenPair({
    user,
  }: {
    user: any;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const acTokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };
    const accessToken = await this.jwtService.signAsync(acTokenPayload, {
      expiresIn: '15m',
      secret: user.tokenSecret,
    });

    const rfTokenPayload = {
      sub: user.id,
      version: user.tokenVersion,
    };
    const refreshToken = await this.jwtService.signAsync(rfTokenPayload, {
      expiresIn: '7d',
      secret: user.tokenSecret,
    });

    return { accessToken, refreshToken };
  }

  async renewRefreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // First, decode token without verification to get the user ID
      const decoded = this.jwtService.decode(refreshToken);
      if (!decoded || !decoded.sub) {
        throw new UnauthorizedException('Unauthorized', {
          cause: new Error(),
          description: 'Invalid token format',
        });
      }

      const user = await this.usersService.findOneById({
        id: decoded.sub,
      });
      if (!user || !user.tokenSecret) {
        throw new UnauthorizedException('Unauthorized', {
          cause: new Error(),
          description: 'User not found or token revoked',
        });
      }

      const rfTokenPayload = await this.jwtService.verifyAsync(refreshToken, {
        secret: user.tokenSecret,
      });

      if (rfTokenPayload.version !== user.tokenVersion) {
        throw new UnauthorizedException('Unauthorized', {
          cause: new Error(),
          description: 'Token has been revoked',
        });
      }

      const updateUser = await this.usersService.updateTokenVersion({
        id: user.id,
      });

      const tokenPair = await this.generateTokenPair({
        user: updateUser,
      });

      return tokenPair;
    } catch (error) {
      throw new UnauthorizedException('Unauthorized', {
        cause: new Error(),
        description: 'Error when verifying token',
      });
    }
  }
}
