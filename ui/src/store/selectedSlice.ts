/* eslint-disable no-param-reassign */
import { createSelector, createSlice } from '@reduxjs/toolkit';
import { Dataset } from 'components/common/types';

const initialState: any = {
  h3Index: null,
  candidateDatasets: [],
  datasets: [],
  datasetCount: null,
  selectedDataset: null,

};

const slice = createSlice({
  name: 'selected',
  initialState,
  reducers: {
    setH3Index: (state, action) => {
      state.h3Index = action.payload;
    },
    // should be on a different slice
    setCandidateDatasets: (state, action) => {
      state.candidateDatasets = action.payload;
    },
    setDatasets: (state, action) => {
      state.datasets = action.payload;
    },
    setDatasetCount: (state, action) => {
      state.datasetCount = action.payload;
    },
    setSelectedDataset: (state, action) => {
      state.selectedDataset = action.payload;
    },
    resetByKey: (state, action) => {
      action.payload.forEach((key: string) => {
        state[key] = initialState[key];
      });
    },
  },
});

export default slice.reducer;

export const selectDatasetIds = createSelector(
  (state: any) => state.selected.datasets,
  (datasets: Dataset[]) => datasets.map((d: Dataset) => d.id),
);

export const setH3Index = (payload: string | null) => ({
  type: 'selected/setH3Index',
  payload,
});
export const setCandidateDatasets = (payload: Dataset[]) => ({
  type: 'selected/setCandidateDatasets',
  payload,
});
export const setDatasets = (payload: Dataset[]) => ({
  type: 'selected/setDatasets',
  payload,
});
export const setDatasetCount = (payload: number) => ({
  type: 'selected/setDatasetCount',
  payload,
});
export const setSelectedDataset = (payload: Dataset) => ({
  type: 'selected/setSelectedDataset',
  payload,
});
export const resetByKey = (...payload: string[]) => ({
  type: 'selected/resetByKey',
  payload,
});
