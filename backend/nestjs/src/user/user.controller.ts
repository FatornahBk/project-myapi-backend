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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @Get('admin/all')
  @ApiOperation({ summary: 'ดึงข้อมูลผู้ใช้งานทั้งหมด (สำหรับ Admin)' })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'กรองตาม Role (เช่น user, admin) ถ้าไม่ใส่จะดึงทั้งหมด',
  })
  async getAllUsers(@Query('role') role?: string) {
    return this.userService.findAllUsers(role);
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
  @Delete('admin/delete/:id')
  @ApiOperation({ summary: 'ลบบัญชีผู้ใช้งาน (สำหรับ Admin)' })
  async removeUser(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.userService.removeUser(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @Patch('admin/approve/:id')
  @ApiOperation({ summary: 'อนุมัติบัญชีสัตวแพทย์และส่งอีเมล (สำหรับ Admin)' })
  async approveUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.approveUser(id);
  }
}
