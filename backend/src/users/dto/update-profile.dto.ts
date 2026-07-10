import { Transform } from 'class-transformer'
import { IsOptional, IsString, Length, Matches, MaxLength, ValidateIf } from 'class-validator'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(1, 120)
  name?: string

  // Either an https URL (e.g. the Google profile photo) or a small inline
  // data URL produced by the avatar picker. Null clears the avatar.
  @ValidateIf((dto: UpdateProfileDto) => dto.avatarUrl !== undefined && dto.avatarUrl !== null)
  @IsString()
  @MaxLength(80_000)
  @Matches(/^(https:\/\/|data:image\/)/, {
    message: 'avatarUrl must be an https URL or a data:image URL',
  })
  avatarUrl?: string | null
}
