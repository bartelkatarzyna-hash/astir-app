import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

// How far along the user is on building referral contacts at a company.
export const NETWORKING_STAGES = ['none', 'active', 'warm'] as const
export type NetworkingStage = (typeof NETWORKING_STAGES)[number]

export class CreateWatchlistCompanyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  careersUrl?: string

  @IsOptional()
  @IsBoolean()
  alertsOn?: boolean
}

export class UpdateWatchlistCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  careersUrl?: string

  @IsOptional()
  @IsBoolean()
  alertsOn?: boolean

  @IsOptional()
  @IsIn(NETWORKING_STAGES)
  networkingStage?: NetworkingStage

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  networkingNotes?: string
}
