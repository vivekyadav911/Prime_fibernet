import { useCallback, useMemo, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BottomSheet, { BottomSheetBackdrop, type BottomSheetBackdropProps, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import {
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Button, Screen } from '@prime/ui';
import { colors } from '@/theme/colors';

import { ErrorState, LoadingOverlay, PriorityBadge, SkeletonLoader, StatusChip } from '@/components/common';
import { useCamera } from '@/hooks/useCamera';
import {
  useAddActivityNoteMutation,
  useGetRequestDetailQuery,
} from '@/services/api/officersApi';
import { useUpdateRequestStatusMutation } from '@/services/api/requestsApi';
import { useAppSelector } from '@/store/hooks';
import type { OfficerStackParamList } from '@/types/navigation';
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

function mapsDeepLink(lat: number, lng: number, address: string): string {
  const encoded = encodeURIComponent(address);
  if (Platform.OS === 'ios') {
    return `maps://?daddr=${lat},${lng}&q=${encoded}`;
  }
  return `google.navigation:q=${lat},${lng}`;
}

export function OfficerRequestDetailScreen({ route }: Props) {
  const { requestId } = route.params;
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

  const onNavigate = async () => {
    if (!request?.latitude || !request?.longitude) return;
    const url = mapsDeepLink(request.latitude, request.longitude, request.address);
    const canOpen = await Linking.canOpenURL(url);
    await Linking.openURL(canOpen ? url : `https://maps.google.com/?q=${request.latitude},${request.longitude}`);
  };

  const onStatusPress = async () => {
    if (!request || !statusAction || !user) return;

    if (statusAction.nextStatus === 'resolved') {
      if (activityCount < 1) {
        setPendingResolve(true);
        sheetRef.current?.expand();
        return;
      }
      await updateStatus({
        id: request.id,
        status: statusAction.nextStatus,
        note: 'Request resolved',
        officerName: user.name,
      }).unwrap();
      refetch();
      return;
    }

    await updateStatus({
      id: request.id,
      status: statusAction.nextStatus,
      note: `Status changed to ${statusAction.nextStatus}`,
      officerName: user.name,
    }).unwrap();
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
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.customerName}>{request.userName ?? 'Customer'}</Text>
            <PriorityBadge priority={request.priority} />
          </View>
          {request.userPhone ? <Text style={styles.meta}>📞 {request.userPhone}</Text> : null}
          {request.userEmail ? <Text style={styles.meta}>✉️ {request.userEmail}</Text> : null}
          <StatusChip status={request.status} />
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
              <Button label="Navigate" onPress={onNavigate} />
            ) : null}
          </View>
          {hasLocation ? (
            <MapView
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
            </MapView>
          ) : (
            <Text style={styles.meta}>Location not available</Text>
          )}
        </View>

        {statusAction ? (
          <View style={styles.actions}>
            <Button
              label={statusAction.label}
              onPress={onStatusPress}
              disabled={updatingStatus}
            />
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
    </Screen>
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
