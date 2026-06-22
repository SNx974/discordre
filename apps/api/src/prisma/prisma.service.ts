import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService {
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  get client(): PrismaClient {
    return this.prisma;
  }

  // Helper commun : transaction type-safe
  async $transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}