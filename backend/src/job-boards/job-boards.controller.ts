import { Controller, Get, Post, UseGuards } from '@nestjs/common'
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { JobIngestionService, SyncSummary } from './job-ingestion.service'
import { JobBoardsService, JobBoardListing } from './job-boards.service'

@UseGuards(JwtAuthGuard)
@Controller('job-boards')
export class JobBoardsController {
  constructor(
    private readonly jobBoardsService: JobBoardsService,
    private readonly jobIngestionService: JobIngestionService,
  ) {}

  @Get('listings')
  getListings(@CurrentUser() authUser: AuthenticatedUser): Promise<JobBoardListing[]> {
    return this.jobBoardsService.listForUser(authUser.userId)
  }

  // Manual refresh; the hourly cron does the same in the background.
  @Post('sync')
  triggerSync(): Promise<SyncSummary> {
    return this.jobIngestionService.syncAll()
  }
}
