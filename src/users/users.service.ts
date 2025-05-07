import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOneByAccountId({ accountId }: { accountId: number }): Promise<any> {
    if (!accountId) {
      throw new BadRequestException('Account id is required', {
        cause: new Error(),
        description: 'Account id is required',
      });
    }

    const user = await this.prisma.user.findFirst({ where: { accountId } });

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<any> {
    const user = await this.prisma.user.create({
      data: createUserDto,
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

  async findMany() {
    const users = await this.prisma.user.findMany();
    return users;
  }

  // update(id: number, updateUserDto: UpdateUserDto) {
  //   return `This action updates a #${id} user`;
  // }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
