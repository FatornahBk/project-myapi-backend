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

@ApiTags('Verify Users')
@Controller('user')
export class VerifyUserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @Get('admin/pending')
  @ApiOperation({ summary: 'ดึงข้อมูลสัตวแพทย์ที่รอการอนุมัติหรือถูกปฏิเสธ (สำหรับ Admin)' })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'ค้นหาด้วยอีเมล (พิมพ์แค่บางส่วนได้)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'กรองตามสถานะ all, pending, reject ถ้าไม่ใส่จะดึงทั้งหมด',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'หน้าปัจจุบัน',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'จำนวนรายการต่อหน้า',
    type: Number,
    example: 10,
  })
  async getUnverifiedUsers(
    @Query('email') email?: string,
    @Query('status') status: string = 'all',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.userService.findUnverifiedUsers(email, status, page, limit);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @Patch('admin/approve/:id')
  @ApiOperation({ summary: 'อนุมัติบัญชีสัตวแพทย์และส่งอีเมล (สำหรับ Admin)' })
  async approveUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.approveUser(id);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @Patch('admin/reject/:id')
  @ApiOperation({ summary: 'ปฏิเสธบัญชีสัตวแพทย์และส่งอีเมล (สำหรับ Admin)' })
  async rejectUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.rejectUser(id);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @Patch('admin/undo-reject/:id')
  @ApiOperation({ summary: 'ยกเลิกการปฏิเสธบัญชี (สำหรับ Admin)' })
  async undoRejectUser(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userService.undoRejectUser(id);
  }
}
