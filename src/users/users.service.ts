import { BadRequestException, Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma.service';
import { UserRegistrationDto } from 'src/common/dto/user-registration.dto';

export interface RegisterResponse {
  id: number;
  email: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  password: string;
  tokenSecret: string | null;
  tokenVersion: number;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findFirstByUsernameOrEmail({
    username,
    email,
  }: {
    username?: string;
    email?: string;
  }): Promise<User | null> {
    if (!username && !email) {
      throw new BadRequestException('Username or email is required', {
        cause: new Error(),
        description: 'Username or email is required',
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        tokenSecret: true,
        tokenVersion: true,
      },
    });

    return user;
  }

  async create(createUserDto: UserRegistrationDto): Promise<any> {
    const user = await this.prisma.user.create({
      data: createUserDto,
      select: { id: true, email: true, username: true },
    });

    return user;
  }

  findAll() {
    return `This action returns all users`;
  }

  async findOneById({ id }: { id: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user;
  }

  async updateTokenSecret({
    id,
    tokenSecret,
  }: {
    id: number;
    tokenSecret: string;
  }) {
    await this.prisma.user.update({
      where: { id },
      data: { tokenSecret },
    });
  }

  async updateTokenVersion({ id }: { id: number }) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });

    return user;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
