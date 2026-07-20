import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@prime/ui';

import { DismissKeyboardScrollView, ModalSheetHeader } from '@/components/common';
import { geocodeAddress, reverseGeocode } from '@/services/GeocodingService';
import { useAppSelector } from '@/store/hooks';
import { useUpdateOfficerPortalItemLocationMutation } from '@/services/api/officerPortalApi';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { PortalItemKind } from '@/types/portalTicket';
import { formatCoordinatePair, parseCoordinatePair } from '@/utils/coordinates';
import { isUsableMapCoordinate } from '@/utils/officerPortalCoordinates';
import { queryErrorMessage } from '@/utils/queryError';

export type OfficerLocationSheetProps = {
  visible: boolean;
  onClose: () => void;
  itemId: string;
  kind: PortalItemKind;
  initialAddress: string;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  onSaved?: (location: { latitude: number; longitude: number; address: string }) => void;
};

export function OfficerLocationSheet({
  visible,
  onClose,
  itemId,
  kind,
  initialAddress,
  initialLatitude,
  initialLongitude,
  onSaved,
}: OfficerLocationSheetProps) {
  const insets = useSafeAreaInsets();
  const user = useAppSelector((s) => s.auth.user);
  const [updateLocation, { isLoading: saving }] = useUpdateOfficerPortalItemLocationMutation();
  const [address, setAddress] = useState(initialAddress);
  const [latitudeText, setLatitudeText] = useState('');
  const [longitudeText, setLongitudeText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [helperNote, setHelperNote] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAddress(initialAddress);
    setError(null);
    setHelperNote(null);
    if (
      initialLatitude != null &&
      initialLongitude != null &&
      isUsableMapCoordinate(initialLatitude, initialLongitude)
    ) {
      const formatted = formatCoordinatePair({
        latitude: initialLatitude,
        longitude: initialLongitude,
      });
      setLatitudeText(formatted.latitude);
      setLongitudeText(formatted.longitude);
    } else {
      setLatitudeText('');
      setLongitudeText('');
    }
  }, [visible, initialAddress, initialLatitude, initialLongitude]);

  const resolveCoordinates = useCallback((): { latitude: number; longitude: number } | null => {
    const parsed = parseCoordinatePair(latitudeText, longitudeText);
    if (!parsed.ok) {
      setError(parsed.error);
      return null;
    }
    if (!isUsableMapCoordinate(parsed.coordinates.latitude, parsed.coordinates.longitude)) {
      setError('Enter valid coordinates (not 0,0).');
      return null;
    }
    return parsed.coordinates;
  }, [latitudeText, longitudeText]);

  const handleSearchAddress = useCallback(async () => {
    setError(null);
    setHelperNote(null);
    setIsSearching(true);
    try {
      const result = await geocodeAddress({ address });
      const formatted = formatCoordinatePair({
        latitude: result.latitude,
        longitude: result.longitude,
      });
      setLatitudeText(formatted.latitude);
      setLongitudeText(formatted.longitude);
      if (result.formattedAddress) setAddress(result.formattedAddress);
      setHelperNote(
        result.formattedAddress
          ? `Matched: ${result.formattedAddress}. If this is wrong, edit the address and look up again — do not save.`
          : 'Pin set from address lookup. Save only if the coordinates look correct.',
      );
    } catch (err) {
      setLatitudeText('');
      setLongitudeText('');
      setError(
        err instanceof Error
          ? err.message
          : 'Address not found. Try a simpler area + city, or enter coordinates manually.',
      );
    } finally {
      setIsSearching(false);
    }
  }, [address, itemId]);

  const handleUseCurrentLocation = useCallback(async () => {
    setError(null);
    setHelperNote(null);
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Location permission is required.');
        return;
      }
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setError('Turn on location services to use GPS.');
        return;
      }
      // Fresh fix — High alone often returns a cached last-known position on Android.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        mayShowUserSettingsDialog: true,
      });
      const { latitude, longitude } = position.coords;
      const formatted = formatCoordinatePair({ latitude, longitude });
      setLatitudeText(formatted.latitude);
      setLongitudeText(formatted.longitude);

      try {
        const reverse = await reverseGeocode(latitude, longitude);
        if (reverse.formattedAddress) {
          setAddress(reverse.formattedAddress);
        }
      } catch {
        // Keep existing address text if reverse fails; coords still apply.
      }

      setHelperNote(
        'Pin set to your current device location (not the typed customer address). Save only if you are at the customer site.',
      );
    } catch {
      setError('Could not read GPS location. Enter coordinates manually.');
    } finally {
      setIsLocating(false);
    }
  }, [itemId]);

  const handleSave = useCallback(async () => {
    const coords = resolveCoordinates();
    const trimmedAddress = address.trim();
    if (!coords) return;
    if (!trimmedAddress) {
      setError('Enter the customer address.');
      return;
    }

    setError(null);
    try {
      await updateLocation({
        itemId,
        kind,
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: trimmedAddress,
        officerName: user?.name,
      }).unwrap();
      onSaved?.({ ...coords, address: trimmedAddress });
      onClose();
    } catch (err) {
      setError(queryErrorMessage(err) || 'Could not save location.');
    }
  }, [address, itemId, kind, onClose, onSaved, resolveCoordinates, updateLocation, user?.name]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
            onPress={(event) => event.stopPropagation()}
          >
            <ModalSheetHeader
              variant="sheet"
              title="Correct location"
              onCancel={onClose}
              onDone={() => void handleSave()}
            />
            <DismissKeyboardScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.helper}>
                Look up the customer address to set the pin, or use My location only when you are
                at the site. Saving updates this ticket permanently.
              </Text>

              <Text style={styles.label}>ADDRESS</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Street, area, city"
                multiline
              />

              <View style={styles.actionRow}>
                <Button
                  label={isSearching ? 'Searching…' : 'Look up address'}
                  variant="secondary"
                  onPress={() => void handleSearchAddress()}
                  disabled={isSearching || isLocating || saving}
                />
                <Button
                  label={isLocating ? 'Locating…' : 'My location'}
                  variant="ghost"
                  onPress={() => void handleUseCurrentLocation()}
                  disabled={isSearching || isLocating || saving}
                />
              </View>

              {(isSearching || isLocating) && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.primaryNavy} />
                  <Text style={styles.loadingText}>
                    {isSearching ? 'Looking up address…' : 'Reading GPS…'}
                  </Text>
                </View>
              )}

              <Text style={styles.label}>LATITUDE</Text>
              <TextInput
                style={styles.input}
                value={latitudeText}
                onChangeText={setLatitudeText}
                placeholder="28.613900"
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.label}>LONGITUDE</Text>
              <TextInput
                style={styles.input}
                value={longitudeText}
                onChangeText={setLongitudeText}
                placeholder="77.209000"
                keyboardType="numbers-and-punctuation"
              />

              {helperNote ? <Text style={styles.note}>{helperNote}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                label={saving ? 'Saving…' : 'Save location'}
                onPress={() => void handleSave()}
                disabled={saving || isSearching || isLocating}
              />
            </DismissKeyboardScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '92%',
    minHeight: '58%',
    width: '100%',
  },
  bodyScroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  helper: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
    fontSize: 15,
    minHeight: 48,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  note: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: colors.errorRed,
    fontSize: 13,
  },
});
