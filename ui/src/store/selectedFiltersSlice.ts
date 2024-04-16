import { createSelector, createSlice } from '@reduxjs/toolkit';
import { RootState } from './store';

const slice = createSlice({
  name: 'selectedFilters',
  initialState: {
    sourceOrgs: {},
    accessibilities: {},
  },

  reducers: {
    setSourceOrgs: (state, action) => {
      state.sourceOrgs = action.payload;
    },
    updateSourceOrgs: (state, action) => {
      state.sourceOrgs = {
        ...state.sourceOrgs,
        ...action.payload,
      };
    },
    setAccessibilities: (state, action) => {
      state.accessibilities = action.payload;
    },
    updateAccessibilities: (state, action) => {
      state.accessibilities = {
        ...state.accessibilities,
        ...action.payload,
      };
    },
  },
});

export default slice.reducer;

export const setSourceOrgs = (payload: string[]) => ({
  type: 'selectedFilters/setSourceOrgs',
  payload,
});

export const updateSourceOrgs = (payload: { [x: string]: boolean; }) => ({
  type: 'selectedFilters/updateSourceOrgs',
  payload,
});

export const selectSourceOrgFilters = createSelector(
  (state: RootState) => state.selectedFilters.sourceOrgs,
  (sourceOrgs) => {
    if (sourceOrgs == null || Object.keys(sourceOrgs).length === 0) {
      return [];
    }
    const selectedSourceOrgs = Object.keys(sourceOrgs).filter(
      (sourceOrg: string) => sourceOrgs[sourceOrg] === true,
    );
    return selectedSourceOrgs;
  },
);

export const setAccessibilities = (payload: string[]) => ({
  type: 'selectedFilters/setAccessibilities',
  payload,
});

export const updateAcccessibilities = (payload: { [x: string]: boolean; }) => ({
  type: 'selectedFilters/updateAccessibilities',
  payload,
});

export const selectAccessibilities = createSelector(
  (state: RootState) => state.selectedFilters.accessibilities,
  (accessibilities) => {
    if (accessibilities == null || Object.keys(accessibilities).length === 0) {
      return [];
    }
    const selectedAccessibilities = Object.keys(accessibilities).filter(
      (a11y: string) => accessibilities[a11y] === true,
    );
    return selectedAccessibilities;
  },
);