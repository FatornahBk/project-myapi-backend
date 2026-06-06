import { Controller, Get, Query, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { BatchService } from 'src/batch/batch.service';
import { GetManageDataDto } from 'src/batch/dto/get-manage-data.dto';

@ApiTags('Manage Data')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('data')
export class ManageDataController {
  constructor(private readonly batchService: BatchService) {}

  @Get('admin/all')
  @ApiOperation({ summary: 'ดึงข้อมูลสถิติและตารางชุดข้อมูลทั้งหมด (สำหรับ Admin)' })
  async getAllData(@Query() queryDto: GetManageDataDto) {
    return this.batchService.getManageData(queryDto);
  }

  @Get('admin/:id')
  @ApiOperation({ summary: 'ดึงรายละเอียดชุดข้อมูล (สำหรับ Admin)' })
  async getBatchById(@Param('id', ParseIntPipe) id: number) {
    return this.batchService.getBatchDetails(id);
  }

  @Delete('admin/delete/:id')
  @ApiOperation({ summary: 'ลบชุดข้อมูลออกจากระบบ (สำหรับ Admin)' })
  async deleteBatch(@Param('id', ParseIntPipe) id: number) {
    return this.batchService.deleteBatch(id);
  }
}