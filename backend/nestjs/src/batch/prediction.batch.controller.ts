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
  @ApiQuery({
    name: 'smear_id',
    required: false,
    description: 'ค้นหาด้วยรหัสชุดข้อมูล (Smear ID)',
  })
  @ApiQuery({
    name: 'chicken_type',
    required: false,
    description: 'กรองตามสายพันธุ์/ประเภทไก่',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'ตั้งแต่วันที่สร้างชุดข้อมูล (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'ถึงวันที่สร้างชุดข้อมูล (YYYY-MM-DD)',
  })
  async getPendingPredictions(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('stain_type') stainType?: string,
    @Query('smear_id') smearId?: string,
    @Query('chicken_type') chickenType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.batchService.findPendingBatchesForPrediction(
      req.user.userId,
      page,
      stainType,
      smearId,
      chickenType,
      startDate,
      endDate,
    );
  }
}
