import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { RemoteCompany } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { CompanyResolutionService } from '../job-boards/company-resolution.service'
import { JobIngestionService } from '../job-boards/job-ingestion.service'
import { companyKey } from '../job-boards/normalized-job'

export type RemoteCompanyView = {
  id: string
  name: string
  careersUrl: string | null
  // resolved: found on an ATS and being polled; pending: still resolving;
  // unresolved: not on any ATS (its jobs won't surface until it resolves).
  resolutionStatus: string
  addedByEmail: string | null
  createdAt: Date
}

// Outcome of one line in a bulk import, so the admin sees exactly what
// happened to each company they pasted.
export type BulkResultRow = {
  name: string
  status: 'resolved' | 'unresolved' | 'duplicate' | 'invalid'
}

type CreateInput = { name: string; careersUrl?: string }

// Owns the global, admin-curated Remote Job Board company list. Resolution and
// polling reuse the shared job-board machinery: a remote company resolves to a
// JobSource exactly like a watchlist company, and the ingestion cron polls it
// because it is now referenced by a RemoteCompany (see POLLABLE_SOURCES).
@Injectable()
export class RemoteCompaniesService {
  private readonly logger = new Logger(RemoteCompaniesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolution: CompanyResolutionService,
    private readonly ingestion: JobIngestionService,
  ) {}

  async list(): Promise<RemoteCompanyView[]> {
    const companies = await this.prisma.remoteCompany.findMany({ orderBy: { createdAt: 'desc' } })
    return companies.map((company) => this.toView(company))
  }

  async add(input: CreateInput, addedByEmail: string): Promise<RemoteCompanyView> {
    const name = input.name.trim()
    const nameKey = companyKey(name)
    if (!nameKey) {
      throw new ConflictException('Company name is empty')
    }
    const existing = await this.prisma.remoteCompany.findUnique({ where: { nameKey } })
    if (existing) {
      throw new ConflictException('This company is already on the remote job board list')
    }
    const company = await this.prisma.remoteCompany.create({
      data: {
        name,
        nameKey,
        careersUrl: input.careersUrl?.trim() || null,
        resolutionStatus: 'pending',
        addedByEmail,
      },
    })
    await this.resolveAndSync(company)
    const saved = await this.prisma.remoteCompany.findUnique({ where: { id: company.id } })
    return this.toView(saved ?? company)
  }

  // Paste-many: one company per line, optional "Name, careersUrl". Lines are
  // resolved sequentially (resolution probes external ATS APIs, so we avoid a
  // burst) and each gets its own result row. A single failure never aborts the
  // batch.
  async bulkAdd(text: string, addedByEmail: string): Promise<BulkResultRow[]> {
    const rows: BulkResultRow[] = []
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) {
        continue
      }
      const [rawName, ...rest] = trimmed.split(',')
      const name = rawName.trim()
      const careersUrl = rest.join(',').trim() || undefined
      if (!companyKey(name)) {
        rows.push({ name: trimmed, status: 'invalid' })
        continue
      }
      try {
        const company = await this.add({ name, careersUrl }, addedByEmail)
        rows.push({
          name: company.name,
          status: company.resolutionStatus === 'resolved' ? 'resolved' : 'unresolved',
        })
      } catch (error) {
        if (error instanceof ConflictException) {
          rows.push({ name, status: 'duplicate' })
        } else {
          this.logger.warn(`Bulk add failed for "${name}": ${String(error)}`)
          rows.push({ name, status: 'unresolved' })
        }
      }
    }
    return rows
  }

  // Re-attempt resolution for a single company (e.g. after a new ATS provider
  // ships, an old "unresolved" company can now be found). Safe to call on an
  // already-resolved company — resolution reuses the existing source.
  async resolveById(id: string): Promise<RemoteCompanyView> {
    const company = await this.prisma.remoteCompany.findUnique({ where: { id } })
    if (!company) {
      throw new NotFoundException('Remote company not found')
    }
    await this.resolveAndSync(company)
    const saved = await this.prisma.remoteCompany.findUnique({ where: { id } })
    return this.toView(saved ?? company)
  }

  // Re-attempt every company not currently resolved (the "Not found" rows in
  // the admin panel). Sequential to avoid bursting external ATS APIs, matching
  // bulkAdd. Returns how many now resolve so the admin gets a summary.
  async refreshUnresolved(): Promise<{ attempted: number; resolved: number; unresolved: number }> {
    const companies = await this.prisma.remoteCompany.findMany({
      where: { resolutionStatus: { not: 'resolved' } },
      orderBy: { createdAt: 'asc' },
    })
    let resolved = 0
    for (const company of companies) {
      await this.resolveAndSync(company)
      const saved = await this.prisma.remoteCompany.findUnique({
        where: { id: company.id },
        select: { resolutionStatus: true },
      })
      if (saved?.resolutionStatus === 'resolved') {
        resolved += 1
      }
    }
    return { attempted: companies.length, resolved, unresolved: companies.length - resolved }
  }

  async remove(id: string): Promise<void> {
    const company = await this.prisma.remoteCompany.findUnique({ where: { id } })
    if (!company) {
      throw new NotFoundException('Remote company not found')
    }
    await this.prisma.remoteCompany.delete({ where: { id } })
    // The JobSource is intentionally left in place: it simply stops being
    // polled once nothing references it (mirrors watchlist removal).
  }

  // Resolve to an ATS board and pull it immediately so its jobs show on the
  // Remote Job Board without waiting for the hourly cron. Failures downgrade
  // the company to "unresolved" rather than failing the request.
  private async resolveAndSync(company: RemoteCompany): Promise<void> {
    let source
    try {
      source = await this.resolution.resolveToSource(company.name, company.careersUrl)
    } catch (error) {
      this.logger.warn(`Resolve failed for "${company.name}": ${String(error)}`)
      await this.prisma.remoteCompany.update({
        where: { id: company.id },
        data: { jobSourceId: null, resolutionStatus: 'unresolved' },
      })
      return
    }
    if (!source) {
      await this.prisma.remoteCompany.update({
        where: { id: company.id },
        data: { jobSourceId: null, resolutionStatus: 'unresolved' },
      })
      return
    }
    await this.prisma.remoteCompany.update({
      where: { id: company.id },
      data: { jobSourceId: source.id, resolutionStatus: 'resolved' },
    })
    // The company is resolved once the source is linked. A failure pulling its
    // jobs now (rate limit, a transient upstream error) must NOT downgrade it
    // back to "unresolved" — the hourly cron will retry the pull.
    try {
      await this.ingestion.syncOneSource(source)
    } catch (error) {
      this.logger.warn(
        `Initial sync failed for "${company.name}" (will retry on next poll): ${String(error)}`,
      )
    }
  }

  private toView(company: RemoteCompany): RemoteCompanyView {
    return {
      id: company.id,
      name: company.name,
      careersUrl: company.careersUrl,
      resolutionStatus: company.resolutionStatus,
      addedByEmail: company.addedByEmail,
      createdAt: company.createdAt,
    }
  }
}
