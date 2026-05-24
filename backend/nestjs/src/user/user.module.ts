import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ManageUserController } from './manage.user.controller';
import { VerifyUserController } from './verify.user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [ManageUserController, VerifyUserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
