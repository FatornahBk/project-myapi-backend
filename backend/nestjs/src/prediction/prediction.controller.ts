import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Prediction Output')
@ApiBearerAuth()
@Controller('prediction')
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('save')
  @ApiOperation({ summary: 'รับมัดรวมผลการทำนายและข้อความบันทึกจากหน้าเว็บเพื่อลงฐานข้อมูลหลัก' })
  async createPredictionResults(@Body() createPredictionDto: CreatePredictionDto) {
    return this.predictionService.saveResultsPrediction(createPredictionDto);
  }
}
