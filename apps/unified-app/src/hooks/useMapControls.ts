import { useCallback, useEffect, useReducer } from 'react';
import { format } from 'date-fns';

import type { MapControlAction, MapControlState } from '@/types/map';

const initialState: MapControlState = {
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  timeRange: 'all_day',
  selectedOfficerIds: [],
  showOfficers: true,
  showTrails: true,
  showDwellTime: true,
  showRequests: true,
  mapStyle: 'standard',
  isPanelOpen: false,
};

function mapControlsReducer(state: MapControlState, action: MapControlAction): MapControlState {
  switch (action.type) {
    case 'SET_DATE':
      return { ...state, selectedDate: action.date };
    case 'SET_TIME_RANGE':
      return { ...state, timeRange: action.timeRange };
    case 'TOGGLE_OFFICER': {
      const ids = state.selectedOfficerIds.includes(action.officerId)
        ? state.selectedOfficerIds.filter((id) => id !== action.officerId)
        : [...state.selectedOfficerIds, action.officerId];
      return { ...state, selectedOfficerIds: ids };
    }
    case 'SELECT_ALL_OFFICERS':
      return { ...state, selectedOfficerIds: action.officerIds };
    case 'DESELECT_ALL_OFFICERS':
      return { ...state, selectedOfficerIds: [] };
    case 'SET_SHOW_OFFICERS':
      return { ...state, showOfficers: action.value };
    case 'SET_SHOW_TRAILS':
      return { ...state, showTrails: action.value };
    case 'SET_SHOW_DWELL':
      return { ...state, showDwellTime: action.value };
    case 'SET_SHOW_REQUESTS':
      return { ...state, showRequests: action.value };
    case 'SET_MAP_STYLE':
      return { ...state, mapStyle: action.style };
    case 'TOGGLE_PANEL':
      return { ...state, isPanelOpen: !state.isPanelOpen };
    case 'SET_PANEL_OPEN':
      return { ...state, isPanelOpen: action.open };
    default:
      return state;
  }
}

export function useMapControls(allOfficerIds: string[]) {
  const [state, dispatch] = useReducer(mapControlsReducer, initialState);

  useEffect(() => {
    if (allOfficerIds.length > 0 && state.selectedOfficerIds.length === 0) {
      dispatch({ type: 'SELECT_ALL_OFFICERS', officerIds: allOfficerIds });
    }
  }, [allOfficerIds, state.selectedOfficerIds.length]);

  const toggleOfficer = useCallback((officerId: string) => {
    dispatch({ type: 'TOGGLE_OFFICER', officerId });
  }, []);

  const deselectAll = useCallback(() => {
    dispatch({ type: 'DESELECT_ALL_OFFICERS' });
  }, []);

  const selectAll = useCallback(() => {
    dispatch({ type: 'SELECT_ALL_OFFICERS', officerIds: allOfficerIds });
  }, [allOfficerIds]);

  return {
    controls: state,
    dispatch,
    toggleOfficer,
    deselectAll,
    selectAll,
  };
}
