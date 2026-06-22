import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MatchStatus } from '@prisma/client';
import { CreateMatchDto } from '@matchmaking/shared';
import { MatchesService } from './matches.service';

@Controller('matches')
@UseGuards(AuthGuard('jwt'))
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get()
  list(@Query('status') status?: MatchStatus) {
    return this.matches.list(status);
  }

  @Post()
  create(@Body() dto: CreateMatchDto, @Req() req: any) {
    const discordId = req.user.discordId;
    return this.matches.create(dto, discordId);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.matches.findById(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.matches.cancel(id, req.user.discordId);
  }
}