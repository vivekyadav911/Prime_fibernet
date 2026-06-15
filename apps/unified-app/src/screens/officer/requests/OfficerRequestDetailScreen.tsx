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

import { ErrorState, LoadingOverlay, PriorityBadge, SkeletonLoader, StatusChip, ScreenWrapper } from '@/components/common';
import { FreeMapView } from '@/components/map';
import { useCamera } from '@/hooks/useCamera';
import {
  useAddActivityNoteMutation,
  useGetRequestDetailQuery,
} from '@/services/api/officersApi';
import { useUpdateRequestStatusMutation } from '@/services/api/requestsApi';
import { SyncManager } from '@/services/offline/syncManager';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import type { OfficerStackParamList } from '@/types/navigation';
import { NavigationButton } from '../components/NavigationButton';
import { StatusStepper } from '../components/StatusStepper';
import { radius, spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<OfficerStackParamList, 'RequestDetail'>;

type StatusAction = {
  label: string;
  nextStatus: string;
};

function getStatusAction(status: string): StatusAction | null {
  switch (status) {
    case 'pending':
    case 'assigned':
      return { label: 'Accept', nextStatus: 'in_transit' };
    case 'in_transit':
      return { label: 'Arrived', nextStatus: 'on_site' };
    case 'on_site':
    case 'working':
      return { label: 'Resolve', nextStatus: 'resolved' };
    default:
      return null;
  }
}

export function OfficerRequestDetailScreen({ route }: Props) {
  const { requestId } = route.params;
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { data: request, isLoading, error, refetch } = useGetRequestDetailQuery(requestId);
  const [updateStatus, { isLoading: updatingStatus }] = useUpdateRequestStatusMutation();
  const [addNote, { isLoading: addingNote }] = useAddActivityNoteMutation();
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

  const activityCount = request?.activities?.length ?? 0;
  const statusAction = request ? getStatusAction(request.status) : null;

  const onStatusPress = async () => {
    if (!request || !statusAction || !user) return;

    const applyStatus = async () => {
      await updateStatus({
        id: request.id,
        status: statusAction.nextStatus,
        note:
          statusAction.nextStatus === 'resolved'
            ? 'Request resolved'
            : `Status changed to ${statusAction.nextStatus}`,
        officerName: user.name,
      }).unwrap();
    };

    if (statusAction.nextStatus === 'resolved') {
      if (activityCount < 1) {
        setPendingResolve(true);
        sheetRef.current?.expand();
        return;
      }
      try {
        await applyStatus();
      } catch {
        await SyncManager.enqueue({
          id: `${request.id}-resolved-${Date.now()}`,
          operation: 'updateRequestStatus',
          endpoint: 'updateRequestStatus',
          payload: { id: request.id, status: 'resolved', note: 'Request resolved' },
        });
        dispatch(enqueueToast({ id: 'off-res', type: 'info', message: 'Saved offline' }));
      }
      refetch();
      return;
    }

    try {
      await applyStatus();
    } catch {
      await SyncManager.enqueue({
        id: `${request.id}-${statusAction.nextStatus}-${Date.now()}`,
        operation: 'updateRequestStatus',
        endpoint: 'updateRequestStatus',
        payload: {
          id: request.id,
          status: statusAction.nextStatus,
          note: `Status changed to ${statusAction.nextStatus}`,
        },
      });
      dispatch(enqueueToast({ id: 'off-st', type: 'info', message: 'Saved offline' }));
    }
    refetch();
  };

  const onSubmitNote = async () => {
    if (!request || !user || !noteText.trim()) return;

    let photoUrls: string[] = [];
    if (pendingPhotoUri) {
      const path = `requests/${request.id}/${Date.now()}.jpg`;
      const url = await uploadToSupabase(pendingPhotoUri, 'request-photos', path);
      photoUrls = [url];
    }

    await addNote({
      requestId: request.id,
      officerName: user.name,
      note: noteText.trim(),
      photoUrls,
    }).unwrap();

    setNoteText('');
    setPendingPhotoUri(null);
    sheetRef.current?.close();

    if (pendingResolve) {
      setPendingResolve(false);
      await updateStatus({
        id: request.id,
        status: 'resolved',
        note: noteText.trim(),
        officerName: user.name,
      }).unwrap();
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

  if (error || !request) {
    return (
      <Screen>
        <ErrorState message="Request not found" onRetry={refetch} />
      </Screen>
    );
  }

  const hasLocation = request.latitude != null && request.longitude != null;

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.customerName}>{request.userName ?? 'Customer'}</Text>
            <PriorityBadge priority={request.priority} />
          </View>
          {request.userPhone ? (
            <Pressable onPress={() => void Linking.openURL(`tel:${request.userPhone}`)}>
              <Text style={styles.meta}>📞 {request.userPhone}</Text>
            </Pressable>
          ) : null}
          {request.userEmail ? <Text style={styles.meta}>✉️ {request.userEmail}</Text> : null}
          <StatusChip status={request.status} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status progress</Text>
          <StatusStepper status={request.status} />
          {statusAction ? (
            <Button
              label={statusAction.label}
              onPress={() => void onStatusPress()}
              disabled={updatingStatus}
              style={styles.statusCta}
            />
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Issue</Text>
          <Text style={styles.body}>{request.description ?? request.address}</Text>
          <Text style={styles.address}>{request.address}</Text>
        </View>

        {request.photoUrls.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <FlatList
              horizontal
              data={request.photoUrls}
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
                address={request.address}
                latitude={request.latitude}
                longitude={request.longitude}
                variant="primary"
              />
            ) : null}
          </View>
          {hasLocation ? (
            <FreeMapView
              style={styles.map}
              initialRegion={{
                latitude: request.latitude!,
                longitude: request.longitude!,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{ latitude: request.latitude!, longitude: request.longitude! }}
                title={request.userName ?? 'Customer'}
                description={request.address}
              />
            </FreeMapView>
          ) : (
            <Text style={styles.meta}>Location not available</Text>
          )}
        </View>

        {statusAction ? (
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
          {[...(request.activities ?? [])].reverse().map((activity) => (
            <View key={activity.id} style={styles.timelineItem}>
              <Text style={styles.timelineTime}>
                {new Date(activity.createdAt).toLocaleString()}
              </Text>
              <Text style={styles.timelineNote}>{activity.note ?? '—'}</Text>
            </View>
          ))}
          {!request.activities?.length ? (
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
