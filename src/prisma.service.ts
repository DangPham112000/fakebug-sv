import { Injectable, OnModuleInit } from '@nestjs/common';
import { withAccelerate } from '@prisma/extension-accelerate';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super();
    this.$extends(withAccelerate());
  }

  async onModuleInit() {
    await this.$connect();
  }
}
