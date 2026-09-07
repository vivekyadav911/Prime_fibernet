# Officer Attendance Runbook

Current developer notes for the officer attendance workflow in the unified Expo app.
This covers the shipped React Native + Supabase implementation, not the original
planning specs under `docs/source/`.

## Intent

Officer attendance verifies that field officers are in an assigned geofence before
they start or finish a shift, while still allowing admins to approve legitimate
out-of-zone exceptions. The client keeps the officer app responsive by caching
geofences, polling today's attendance, and queueing selected mutations while
offline.

## Entry points

| Surface | Source | Notes |
| --- | --- | --- |
| Officer root gate | `apps/unified-app/src/navigation/OfficerNavigator.tsx` | Starts at `LocationGate`; replaces with `OfficerTabs` once location access is granted. |
| Officer tabs | `apps/unified-app/src/navigation/OfficerTabNavigator.tsx` | Mounts Dashboard, Tickets, Attendance, Payments, and Settings stacks with a custom tab bar. |
| Attendance stack | `apps/unified-app/src/navigation/OfficerAttendanceStackNav.tsx` | `AttendanceHome` and `Shifts` both render `OfficerAttendanceDashboard`; `AttendanceHistory` opens the month view. |
| Attendance dashboard | `apps/unified-app/src/screens/officer/OfficerAttendanceDashboard.tsx` | Main check-in/check-out, zone status, approval prompt, monthly summary, and recent records. |
| Attendance history | `apps/unified-app/src/screens/officer/AttendanceHistoryScreen.tsx` | Calendar/list views backed by canonical day status rows. |
| Admin approvals | `apps/unified-app/src/screens/admin/hr/ApprovalRequestsScreen.tsx` | Admin review queue with single and bulk approve/reject actions plus audit log expansion. |

Role routing is enforced before these stacks mount in
`apps/unified-app/src/navigation/AppNavigator.tsx`: non-admin web users are sent
to the unsupported screen, and officers only mount when the authenticated DB role
is resolved as `officer` and MFA is not pending.

## Runtime flow

1. `LocationGateScreen` requires foreground location before the officer shell is
   entered. Inside the attendance dashboard, `LocationPermissionGate` distinguishes:
   - `blocked`: no foreground permission; check-in UI is gated.
   - `limited`: foreground granted but background denied; manual check-in works,
     automatic/background zone detection is limited.
   - `full`: foreground and background permissions are granted.
2. `useMyAssignedZones` fetches active geofences for the current officer via
   `getMyGeofences`, refreshes on app foreground at most every 30 seconds, and
   picks the nearest assigned zone when multiple zones exist.
3. `AttendanceService.checkIn()` and `checkOut()` force-refresh geofences, request
   a high-accuracy GPS fix, reject accuracy worse than 100m, and verify the current
   location with `checkGeofenceStatus()`.
4. Inside-zone check-in inserts a `shifts` row through the RTK Query `checkIn`
   endpoint with:
   - `status = 'active'`
   - `attendance_status = 'present'`
   - `check_in_method = 'manual_inside'`
   - PostGIS `POINT(longitude latitude)` in `location`
5. Check-out updates today's active `shifts` row with `check_out_time`,
   `check_out_location`, `check_out_method = 'manual_inside'`, rounded
   `working_hours`, and `status = 'completed'`.
6. Out-of-zone check-in/check-out opens an approval prompt instead of writing a
   shift directly. Approval requests are stored in `attendance_approval_requests`
   and reviewed by admins through `review_attendance_approval`.
7. Officer realtime sync listens to Supabase changes on `shifts` and
   `attendance_approval_requests`, invalidates attendance/approval caches, and
   sends local notifications when an approval is accepted or rejected.

## Data and API map

| Concern | Client source | Supabase object |
| --- | --- | --- |
| Today's record | `useTodayAttendance()` / `getTodayAttendance` | `shifts`, filtered by current officer and `company_local_today()` |
| Monthly calendar/list | `useOfficerMonthAttendance()` | RPC `get_attendance_status_by_day` plus `shifts` fallback rows |
| Assigned zones | `useMyAssignedZones()` / `getMyGeofences` | `geofence_officer_assignments` joined to active `geofences` |
| Check-in | `AttendanceService.checkIn()` / `checkIn` mutation | Inserts `shifts` |
| Check-out | `AttendanceService.checkOut()` / `checkOut` mutation | Updates active `shifts` row |
| Out-of-zone approval | `requestOutOfZoneApproval()` / `requestApproval` mutation | Inserts `attendance_approval_requests` |
| Admin review | `useReviewApproval()` / `reviewApproval` mutation | RPC `review_attendance_approval` |
| Live officer map | `updateOfficerLocation` mutation | `officers`, `officer_location_events`, `officer_locations` |

Relevant migrations:

- `20260611120000_geofence_attendance.sql` creates geofences, approvals,
  officer location events, and the attendance RLS baseline.
- `20260704120000_attendance_status_canonical.sql` adds the canonical day-status
  RPC used by calendar views.
- `20260710100000_attendance_company_local_today.sql` switches attendance date
  checks to company-local dates.
- `20260713010000_attendance_approval_dedupe_notify.sql` deduplicates pending
  approval requests per officer/type/day.
- `20260713020000_block_second_checkin_after_completed.sql` blocks second
  check-ins after a shift is completed.

## Operational constraints

- One completed attendance record is allowed per officer per company-local day.
  After check-out, new check-ins and check-in approvals are rejected with
  `shift_already_completed` semantics.
- Officers must have at least one active assigned geofence before check-in.
- GPS accuracy must be 100m or better for check-in/check-out.
- Offline inside-zone check-in/check-out and approval attempts are queued through
  `SyncManager`; failed replays move to the failed queue after three retries.
- Geofence caching lasts 15 minutes in `LocationService`, but attendance actions
  clear the cache before evaluating location.
- Web skips native location permission gating for the in-screen attendance gate,
  but `AppNavigator` does not mount officer/customer experiences on web.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Officer cannot enter the portal | Confirm foreground location permission; `LocationGateScreen` only replaces to `OfficerTabs` when permission is granted. |
| "No zone assigned" on check-in | Verify `geofence_officer_assignments` has an active geofence for the current officer. |
| Outside-zone approval submits repeatedly | Pending requests are deduped by officer, type, and attendance date; inspect `attendance_approval_requests` for an existing `pending` row. |
| Calendar has missing or odd statuses | Compare `get_attendance_status_by_day` output with raw `shifts` rows for the same month; the UI merges RPC rows with provisional shift rows only as a fallback. |
| Admin approval does not update officer UI | Check Supabase Realtime publication includes `attendance_approval_requests` and `shifts`, then confirm `useOfficerAttendanceRealtimeSync(true)` is mounted on the dashboard. |
| Location appears stale on admin maps | Check `updateOfficerLocation` writes to `officers`, appends `officer_location_events`, and upserts `officer_locations`; background tracking also respects global/officer tracking settings. |

## Developer checklist for changes

- Keep attendance server state in `apps/unified-app/src/services/api/attendanceApi.ts`
  or service wrappers; screens should not issue parallel Supabase queries.
- Keep the officer shell route list in sync between
  `OfficerTabNavigator.tsx`, stack param types in `types/navigation.ts`, and any
  helper in `navigation/officerShellNavigation.ts`.
- Preserve loading, error, and empty states on attendance screens.
- For schema or policy changes, add a migration under `supabase/migrations/` and
  deploy it through Supabase MCP before marking the feature complete.
- If changing approval semantics, update both the client service checks and the
  `review_attendance_approval` RPC so officers and admins see the same rules.
