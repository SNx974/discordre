import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ResultsService } from './results.service';

@Controller('results')
@UseGuards(AuthGuard('jwt'))
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Get('match/:matchId')
  listByMatch(@Param('matchId') matchId: string) {
    return this.results.getByMatch(matchId);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.results.findById(id);
  }
}