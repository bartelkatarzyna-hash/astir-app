import { Module } from '@nestjs/common'
import { JobBoardsModule } from '../job-boards/job-boards.module'
import { WatchlistController } from './watchlist.controller'
import { WatchlistService } from './watchlist.service'

@Module({
  imports: [JobBoardsModule],
  controllers: [WatchlistController],
  providers: [WatchlistService],
})
export class WatchlistModule {}
