import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BatchService } from './batch.service';
import { GetHomeDataDto } from './dto/get-home-data.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Home')
@ApiBearerAuth()
@Controller('home')
export class HomeController {
  constructor(private readonly batchService: BatchService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('cards')
  @ApiOperation({
    summary: 'ดึงชุดข้อมูล หน้าละ 20 รายการ',
  })
  async getHomeFeed(@Query() queryDto: GetHomeDataDto) {
    return this.batchService.getHomeFeed(queryDto);
  }
}
