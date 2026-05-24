import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { BatchService } from './batch.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Prediction')
@ApiBearerAuth()
@Controller('batches')
export class PredictionBatchController {
  constructor(private readonly batchService: BatchService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('prediction/pending')
  @ApiOperation({ summary: 'ดึงข้อมูลชุดรูปภาพเม็ดเลือดที่ยังไม่ได้ทำนาย' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'เลขหน้าข้อมูลที่ต้องการดึง (เริ่มต้นที่หน้า 1, ส่งคืนทีละ 5 ชุดข้อมูล)',
    example: 1,
  })
  @ApiQuery({
    name: 'stain_type',
    required: false,
    description:
      'กรองตามประเภทการย้อมสี เช่น "Wright" หรือ "Giemsa"',
  })
  async getPendingPredictions(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('stain_type') stainType?: string,
  ) {
    return this.batchService.findPendingBatchesForPrediction(
      req.user.userId,
      page,
      stainType,
    );
  }
}
