import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ManageUserController } from './manage.user.controller';
import { VerifyUserController } from './verify.user.controller';
import { Batch } from 'src/batch/entities/batch.entity';
import { Image } from 'src/batch/entities/image.entity';
import { Detection } from 'src/prediction/entities/detection.entity';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Batch, Image, Detection])],
  controllers: [ManageUserController, VerifyUserController, DashboardController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
