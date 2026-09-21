# Officer Portal Runbook

_Last verified against `apps/unified-app/src` on September 21, 2026._

This runbook documents the React Native officer portal implementation: navigation shell, live sync, attendance, map, and collection workflows. Use it when extending officer-facing screens or debugging field-ops behavior.

## Runtime shape

The officer portal is part of the unified Expo app, not a separate app.

```text
AppNavigator
  -> OfficerNavigator
       -> LocationGate
       -> OfficerTabs
            Dashboard
            Tickets
            Attendance
            Payments
            Settings
       -> Profile
       -> RequestDetail
```

Key files:

| Area                   | Files                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root officer stack     | `src/navigation/OfficerNavigator.tsx`                                                                                                                       |
| Bottom tab shell       | `src/navigation/OfficerTabNavigator.tsx`, `src/components/navigation/officer/OfficerTabBar.tsx`                                                             |
| Nested stacks          | `OfficerDashboardStackNav.tsx`, `officerStackNavigators.tsx`, `OfficerAttendanceStackNav.tsx`, `OfficerPaymentsStackNav.tsx`, `OfficerSettingsStackNav.tsx` |
| Route types            | `src/types/navigation.ts`                                                                                                                                   |
| Cross-shell helpers    | `src/navigation/officerShellNavigation.ts`                                                                                                                  |
| Shared screen wrappers | `src/components/officer/OfficerScreen.tsx`, `OfficerScreenWrapper.tsx`                                                                                      |

The legacy officer drawer route type is still present as a deprecated compatibility type. New work should target `OfficerTabParamList` and the nested stack param lists.

## Navigation rules

- `OfficerNavigator` starts at `LocationGate`. The gate checks foreground location permission and calls `navigation.replace('OfficerTabs')` when access is granted.
- The tab shell has five tabs: Dashboard, Tickets, Attendance, Payments, and Settings.
- Profile is a root stack outside the tabs. Use `navigateToOfficerProfile` when opening profile screens from tab children.
- `RequestDetail` is also on the root officer stack so tickets/requests can open details from different tabs.
- For cross-tab navigation, use `src/navigation/officerShellNavigation.ts` instead of manually dispatching nested `CommonActions`.

Example:

```ts
import { navigateToOfficerPayments } from '@/navigation/officerShellNavigation';

navigateToOfficerPayments(navigation, {
  screen: 'CollectionsList',
  params: { initialTab: 'open_pool' },
});
```

When adding a new officer screen:

1. Add the route to the correct param list in `src/types/navigation.ts`.
2. Register it in the relevant officer stack navigator.
3. If it must be reachable across tabs, add or reuse a helper in `officerShellNavigation.ts`.
4. Use the existing `OfficerStackHeader` / `OfficerHeaderActions` pattern unless the screen intentionally hides the header.

## Data flow and refresh behavior

Officer screens use RTK Query through `baseApi`; screens should not fetch Supabase data directly.

| Workflow                     | Primary API/hooks                                                                                 | Notes                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Tickets and service requests | `officerPortalApi`, `useOfficerAssignedTickets`, `useOfficerTicketsSync`                          | Combines assigned tickets, open-pool tickets, and officer-scoped service requests into portal items.                         |
| Attendance and geofences     | `attendanceApi`, `useTodayAttendance`, `useOfficerMonthAttendance`, `useActiveShift`              | Check-in/out can return approval, offline, already-complete, or success outcomes.                                            |
| Collections                  | `paymentCollectionApi`, `collectionAssignmentsApi`, `useOfficerCollections`, `useClaimCollection` | Supports assigned work, open-pool claims, cash, UPI/manual payment submission, and offline queueing for non-policy failures. |
| Notifications/contracts      | `portalNotificationsApi`, `employmentContractsApi`, `usePortalNotificationsSync`                  | Notification inserts invalidate notification and contract caches.                                                            |
| Admin/officer tracking map   | `officerTrackingApi`                                                                              | Reads live officer locations and history for admin tracking views.                                                           |

`OfficerTabNavigator` mounts `usePortalNotificationsSync`, `useOfficerTicketsSync`, and `useOfficerTabBackHandler` once for the tab shell.

Pull-to-refresh is centralized:

- `OfficerScreen` and `OfficerScreenWrapper` call `useOfficerPullToRefresh`.
- `useOfficerPullToRefresh` invalidates `OFFICER_REFRESH_TAGS` in `src/utils/invalidateOfficerCaches.ts`.
- Pass an extra `onRefresh`/`refetch` only when the screen also needs an immediate local refetch after tag invalidation.

If a new officer API slice uses data that should refresh from any officer screen, add its tag to `OFFICER_REFRESH_TAGS`.

## Location, map, and attendance constraints

- `LocationGateScreen` only requires foreground permission before opening the portal.
- `useLocation` requests foreground permission by default and background permission only when called with `enableBackground: true`.
- The default watcher mirrors the Flutter service cadence: 30 seconds or 10 meters.
- `OfficerMapScreen` renders portal items that have coordinates. Items without coordinates stay out of the pin list and the empty state tells the officer to contact dispatch if assigned items are missing pins.
- `LeafletMapView` is the shared map surface for officer maps. Do not add screen-local map primitives unless the shared map component cannot support the behavior.
- `useActiveShift` prevents a second completed attendance cycle on the same day. Outside-zone check-in/out returns `needs_approval`; offline actions return `offline_queued`.

## Payment collection constraints

- Assigned and open-pool collection queues live under `OfficerPaymentsStackNav -> CollectionsStack`.
- Open-pool claims call `claim_collection_customer` through `paymentCollectionApi`.
- Cash collection stores GPS coordinates when available and falls back to the offline `SyncManager` only for retryable submission failures.
- Policy/assignment failures are surfaced to the officer and are not queued offline.
- UPI/manual collection requires a reference of at least four characters and is sent for admin verification.
- QR-based UPI requires an active bank account with a UPI VPA configured by admin.

## Troubleshooting checklist

| Symptom                                      | Check                                                                                                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Officer cannot enter portal                  | Confirm foreground location permission and device location services; `LocationGateScreen` opens app settings after denial.                                                                |
| Tickets do not update live                   | Verify the auth user resolves to an officer ID, then inspect `useOfficerTicketsSync` subscriptions for `tickets`, `ticket_activity_events`, `service_requests`, and `request_activities`. |
| Pull-to-refresh misses a screen              | Confirm the API slice provides one of `OFFICER_REFRESH_TAGS`, or add the missing tag.                                                                                                     |
| Map has list items but no pins               | Check `getPortalItemCoordinates` inputs: ticket/request coordinates, linked request rows, and customer address.                                                                           |
| Collection claim fails                       | Check the `claim_collection_customer` RPC result and RLS/assignment state; claimed-by-another-officer is expected to surface as a user-visible error.                                     |
| Cash collection records offline unexpectedly | Confirm the error is not a policy/assignment error; those must block rather than enqueue.                                                                                                 |
