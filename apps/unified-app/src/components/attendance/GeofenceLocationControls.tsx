import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { FormField } from '@/components/admin';
import { geocodeAddress } from '@/services/GeocodingService';
import type { Coordinates } from '@/types/attendance';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { formatCoordinatePair, parseCoordinatePair } from '@/utils/coordinates';

export type GeofenceLocationControlsProps = {
  address: string;
  city: string;
  state: string;
  center: Coordinates;
  onAddressChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onCenterChange: (center: Coordinates) => void;
};

export function GeofenceLocationControls({
  address,
  city,
  state,
  center,
  onAddressChange,
  onCityChange,
  onStateChange,
  onCenterChange,
}: GeofenceLocationControlsProps) {
  const [latitudeText, setLatitudeText] = useState('');
  const [longitudeText, setLongitudeText] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const formatted = formatCoordinatePair(center);
    setLatitudeText(formatted.latitude);
    setLongitudeText(formatted.longitude);
  }, [center]);

  const applyCoordinates = useCallback(() => {
    setCoordError(null);
    const result = parseCoordinatePair(latitudeText, longitudeText);
    if (!result.ok) {
      setCoordError(result.error);
      return;
    }
    onCenterChange(result.coordinates);
  }, [latitudeText, longitudeText, onCenterChange]);

  const handleLatitudeChange = useCallback(
    (value: string) => {
      if (value.includes(',') || (value.includes(' ') && !longitudeText.trim())) {
        const parsed = parseCoordinatePair(value);
        if (parsed.ok) {
          const formatted = formatCoordinatePair(parsed.coordinates);
          setLatitudeText(formatted.latitude);
          setLongitudeText(formatted.longitude);
          setCoordError(null);
          onCenterChange(parsed.coordinates);
          return;
        }
      }
      setLatitudeText(value);
    },
    [longitudeText, onCenterChange],
  );

  const handleSearchOnMap = useCallback(async () => {
    setLookupError(null);
    setIsSearching(true);
    try {
      const result = await geocodeAddress({ address, city, state });
      onCenterChange({ latitude: result.latitude, longitude: result.longitude });
      if (result.address && !address.trim()) onAddressChange(result.address);
      if (result.city && !city.trim()) onCityChange(result.city);
      if (result.state && !state.trim()) onStateChange(result.state);
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Address lookup failed.');
    } finally {
      setIsSearching(false);
    }
  }, [address, city, onAddressChange, onCenterChange, onCityChange, onStateChange, state]);

  const handleUseCurrentLocation = useCallback(async () => {
    setLookupError(null);
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLookupError('Location permission is required to use your current position.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      onCenterChange({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setLookupError('Could not read your current location. Try again or enter coordinates manually.');
    } finally {
      setIsLocating(false);
    }
  }, [onCenterChange]);

  return (
    <View style={styles.wrap}>
      <View style={styles.actionRow}>
        <Button
          label={isSearching ? 'Searching…' : 'Search on map'}
          variant="secondary"
          onPress={() => void handleSearchOnMap()}
          disabled={isSearching || isLocating}
        />
        <Button
          label={isLocating ? 'Locating…' : 'Use current location'}
          variant="ghost"
          onPress={() => void handleUseCurrentLocation()}
          disabled={isSearching || isLocating}
        />
      </View>

      {(isSearching || isLocating) && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={adminColors.primary} />
          <Text style={styles.loadingText}>
            {isSearching ? 'Looking up address…' : 'Getting GPS location…'}
          </Text>
        </View>
      )}

      {lookupError ? <Text style={styles.error}>{lookupError}</Text> : null}

      <FormField label="Address" value={address} onChangeText={onAddressChange} placeholder="Street address" />
      <FormField label="City" value={city} onChangeText={onCityChange} placeholder="City" />
      <FormField label="State" value={state} onChangeText={onStateChange} placeholder="State" />

      <Text style={styles.sectionLabel}>Coordinates</Text>
      <Text style={styles.helper}>Paste latitude, longitude or enter values separately.</Text>

      <FormField
        label="Latitude"
        value={latitudeText}
        onChangeText={handleLatitudeChange}
        placeholder="28.613900"
        keyboardType="numbers-and-punctuation"
        onBlur={applyCoordinates}
      />
      <FormField
        label="Longitude"
        value={longitudeText}
        onChangeText={setLongitudeText}
        placeholder="77.209000"
        keyboardType="numbers-and-punctuation"
        onBlur={applyCoordinates}
      />

      {coordError ? <Text style={styles.error}>{coordError}</Text> : null}

      <Button label="Apply coordinates" variant="secondary" onPress={applyCoordinates} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  loadingText: { fontSize: 13, color: colors.textSecondary },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  helper: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.xxs },
  error: { color: colors.errorRed, fontSize: 13 },
});
