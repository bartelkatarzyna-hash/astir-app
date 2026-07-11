import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { AdminGuard } from '../auth/admin.guard'
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { BulkRemoteCompanyDto, CreateRemoteCompanyDto } from './dto/remote-company.dto'
import { BulkResultRow, RemoteCompaniesService, RemoteCompanyView } from './remote-companies.service'

// Admin-only: curates the global Remote Job Board company list. JwtAuthGuard
// populates the user; AdminGuard restricts to the ADMIN_EMAILS allow-list.
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('remote-companies')
export class RemoteCompaniesController {
  constructor(private readonly remoteCompanies: RemoteCompaniesService) {}

  @Get()
  list(): Promise<RemoteCompanyView[]> {
    return this.remoteCompanies.list()
  }

  @Post()
  add(
    @CurrentUser() authUser: AuthenticatedUser,
    @Body() body: CreateRemoteCompanyDto,
  ): Promise<RemoteCompanyView> {
    return this.remoteCompanies.add(body, authUser.email)
  }

  @Post('bulk')
  bulkAdd(
    @CurrentUser() authUser: AuthenticatedUser,
    @Body() body: BulkRemoteCompanyDto,
  ): Promise<BulkResultRow[]> {
    return this.remoteCompanies.bulkAdd(body.text, authUser.email)
  }

  // Re-attempt resolution for every "Not found" company — used after a new ATS
  // provider ships so previously unresolvable companies get picked up.
  @Post('refresh')
  refresh(): Promise<{ attempted: number; resolved: number; unresolved: number }> {
    return this.remoteCompanies.refreshUnresolved()
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string): Promise<RemoteCompanyView> {
    return this.remoteCompanies.resolveById(id)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.remoteCompanies.remove(id)
  }
}
