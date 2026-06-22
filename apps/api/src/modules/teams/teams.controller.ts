import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeamRole } from '@prisma/client';
import { TeamsService, CreateTeamDto } from './teams.service';

@Controller('teams')
@UseGuards(AuthGuard('jwt'))
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  list() {
    return this.teams.list();
  }

  @Post()
  create(@Body() dto: CreateTeamDto) {
    return this.teams.create(dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.teams.findById(id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') teamId: string,
    @Body() body: { discordId: string; role?: TeamRole },
  ) {
    return this.teams.addMember(teamId, body.discordId, body.role);
  }
}