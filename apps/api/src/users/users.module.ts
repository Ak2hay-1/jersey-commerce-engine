import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersAdminController } from './users-admin.controller';
import { UsersAdminService } from './users-admin.service';

@Module({
  controllers: [UsersController, UsersAdminController],
  providers: [UsersService, UsersAdminService],
  exports: [UsersService, UsersAdminService],
})
export class UsersModule {}
