import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = '@prime/map_saved_places_v1';

export type SavedMapPlaceType = 'home' | 'office';

export type SavedMapPlace = {
  type: SavedMapPlaceType;
  latitude: number;
  longitude: number;
  label: string;
  updatedAt: string;
};

export type SavedMapPlaces = Partial<Record<SavedMapPlaceType, SavedMapPlace>>;

async function readPlaces(): Promise<SavedMapPlaces> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SavedMapPlaces;
  } catch {
    return {};
  }
}

async function writePlaces(places: SavedMapPlaces): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(places));
}

export function useSavedMapPlaces() {
  const [places, setPlaces] = useState<SavedMapPlaces>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void readPlaces().then((data) => {
      if (active) {
        setPlaces(data);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const savePlace = useCallback(
    async (type: SavedMapPlaceType, latitude: number, longitude: number) => {
      const label = type === 'home' ? 'Home' : 'Office';
      const next: SavedMapPlaces = {
        ...places,
        [type]: {
          type,
          latitude,
          longitude,
          label,
          updatedAt: new Date().toISOString(),
        },
      };
      setPlaces(next);
      await writePlaces(next);
    },
    [places],
  );

  const clearPlace = useCallback(
    async (type: SavedMapPlaceType) => {
      const next = { ...places };
      delete next[type];
      setPlaces(next);
      await writePlaces(next);
    },
    [places],
  );

  return { places, loaded, savePlace, clearPlace };
}
