import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync, hash } from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RegistrationUserDto } from 'src/auth/dto/registration-user.dto';
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

  async register(registerDto: RegistrationUserDto): Promise<any> {
    const existedUser = await this.findOneByUsernameOrEmail({
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
    const data = {
      email: registerDto.email,
      username: registerDto.username,
      password: hashedPassword,
      tokenSecret,
      tokenVersion: 0,
    };
    const account = await this.prisma.account.create({ data });

    await this.usersService.create({
      accountId: account.id,
      displayName: registerDto.displayName || registerDto.username,
    });

    return this.generateTokenPair({ account });
  }

  async login(
    loginDto: LoginUserDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (loginDto.email && loginDto.username) {
      throw new BadRequestException('Login failed', {
        cause: new Error(),
        description: 'Should only provide either email or username',
      });
    }

    const existedAccount = await this.findOneByUsernameOrEmail({
      username: loginDto.username,
      email: loginDto.email,
    });
    if (!existedAccount) {
      throw new BadRequestException('Email or username is not found', {
        cause: new Error(),
        description: 'Email or username is not found',
      });
    }

    const isCorrectPassword = compareSync(
      loginDto.password,
      existedAccount.password,
    );
    if (!isCorrectPassword) {
      throw new UnauthorizedException('Password is not correct', {
        cause: new Error(),
        description: 'Password is not correct',
      });
    }

    if (!existedAccount.tokenSecret) {
      const tokenSecret = this.generateTokenSecret();
      await this.updateTokenSecret({
        id: existedAccount.id,
        tokenSecret,
      });
      existedAccount.tokenSecret = tokenSecret;
    }

    return this.generateTokenPair({ account: existedAccount });
  }

  private async generateTokenPair({
    account,
  }: {
    account: any;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const acTokenPayload = {
      sub: account.id,
      email: account.email,
      username: account.username,
    };
    const accessToken = await this.jwtService.signAsync(acTokenPayload, {
      expiresIn: '15m',
      secret: account.tokenSecret,
    });

    const rfTokenPayload = {
      sub: account.id,
      version: account.tokenVersion,
    };
    const refreshToken = await this.jwtService.signAsync(rfTokenPayload, {
      expiresIn: '7d',
      secret: account.tokenSecret,
    });

    return { accessToken, refreshToken };
  }

  async updateTokenSecret({
    id,
    tokenSecret,
  }: {
    id: number;
    tokenSecret: string;
  }) {
    await this.prisma.account.update({
      where: { id },
      data: { tokenSecret },
    });
  }

  async findOneById({ id }: { id: number }) {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    return account;
  }

  async findOneByUsernameOrEmail({
    username,
    email,
  }: {
    username?: string;
    email?: string;
  }) {
    const account = await this.prisma.account.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    return account;
  }

  async updateTokenVersion({ id }: { id: number }) {
    const user = await this.prisma.account.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });

    return user;
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

      const account = await this.findOneById({
        id: decoded.sub,
      });
      if (!account || !account.tokenSecret) {
        throw new UnauthorizedException('Unauthorized', {
          cause: new Error(),
          description: 'User not found or token revoked',
        });
      }

      const rfTokenPayload = await this.jwtService.verifyAsync(refreshToken, {
        secret: account.tokenSecret,
      });

      if (rfTokenPayload.version !== account.tokenVersion) {
        throw new UnauthorizedException('Unauthorized', {
          cause: new Error(),
          description: 'Token has been revoked',
        });
      }

      const updateUser = await this.updateTokenVersion({
        id: account.id,
      });

      const tokenPair = await this.generateTokenPair({
        account: updateUser,
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
