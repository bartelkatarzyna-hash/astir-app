import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { JobSource, Prisma } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { JobMatchingService } from './job-matching.service'
import { NormalizedJob, jobFingerprint } from './normalized-job'
import {
  AggregatorProvider,
  JOB_BOARD_PROVIDERS,
  JobBoardProvider,
  isAggregatorProvider,
} from './providers/job-board-provider'

// Which sources are worth polling. ATS boards are company-scoped, so we only
// poll ones a user actually watches; aggregator feeds span many companies and
// are always polled. Both must be enabled.
const POLLABLE_SOURCES: Prisma.JobSourceWhereInput = {
  enabled: true,
  OR: [{ kind: 'aggregator' }, { watchlistCompanies: { some: {} } }],
}

export type SyncSummary = {
  sources: number
  failedSources: number
  listingsSeen: number
  listingsCreated: number
  matchesCreated: number
}

@Injectable()
export class JobIngestionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobIngestionService.name)
  private readonly providersByName: Map<string, JobBoardProvider>
  private readonly aggregatorProviders: AggregatorProvider[]
  private syncing = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobMatching: JobMatchingService,
    @Inject(JOB_BOARD_PROVIDERS) providers: JobBoardProvider[],
  ) {
    this.providersByName = new Map(providers.map((provider) => [provider.provider, provider]))
    this.aggregatorProviders = providers.filter(isAggregatorProvider)
  }

  onApplicationBootstrap(): void {
    if (process.env.JOB_INGESTION_ENABLED === 'false') {
      this.logger.log('Job ingestion disabled via JOB_INGESTION_ENABLED=false')
      return
    }
    // First sync in the background; boot must not wait on job boards. Sources
    // come entirely from users' watchlists — a fresh database polls nothing
    // until a company is added.
    void this.syncAll().catch((error) =>
      this.logger.error(`Initial job sync failed: ${String(error)}`),
    )
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledSync(): Promise<void> {
    if (process.env.JOB_INGESTION_ENABLED === 'false') {
      return
    }
    await this.syncAll()
  }

  async syncAll(): Promise<SyncSummary> {
    const summary: SyncSummary = {
      sources: 0,
      failedSources: 0,
      listingsSeen: 0,
      listingsCreated: 0,
      matchesCreated: 0,
    }
    if (this.syncing) {
      this.logger.warn('Job sync already running, skipping')
      return summary
    }
    this.syncing = true
    try {
      await this.ensureAggregatorSources()
      const sources = await this.prisma.jobSource.findMany({ where: POLLABLE_SOURCES })
      summary.sources = sources.length
      for (const source of sources) {
        try {
          const result = await this.syncSource(source)
          summary.listingsSeen += result.seen
          summary.listingsCreated += result.created
        } catch (error) {
          summary.failedSources += 1
          this.logger.warn(`Sync failed for ${source.provider}/${source.externalId}: ${String(error)}`)
          await this.prisma.jobSource.update({
            where: { id: source.id },
            data: { lastSyncError: String(error) },
          })
        }
      }
      summary.matchesCreated = await this.jobMatching.rematchAllUsers()
      this.logger.log(
        `Job sync done: ${summary.listingsSeen} listings from ${summary.sources} sources ` +
          `(${summary.listingsCreated} new, ${summary.matchesCreated} new user matches, ` +
          `${summary.failedSources} sources failed)`,
      )
      return summary
    } finally {
      this.syncing = false
    }
  }

  // Pull a single board immediately (used when a watchlist company is added,
  // so its roles appear without waiting for the hourly cron). Does not rematch;
  // the caller decides whose matches to recompute.
  async syncOneSource(source: JobSource): Promise<{ seen: number; created: number }> {
    return this.syncSource(source)
  }

  // Aggregator feeds aren't created by watchlist resolution — each registered
  // aggregator owns exactly one always-polled source, seeded here so the feed
  // exists on a fresh database. Idempotent, and never clobbers an existing row
  // (e.g. one an operator disabled). A credentialed feed that isn't configured
  // (Adzuna without an API key) is skipped, so a keyless environment never
  // grows an empty, perpetually-failing source.
  private async ensureAggregatorSources(): Promise<void> {
    for (const provider of this.aggregatorProviders) {
      if (provider.isEnabled && !provider.isEnabled()) {
        continue
      }
      await this.prisma.jobSource.upsert({
        where: {
          provider_externalId: { provider: provider.provider, externalId: provider.feed.externalId },
        },
        update: {},
        create: {
          provider: provider.provider,
          kind: 'aggregator',
          externalId: provider.feed.externalId,
          companyName: provider.feed.companyName,
        },
      })
    }
  }

  private async syncSource(source: JobSource): Promise<{ seen: number; created: number }> {
    const provider = this.providersByName.get(source.provider)
    if (!provider) {
      throw new Error(`No provider registered for "${source.provider}"`)
    }
    const jobs = await provider.fetchListings({
      externalId: source.externalId,
      companyName: source.companyName,
    })
    const now = new Date()
    let created = 0
    for (const job of jobs) {
      created += await this.upsertListing(job, source.id, now)
    }
    await this.prisma.jobSource.update({
      where: { id: source.id },
      data: { lastSyncedAt: now, lastSyncError: null },
    })
    return { seen: jobs.length, created }
  }

  // Consolidation: the listing is keyed by fingerprint, so the same opening
  // arriving from a second provider only adds a JobListingSource row.
  private async upsertListing(job: NormalizedJob, jobSourceId: string, now: Date): Promise<number> {
    const fingerprint = jobFingerprint(job)
    const existing = await this.prisma.jobListing.findUnique({ where: { fingerprint } })
    const listing = existing
      ? await this.prisma.jobListing.update({
          where: { fingerprint },
          data: {
            lastSeenAt: now,
            // Fill blanks a later provider can answer, never overwrite —
            // except locations, where every provider's knowledge is unioned.
            location: existing.location ?? job.location,
            locations: [...new Set([...existing.locations, ...job.locations])],
            workMode: existing.workMode ?? job.workMode,
            postedAt: existing.postedAt ?? job.postedAt,
          },
        })
      : await this.prisma.jobListing.create({
          data: {
            fingerprint,
            title: job.title,
            companyName: job.companyName,
            location: job.location,
            locations: job.locations,
            workMode: job.workMode,
            url: job.url,
            postedAt: job.postedAt,
            firstSeenAt: now,
            lastSeenAt: now,
          },
        })
    await this.prisma.jobListingSource.upsert({
      where: { provider_externalId: { provider: job.provider, externalId: job.externalId } },
      update: { lastSeenAt: now, url: job.url, listingId: listing.id, jobSourceId },
      create: {
        listingId: listing.id,
        jobSourceId,
        provider: job.provider,
        externalId: job.externalId,
        url: job.url,
        lastSeenAt: now,
      },
    })
    return existing ? 0 : 1
  }
}
