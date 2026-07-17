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

@ApiTags('Manage Users')
@Controller('user')
export class ManageUserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @Get('admin/all')
  @ApiOperation({ summary: 'ดึงข้อมูลผู้ใช้งานทั้งหมดที่ Verify แล้ว (สำหรับ Admin)' })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'กรองตาม Role (เช่น user, admin) ถ้าไม่ใส่จะดึงทั้งหมด',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'ค้นหาด้วยอีเมล (พิมพ์แค่บางส่วนได้)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'กรองตามสถานะบัญชี (all, active, suspend) ถ้าไม่ใส่จะดึงทั้งหมด',
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
  async getAllUsers(
    @Query('role') role?: string,
    @Query('email') email?: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.userService.findAllUsers(role, email, status, page, limit);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @Patch('admin/update-role/:id')
  @ApiOperation({ summary: 'แก้ไข Role ของผู้ใช้งาน (สำหรับ Admin)' })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.userService.updateRole(id, updateRoleDto);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @Patch('admin/suspend/:id')
  @ApiOperation({ summary: 'ระงับบัญชีผู้ใช้งาน (สำหรับ Admin)' })
  async suspendUser(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.userService.suspendUser(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @Patch('admin/activate/:id')
  @ApiOperation({ summary: 'ปลดระงับบัญชีผู้ใช้งาน (สำหรับ Admin)' })
  async activateUser(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userService.activateUser(id);
  }
}
