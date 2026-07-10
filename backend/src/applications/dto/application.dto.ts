import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'

// Kept in sync with the client's statusOptions. "Applied" and "Closed" sit
// outside the active pipeline; the stages between them show on Pipeline.
export const STATUS_OPTIONS = [
  'Applied',
  '1st stage',
  '2nd stage',
  '3rd stage',
  'Offer',
  'Hired',
  'Closed',
] as const

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

// One block of the rich-text note: a run of text or a checkbox.
class NoteBlockDto {
  @IsIn(['text', 'check'])
  type!: 'text' | 'check'

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string

  @IsOptional()
  @IsBoolean()
  checked?: boolean
}

class NoteDto {
  @IsOptional()
  @IsString()
  kind?: string

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  text?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteBlockDto)
  blocks?: NoteBlockDto[]
}

export class CreateApplicationDto {
  @IsOptional()
  @IsString()
  listingId?: string

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  company!: string

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  role!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  link?: string

  @IsOptional()
  @IsIn(STATUS_OPTIONS)
  status?: string

  @Matches(DATE_KEY, { message: 'appliedDate must be a YYYY-MM-DD date key' })
  appliedDate!: string

  @IsOptional()
  @ValidateNested()
  @Type(() => NoteDto)
  note?: NoteDto
}

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  company?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  role?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  link?: string

  @IsOptional()
  @IsIn(STATUS_OPTIONS)
  status?: string

  @IsOptional()
  @Matches(DATE_KEY, { message: 'appliedDate must be a YYYY-MM-DD date key' })
  appliedDate?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => NoteDto)
  note?: NoteDto
}
