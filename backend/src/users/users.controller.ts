import { Body, Controller, Get, NotFoundException, Patch, Put, UseGuards } from '@nestjs/common'
import { User } from '@prisma/client'
import { isAdminEmail } from '../auth/admin'
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { WatchlistPreferencesDto } from './dto/watchlist-preferences.dto'
import { UsersService, WatchlistPreferencesInput } from './users.service'

type UserResponse = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  createdAt: Date
  // Whether this user may see the Admin Panel / curate the Remote Job Board.
  isAdmin: boolean
}

function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    isAdmin: isAdminEmail(user.email),
  }
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() authUser: AuthenticatedUser): Promise<UserResponse> {
    const user = await this.usersService.findById(authUser.userId)
    if (!user) {
      throw new NotFoundException('User no longer exists')
    }
    return toUserResponse(user)
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() authUser: AuthenticatedUser,
    @Body() body: UpdateProfileDto,
  ): Promise<UserResponse> {
    const user = await this.usersService.updateProfile(authUser.userId, body)
    return toUserResponse(user)
  }

  @Get('me/watchlist-preferences')
  getWatchlistPreferences(
    @CurrentUser() authUser: AuthenticatedUser,
  ): Promise<WatchlistPreferencesInput> {
    return this.usersService.getWatchlistPreferences(authUser.userId)
  }

  @Put('me/watchlist-preferences')
  async saveWatchlistPreferences(
    @CurrentUser() authUser: AuthenticatedUser,
    @Body() body: WatchlistPreferencesDto,
  ): Promise<WatchlistPreferencesInput> {
    await this.usersService.saveWatchlistPreferences(authUser.userId, body)
    return this.usersService.getWatchlistPreferences(authUser.userId)
  }
}
