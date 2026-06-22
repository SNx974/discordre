import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query('limit') limit?: string) {
    return this.users.list(limit ? parseInt(limit, 10) : undefined);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.users.findById(id);
  }

  @Get('discord/:discordId')
  getByDiscord(@Param('discordId') discordId: string) {
    return this.users.findByDiscordId(discordId);
  }
}