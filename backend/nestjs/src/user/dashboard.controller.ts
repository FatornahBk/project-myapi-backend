import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { UpdateRoleDto } from './dto/update-role.dto';
import { GetDashboardDto } from './dto/get-dashboard.dto';

@ApiTags('Dashboard')
@Controller('user')
export class DashboardController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @Get('admin/dashboard')
  @ApiOperation({ summary: 'ดึงข้อมูลสถิติรวมทั้งหมด (สำหรับ Admin)' })
  async getDashboardStatistics(@Query() queryDto: GetDashboardDto) {
    return this.userService.getDashboardStats(queryDto);
  }
}
