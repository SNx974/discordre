import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubmitValidationDto } from '@matchmaking/shared';
import { ValidationsService } from './validations.service';

@Controller('validations')
@UseGuards(AuthGuard('jwt'))
export class ValidationsController {
  constructor(private readonly validations: ValidationsService) {}

  @Post()
  submit(@Body() dto: SubmitValidationDto, @Req() req: any) {
    return this.validations.submit(dto, req.user.discordId);
  }

  @Get('result/:resultId')
  listForResult(@Param('resultId') resultId: string) {
    return this.validations.listForResult(resultId);
  }
}