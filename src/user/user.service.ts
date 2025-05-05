import { BadRequestException, Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { hash } from 'bcrypt';
import { PrismaService } from 'src/prisma.service';

export interface RegisterResponse {
  id: number;
  email: string;
}

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async hashPassword(plainText: string, saltRounds: number): Promise<string> {
    return await hash(plainText, saltRounds);
  }

  async register(registerUSerDto: RegisterUserDto): Promise<RegisterResponse> {
    const existedUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: registerUSerDto.email },
          { username: registerUSerDto.username },
        ],
      },
    });

    if (existedUser) {
      throw new BadRequestException('Email or username is already exist', {
        cause: new Error(),
        description: 'User is already exist',
      });
    }

    const hashedPassword = await this.hashPassword(
      registerUSerDto.password,
      10,
    );

    registerUSerDto.password = hashedPassword;

    const user = await this.prisma.user.create({
      data: registerUSerDto,
      select: { email: true, id: true },
    });

    return user;
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
