import { IsIn } from 'class-validator'

// Statuses a user can set on a job-board listing from the UI. 'new' is the
// default and shows in the main feed; 'irrelevant' tucks the listing into the
// quiet, below-the-fold section without deleting it, so it can be restored.
// Server-side statuses like 'dismissed' are intentionally not settable here.
export const USER_SETTABLE_LISTING_STATUSES = ['new', 'irrelevant'] as const
export type UserSettableListingStatus = (typeof USER_SETTABLE_LISTING_STATUSES)[number]

export class UpdateListingStatusDto {
  @IsIn(USER_SETTABLE_LISTING_STATUSES)
  status!: UserSettableListingStatus
}
