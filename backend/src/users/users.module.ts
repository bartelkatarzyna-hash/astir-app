import { Module } from '@nestjs/common'
import { JobBoardsModule } from '../job-boards/job-boards.module'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [JobBoardsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
