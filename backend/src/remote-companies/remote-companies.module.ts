import { Module } from '@nestjs/common'
import { JobBoardsModule } from '../job-boards/job-boards.module'
import { RemoteCompaniesController } from './remote-companies.controller'
import { RemoteCompaniesService } from './remote-companies.service'
import { RemoteJobBoardController } from './remote-job-board.controller'
import { RemoteJobBoardService } from './remote-job-board.service'

// The global, admin-curated Remote Job Board. Curation (admin-only) and the
// per-user feed live together; both reuse the shared job-board services
// exported by JobBoardsModule.
@Module({
  imports: [JobBoardsModule],
  controllers: [RemoteCompaniesController, RemoteJobBoardController],
  providers: [RemoteCompaniesService, RemoteJobBoardService],
})
export class RemoteCompaniesModule {}
