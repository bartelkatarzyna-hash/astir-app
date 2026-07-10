import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ApplicationsService, ApplicationView } from './applications.service'
import { CreateApplicationDto, UpdateApplicationDto } from './dto/application.dto'

@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  list(@CurrentUser() authUser: AuthenticatedUser): Promise<ApplicationView[]> {
    return this.applicationsService.list(authUser.userId)
  }

  @Post()
  create(
    @CurrentUser() authUser: AuthenticatedUser,
    @Body() body: CreateApplicationDto,
  ): Promise<ApplicationView> {
    return this.applicationsService.create(authUser.userId, body)
  }

  @Patch(':id')
  update(
    @CurrentUser() authUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateApplicationDto,
  ): Promise<ApplicationView> {
    return this.applicationsService.update(authUser.userId, id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() authUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.applicationsService.remove(authUser.userId, id)
  }
}
