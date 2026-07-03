import { useCallback, useMemo, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BottomSheet, { BottomSheetBackdrop, type BottomSheetBackdropProps, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import {
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Marker } from 'react-native-maps';
import { Button, Screen } from '@prime/ui';
import { colors } from '@/theme/colors';

import { TicketStatusBadge, TicketTimeline } from '@/components/TicketPortal';
import { ErrorState, LoadingOverlay, SkeletonLoader, ScreenWrapper } from '@/components/common';
import { FreeMapView } from '@/components/map';
import { useCamera } from '@/hooks/useCamera';
import {
  useAddActivityNoteMutation,
} from '@/services/api/officersApi';
import {
  useAddOfficerTicketNoteMutation,
  useGetOfficerPortalItemDetailQuery,
  useUpdateOfficerTicketStatusMutation,
} from '@/services/api/officerPortalApi';
import { useUpdateRequestStatusMutation } from '@/services/api/requestsApi';
import { SyncManager } from '@/services/offline/syncManager';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import type { OfficerStackParamList } from '@/types/navigation';
import { NavigationButton } from '../components/NavigationButton';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';
import { warnInvalidRequestId } from '@/utils/requestId';
import {
  getOfficerTicketAdvanceLabel,
  nextRequestStatusForOfficer,
  nextTicketStatusForOfficer,
} from '@/utils/officerTicketActions';
import { truncateTicketNumber } from '@/utils/ticketViewMappers';

type Props = NativeStackScreenProps<OfficerStackParamList, 'RequestDetail'>;

export function OfficerRequestDetailScreen({ route }: Props) {
  const { requestId, kind } = route.params;
  warnInvalidRequestId(requestId, 'OfficerRequestDetailScreen');
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { data: detail, isLoading, error, refetch } = useGetOfficerPortalItemDetailQuery({
    itemId: requestId,
    kind,
  });
  const [updateRequestStatus, { isLoading: updatingRequestStatus }] = useUpdateRequestStatusMutation();
  const [updateTicketStatus, { isLoading: updatingTicketStatus }] = useUpdateOfficerTicketStatusMutation();
  const [addRequestNote, { isLoading: addingRequestNote }] = useAddActivityNoteMutation();
  const [addTicketNote, { isLoading: addingTicketNote }] = useAddOfficerTicketNoteMutation();
  const updatingStatus = updatingRequestStatus || updatingTicketStatus;
  const addingNote = addingRequestNote || addingTicketNote;
  const { takePhoto, pickFromGallery, uploadToSupabase, isUploading } = useCamera();

  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['55%'], []);
  const [noteText, setNoteText] = useState('');
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [pendingResolve, setPendingResolve] = useState(false);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  const activityCount = detail?.activityTimeline.length ?? 0;
  const statusActionLabel = detail ? getOfficerTicketAdvanceLabel(detail.statusBucket) : null;

  const onStatusPress = async () => {
    if (!detail || !statusActionLabel || !user) return;

    if (detail.kind === 'ticket' && detail.ticket) {
      const next = nextTicketStatusForOfficer(detail.ticket.status);
      if (!next) return;
      if (next === 'Resolved' && activityCount < 1) {
        setPendingResolve(true);
        sheetRef.current?.expand();
        return;
      }
      try {
        await updateTicketStatus({
          ticketId: detail.ticket.id,
          status: next,
          note: `Status updated to ${next}`,
          officerName: user.name,
        }).unwrap();
      } catch {
        dispatch(enqueueToast({ id: 'off-ticket', type: 'info', message: 'Could not update ticket' }));
      }
      refetch();
      return;
    }

    const currentStatus = String(detail.request?.status ?? '');
    const next = nextRequestStatusForOfficer(currentStatus);
    if (!next || !detail.request) return;

    const applyStatus = async () => {
      await updateRequestStatus({
        id: detail.request!.id,
        status: next,
        note: next === 'resolved' ? 'Ticket resolved' : `Status changed to ${next}`,
        officerName: user.name,
      }).unwrap();
    };

    if (next === 'resolved' && activityCount < 1) {
      setPendingResolve(true);
      sheetRef.current?.expand();
      return;
    }

    try {
      await applyStatus();
    } catch {
      await SyncManager.enqueue({
        id: `${detail.id}-${next}-${Date.now()}`,
        operation: 'updateRequestStatus',
        endpoint: 'updateRequestStatus',
        payload: { id: detail.request.id, status: next, note: `Status changed to ${next}` },
      });
      dispatch(enqueueToast({ id: 'off-st', type: 'info', message: 'Saved offline' }));
    }
    refetch();
  };

  const onSubmitNote = async () => {
    if (!detail || !user || !noteText.trim()) return;

    let photoUrls: string[] = [];
    if (pendingPhotoUri && detail.kind === 'request') {
      const path = `requests/${detail.id}/${Date.now()}.jpg`;
      const url = await uploadToSupabase(pendingPhotoUri, 'request-photos', path);
      photoUrls = [url];
    }

    if (detail.kind === 'ticket' && detail.ticket) {
      await addTicketNote({
        ticketId: detail.ticket.id,
        note: noteText.trim(),
        officerName: user.name,
      }).unwrap();
    } else if (detail.request) {
      await addRequestNote({
        requestId: detail.request.id,
        officerName: user.name,
        note: noteText.trim(),
        photoUrls,
      }).unwrap();
    }

    setNoteText('');
    setPendingPhotoUri(null);
    sheetRef.current?.close();

    if (pendingResolve) {
      setPendingResolve(false);
      if (detail.kind === 'ticket' && detail.ticket) {
        await updateTicketStatus({
          ticketId: detail.ticket.id,
          status: 'Resolved',
          note: noteText.trim(),
          officerName: user.name,
        }).unwrap();
      } else if (detail.request) {
        await updateRequestStatus({
          id: detail.request.id,
          status: 'resolved',
          note: noteText.trim(),
          officerName: user.name,
        }).unwrap();
      }
    }

    refetch();
  };

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} rowHeight={72} shape="card" />
      </Screen>
    );
  }

  if (error || !detail) {
    return (
      <Screen>
        <ErrorState
          message={error ? queryErrorMessage(error) : 'Ticket not found'}
          onRetry={refetch}
        />
      </Screen>
    );
  }

  const hasLocation = detail.coordinates != null;
  const ticketEvents =
    detail.ticket?.activityTimeline.map((event) => ({
      ...event,
      timestamp: event.timestamp,
    })) ?? [];

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.ticketNumber}>{truncateTicketNumber(detail.displayNumber)}</Text>
          </View>
          <Text style={styles.category}>{detail.categoryLabel}</Text>
          <View style={styles.headerRow}>
            <Text style={styles.customerName}>{detail.customerName}</Text>
          </View>
          {detail.contactPhone ? (
            <Pressable onPress={() => void Linking.openURL(`tel:${detail.contactPhone}`)}>
              <Text style={styles.meta}>{detail.contactPhone}</Text>
            </Pressable>
          ) : null}
          {detail.contactEmail ? <Text style={styles.meta}>{detail.contactEmail}</Text> : null}
          <TicketStatusBadge status={detail.statusBucket} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status</Text>
          {statusActionLabel ? (
            <Button
              label={statusActionLabel}
              onPress={() => void onStatusPress()}
              disabled={updatingStatus}
              style={styles.statusCta}
            />
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Issue</Text>
          <Text style={styles.body}>{detail.description || detail.customerAddress}</Text>
          <Text style={styles.address}>{detail.customerAddress}</Text>
        </View>

        {detail.photoUrls.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <FlatList
              horizontal
              data={detail.photoUrls}
              keyExtractor={(uri, i) => `${uri}-${i}`}
              renderItem={({ item }) => <Image source={{ uri: item }} style={styles.photo} />}
            />
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.mapHeader}>
            <Text style={styles.sectionTitle}>Customer location</Text>
            {hasLocation ? (
              <NavigationButton
                address={detail.customerAddress}
                latitude={detail.coordinates!.latitude}
                longitude={detail.coordinates!.longitude}
                variant="primary"
              />
            ) : null}
          </View>
          {hasLocation ? (
            <FreeMapView
              style={styles.map}
              initialRegion={{
                latitude: detail.coordinates!.latitude,
                longitude: detail.coordinates!.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{
                  latitude: detail.coordinates!.latitude,
                  longitude: detail.coordinates!.longitude,
                }}
                title={detail.customerName}
                description={detail.customerAddress}
              />
            </FreeMapView>
          ) : (
            <Text style={styles.meta}>Location not available</Text>
          )}
        </View>

        {statusActionLabel ? (
          <View style={styles.actions}>
            <Button
              label="Add activity note"
              variant="ghost"
              onPress={() => {
                setPendingResolve(false);
                sheetRef.current?.expand();
              }}
            />
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Activity timeline</Text>
          {detail.kind === 'ticket' && ticketEvents.length > 0 ? (
            <TicketTimeline events={ticketEvents} />
          ) : (
            detail.activityTimeline.map((activity) => (
              <View key={activity.id} style={styles.timelineItem}>
                <Text style={styles.timelineTime}>
                  {new Date(activity.timestamp).toLocaleString()}
                </Text>
                <Text style={styles.timelineNote}>
                  {activity.performedBy} — {activity.description}
                </Text>
              </View>
            ))
          )}
          {!detail.activityTimeline.length ? (
            <Text style={styles.meta}>No activity notes yet</Text>
          ) : null}
        </View>
      </ScrollView>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
      >
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Activity note</Text>
          <BottomSheetTextInput
            style={styles.noteInput}
            placeholder="Describe what you did (required before resolve)"
            multiline
            value={noteText}
            onChangeText={setNoteText}
          />
          <View style={styles.sheetActions}>
            <Pressable style={styles.attachBtn} onPress={() => void takePhoto().then(setPendingPhotoUri).catch(() => undefined)}>
              <Text>📷 Camera</Text>
            </Pressable>
            <Pressable style={styles.attachBtn} onPress={() => void pickFromGallery().then(setPendingPhotoUri).catch(() => undefined)}>
              <Text>🖼 Gallery</Text>
            </Pressable>
          </View>
          {pendingPhotoUri ? <Text style={styles.meta}>Photo attached</Text> : null}
          <Button
            label={addingNote || isUploading ? 'Saving…' : 'Submit note'}
            onPress={onSubmitNote}
            disabled={!noteText.trim() || addingNote || isUploading}
          />
        </View>
      </BottomSheet>

      <LoadingOverlay visible={updatingStatus || addingNote || isUploading} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxxl },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketNumber: { fontSize: 16, fontWeight: '700', color: colors.primaryNavy },
  category: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  customerName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  meta: { color: colors.textSecondary, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  body: { color: colors.textPrimary, lineHeight: 22 },
  address: { color: colors.textSecondary },
  photo: { width: 120, height: 120, borderRadius: radius.sm, marginRight: spacing.sm },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  map: { height: 180, borderRadius: radius.md, marginTop: spacing.sm },
  actions: { gap: spacing.sm },
  statusCta: { marginTop: spacing.sm, minHeight: 48 },
  timelineItem: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accentTeal,
    paddingLeft: spacing.sm,
    marginBottom: spacing.sm,
  },
  timelineTime: { fontSize: 12, color: colors.textSecondary },
  timelineNote: { color: colors.textPrimary, marginTop: 2 },
  sheet: { padding: spacing.lg, gap: spacing.md },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
    color: colors.textPrimary,
  },
  sheetActions: { flexDirection: 'row', gap: spacing.sm },
  attachBtn: {
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
  },
});
