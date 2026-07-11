import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RemoteJobBoardListing, RemoteJobBoardService } from './remote-job-board.service'

// Visible to every authenticated user (unlike the admin-only curation
// endpoints): the Remote Job Board is a normal feed, just sourced from the
// curated remote-company list.
@UseGuards(JwtAuthGuard)
@Controller('remote-job-board')
export class RemoteJobBoardController {
  constructor(private readonly remoteJobBoard: RemoteJobBoardService) {}

  @Get('listings')
  getListings(@CurrentUser() authUser: AuthenticatedUser): Promise<RemoteJobBoardListing[]> {
    return this.remoteJobBoard.listForUser(authUser.userId)
  }
}
