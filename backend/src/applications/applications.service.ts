import { Injectable, NotFoundException } from '@nestjs/common'
import { Application, JobListing, Prisma } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { CreateApplicationDto, UpdateApplicationDto } from './dto/application.dto'

// Enough of the canonical posting to render the pipeline meta line and the
// Location/Type/Posted columns on the applications table.
export type ApplicationPosting = {
  url: string
  // The provider's actual posting date. Null when the provider didn't supply
  // one — the client shows an em-dash rather than guessing.
  postedAt: Date | null
  // When our crawler first ingested the listing (discovery date). Kept for
  // "Recently added" ordering; not shown as the posted date.
  firstSeenAt: Date
  location: string | null
  workMode: string | null
  locations: string[]
}

export type ApplicationView = {
  id: string
  listingId: string | null
  company: string
  role: string
  link: string | null
  status: string
  appliedDate: string
  stageChangedAt: Date
  note: unknown
  posting: ApplicationPosting | null
}

type ApplicationWithListing = Application & { listing: JobListing | null }

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<ApplicationView[]> {
    const applications = await this.prisma.application.findMany({
      where: { userId },
      include: { listing: true },
      orderBy: { stageChangedAt: 'desc' },
    })
    return applications.map((application) => this.toView(application))
  }

  async create(userId: string, input: CreateApplicationDto): Promise<ApplicationView> {
    const listingId = await this.resolveListingId(input.listingId)
    const application = await this.prisma.application.create({
      data: {
        userId,
        listingId,
        company: input.company.trim(),
        role: input.role.trim(),
        link: input.link?.trim() || null,
        status: input.status ?? 'Applied',
        appliedDate: input.appliedDate,
        note: this.noteValue(input.note),
      },
      include: { listing: true },
    })
    return this.toView(application)
  }

  async update(userId: string, id: string, input: UpdateApplicationDto): Promise<ApplicationView> {
    const existing = await this.owned(userId, id)
    const statusChanged = input.status !== undefined && input.status !== existing.status
    const application = await this.prisma.application.update({
      where: { id },
      data: {
        ...(input.company !== undefined ? { company: input.company.trim() } : {}),
        ...(input.role !== undefined ? { role: input.role.trim() } : {}),
        ...(input.link !== undefined ? { link: input.link.trim() || null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.appliedDate !== undefined ? { appliedDate: input.appliedDate } : {}),
        ...(input.note !== undefined ? { note: this.noteValue(input.note) } : {}),
        ...(statusChanged ? { stageChangedAt: new Date() } : {}),
      },
      include: { listing: true },
    })
    return this.toView(application)
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.owned(userId, id)
    await this.prisma.application.delete({ where: { id } })
  }

  private async owned(userId: string, id: string): Promise<Application> {
    const application = await this.prisma.application.findFirst({ where: { id, userId } })
    if (!application) {
      throw new NotFoundException('Application not found')
    }
    return application
  }

  // Only keep a listing link that actually exists; a stale id becomes a
  // free-standing (manual) application rather than a foreign-key failure.
  private async resolveListingId(listingId?: string): Promise<string | null> {
    if (!listingId) {
      return null
    }
    const listing = await this.prisma.jobListing.findUnique({ where: { id: listingId } })
    return listing ? listing.id : null
  }

  private noteValue(note: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (note === undefined || note === null) {
      return Prisma.JsonNull
    }
    return note as Prisma.InputJsonValue
  }

  private toView(application: ApplicationWithListing): ApplicationView {
    const listing = application.listing
    return {
      id: application.id,
      listingId: application.listingId,
      company: application.company,
      role: application.role,
      link: application.link,
      status: application.status,
      appliedDate: application.appliedDate,
      stageChangedAt: application.stageChangedAt,
      note: application.note ?? null,
      posting: listing
        ? {
            url: listing.url,
            postedAt: listing.postedAt,
            firstSeenAt: listing.firstSeenAt,
            location: listing.location,
            workMode: listing.workMode,
            locations: listing.locations,
          }
        : null,
    }
  }
}
