import { setViewState } from '@carto/react-redux';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import {
  Autocomplete, Chip, CircularProgress, IconButton, TextField,
} from '@mui/material';
import axios from 'axios';
import { Dataset, Entity } from 'components/common/types';
import isEqual from 'lodash.isequal';
import isEqualWith from 'lodash.isequalwith';
import uniqWith from 'lodash.uniqwith';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  resetByKey as resetPreviewByKey,
} from 'store/previewSlice';
import {
  resetByKey as resetSearchByKey,
  setLastZoom,
  setLocation,
  setPendingLocationCheck,
} from 'store/searchSlice';
import {
  resetByKey as resetSelectedFiltersByKey,
  selectAccessibilities,
  selectSourceOrgFilters,
} from 'store/selectedFiltersSlice';
import {
  resetByKey as resetSelectedByKey,
  setCandidateDatasets,
  setDatasets,
} from 'store/selectedSlice';
import { RootState } from 'store/store';
import getSteppedZoomResolutionPair from 'utils/getSteppedZoomResolutionPair';
import moveViewportToBbox from 'utils/moveViewportToBbox';
import {
  deselectTile,
  getDatasetsByKeyword,
  prepSearchKeyword,
  updateKeywordEntity,
} from './utils';

function SearchButton({ isLoading, disabled }: { isLoading: boolean, disabled?: boolean }) {
  return (
    <div className="flex justify-center items-center w-[2em] mr-[-8px]">
      {
      isLoading ? <CircularProgress size="1em" /> : (
        <IconButton aria-label="search" type="submit" disabled={disabled}>
          <SearchIcon />
        </IconButton>
      )
    }
    </div>
  );
}

function ClearButton() {
  return (
    <div className="flex justify-center items-center w-[2em] mr-[-8px]">
      <IconButton arial-label="clear" type="reset">
        <ClearIcon />
      </IconButton>
    </div>
  );
}

function Search({ className }: { className?: string }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [entities, setEntities] = useState([] as Entity[]);
  const [keywordPayload, setKeywordPayload] = useState({});
  const [showChips, setShowChips] = useState(false);

  const viewState = useSelector((state: RootState) => state.carto.viewState);
  const { location, lastZoom } = useSelector((state: RootState) => state.search);
  const { candidateDatasets, h3Index: selectedH3Index }: { candidateDatasets: Dataset[], h3Index: string } = useSelector((state: RootState) => state.selected);
  const sourceOrgs = useSelector(selectSourceOrgFilters);
  const accessibilities = useSelector(selectAccessibilities);

  const dispatch = useDispatch();

  // TODO: make this single purpose. lessen side effects and simply return datasets
  const getSetDatasets = async ({ location, zoom, candidateDatasets = null }: { location: any, zoom: number, candidateDatasets?: Dataset[] }) => {
    const [_, resolution] = getSteppedZoomResolutionPair(zoom);
    const body: any = {
      location: JSON.stringify(location.geojson),
      resolution,
    };
    const isValidCandidateDatasets = Array.isArray(candidateDatasets) && candidateDatasets.length > 0;
    const candidateDatasetIds = isValidCandidateDatasets ? candidateDatasets.map((d: Dataset) => d.id) : null;

    if (Array.isArray(candidateDatasetIds) && candidateDatasetIds.length > 0) {
      body.dataset_ids = candidateDatasetIds;
    } else {
      body.source_org = sourceOrgs;
      body.accessibility = accessibilities;
    }
    const { data: datasetsResults } = await axios.post(
      `${import.meta.env.VITE_API_URL}/datasets_by_location/`,
      body,
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    );
    if (!Array.isArray(datasetsResults) || datasetsResults.length === 0) {
      return;
    }
    const datasetsResultsIds = datasetsResults.map((d: Dataset) => d.id);
    const finalDatasets = isValidCandidateDatasets ? candidateDatasets.filter((cd: Dataset) => datasetsResultsIds.includes(cd.id)) : datasetsResults;
    dispatch(setDatasets(finalDatasets));
    setShowChips(true);
    dispatch(setPendingLocationCheck(true));
    if (selectedH3Index) {
      deselectTile(selectedH3Index, resolution, location, dispatch);
    }
    return finalDatasets;
  };

  const reviseResults = async ({
    deletedChipLabel,
    entities,
    keywordPayload,
  }: {
    deletedChipLabel: string,
    entities: Entity[],
    keywordPayload?: any,
  }) => {
    if (['region', 'country'].includes(deletedChipLabel)) {
      dispatch(resetSearchByKey('location'));
      dispatch(setDatasets(candidateDatasets));
      console.info('Display revised datasets');
    } else if (deletedChipLabel === 'keyword') {
      const noMoreNonLocationEntities = entities.filter((e: Entity) => !['country', 'region'].includes(e.label)).length === 0;
      if (noMoreNonLocationEntities) {
        const [minLat, maxLat, minLon, maxLon] = location.boundingbox.map(parseFloat);
        const bbox = {
          minLat, maxLat, minLon, maxLon,
        };
        const { zoom } = moveViewportToBbox(bbox, viewState, dispatch, true);
        const datasets = await getSetDatasets({ location, zoom });
        if (Array.isArray(datasets) && datasets.length > 1) {
          console.info('Display revised datasets');
        } else {
          const message = 'No dataset results';
          console.info(message);
          setError(message);
        }
      }
    } else if (deletedChipLabel === 'year') {
      const { min_year, max_year, ...keywordPayload_ } = keywordPayload;
      const { hits: candidateDatasets } = await getDatasetsByKeyword(keywordPayload_);
      dispatch(setCandidateDatasets(candidateDatasets));
      if (location) {
        // deduplicate this or at least allow zoom to be
        // automatically derived from location if not provided
        const [minLat, maxLat, minLon, maxLon] = location.boundingbox.map(parseFloat);
        const bbox = {
          minLat, maxLat, minLon, maxLon,
        };
        const { zoom } = moveViewportToBbox(bbox, viewState, dispatch, true);
        const datasets = await getSetDatasets({ location, zoom, candidateDatasets });
        if (Array.isArray(datasets) && datasets.length > 1) {
          console.info('Display revised datasets');
        } else {
          const message = 'No dataset results';
          console.info(message);
          setError(message);
        }
      } else {
        dispatch(setDatasets(candidateDatasets));
        console.info('Display revised datasets');
      }
    }
    setShowChips(true);
  };

  // TODO: rename to something more descriptive
  const afterParse = async ({ entities }: { entities?: Entity[] }) => {
    const keywordPayload_: any = {
      query,
      size: 999,
      source_org: sourceOrgs,
      accessibility: accessibilities,
    };

    const yearEntity = entities.find((e: Entity) => e.label === 'year');
    const regionEntity = entities.find((e: Entity) => e.label === 'region');
    const countryEntity = entities.find((e: Entity) => e.label === 'country');
    const hasLocationEntity = regionEntity || countryEntity;
    const keywordEntity = entities.find((e: Entity) => e.label === 'keyword');
    if (yearEntity) {
      keywordPayload_.min_year = yearEntity.text;
      keywordPayload_.max_year = yearEntity.text;
    }

    let labelsToKeep = ['statistical indicator'] as string[];
    setKeywordPayload(keywordPayload_);
    if (hasLocationEntity || keywordEntity) {
      const locationQ = (
        hasLocationEntity
          ? [regionEntity?.text, countryEntity?.text].filter((e: string) => e).join(',')
          : keywordEntity.text
      );
      console.info(`Querying nominatim: ${locationQ}`);
      const { data: nominatimResults } = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q: locationQ,
            format: 'json',
            polygon_geojson: 1,
          },
        },
      );
      if (Array.isArray(nominatimResults) && nominatimResults.length > 0) {
        const dedupedResults = uniqWith(
          nominatimResults,
          (result: any, other: any) => isEqualWith(result, other, (result: any, other: any) => isEqual(result.geojson.coordinates, other.geojson.coordinates)),
        );
        const name = 'Skip geography filtering';
        setOptions([{ display_name: name, name, skip: true }, ...dedupedResults]);
        console.info('Display nominatim results');
        return;
      } else {
        console.info('No nominatim results');
        labelsToKeep = ['statistical indicator', 'region', 'country'];
      }
    }

    const keyword = await prepSearchKeyword(query, entities, labelsToKeep);
    const newEntities = await updateKeywordEntity({ keywordEntity: { raw: false, text: keyword }, entities });
    await setEntities(newEntities);

    keywordPayload_.query = keyword;
    await setKeywordPayload(keywordPayload_);
    console.info('Search by keyword:', keyword);
    const { hits: datasets } = await getDatasetsByKeyword(keywordPayload_);
    if (Array.isArray(datasets) && datasets.length === 0) {
      const msg = 'No dataset results';
      console.info(msg);
      setError(msg);
    } else {
      dispatch(resetSelectedByKey('selectedDataset', 'h3Index'));
      dispatch(resetSearchByKey('location', 'lastZoom'));
      console.info('Displaying datasets');
      dispatch(setDatasets(datasets));
      setShowChips(true);
      // @ts-ignore
      dispatch(setViewState({ latitude: 0, longitude: 0, zoom: 2 }));
    }
    setIsLoading(false);
    console.groupEnd();
  };

  const parseEntities = async () => {
    try {
      const { data: parseResults } = await axios.get(
        `${import.meta.env.VITE_API_URL}/search/parse`,
        {
          params: {
            query,
            // we exclude 'statistical indicator' from the default labels
            // since we don't have special handling for it right now
            labels: ['year', 'country', 'region'],
          },
          timeout: 6000,
        },
      );
      const { entities } = parseResults;
      if (Array.isArray(entities) && entities.length > 0) {
        console.info('Entities parsed', entities);
        return entities;
      } else {
        console.info('No entities parsed');
        return [{ label: 'keyword', text: query, raw: true }];
      }
    } catch (err) {
      console.error(err.toJSON());
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowChips(false);
    setIsLoading(true);
    setError(null);
    await setEntities([]);
    console.group(`Performing search: ${query}`);

    try {
      const entities = await parseEntities();
      await setEntities(entities);
      await afterParse({ entities });
    } catch (err) {
      console.error(err.toJSON());
    } finally {
      setIsLoading(false);
    }
  };

  const selectLocation = async ({ location, candidateDatasets = null }: { location: any, candidateDatasets: Dataset[] }) => {
    const [minLat, maxLat, minLon, maxLon] = location.boundingbox.map(parseFloat);
    const bbox = {
      minLat, maxLat, minLon, maxLon,
    };
    const { zoom } = moveViewportToBbox(bbox, viewState, dispatch, true);
    if (['Polygon', 'MultiPolygon'].includes(location.geojson.type)) {
      console.info('Filter by location', location);
      const datasets = await getSetDatasets({ location, zoom, candidateDatasets });
      if (Array.isArray(datasets) && datasets.length > 0) {
        console.info('Display datasets');
        dispatch(setLocation(location));
        moveViewportToBbox(bbox, viewState, dispatch);
        dispatch(setLastZoom(zoom));
        setShowChips(true);
      } else {
        const message = 'No dataset results';
        console.info(message);
        setError(message);
      }
    }
  };

  const selectOption = async (event: React.ChangeEvent<HTMLInputElement>, location: any | null) => {
    // will only be called if there are nominatim results
    setIsLoading(true);

    const keywordEntity = entities?.filter((e: Entity) => e.label === 'keyword')[0];
    const onlyKeywordEntity = entities.length === 1 && keywordEntity;
    const keyword_ = onlyKeywordEntity ? keywordEntity.text : await prepSearchKeyword(query, entities, location.skip ? ['region', 'country', 'statistical indicator'] : ['statistical indicator']);
    const updatedEntities = await updateKeywordEntity({ keywordEntity: { raw: false, text: keyword_ }, entities });
    await setEntities(updatedEntities);
    let candidateDatasets = [] as Dataset[];

    const hasNoLocationEntities = updatedEntities.filter((e: Entity) => !['region', 'country'].includes(e.label)).length === 0;
    const selectedLocationFromRawQuery = hasNoLocationEntities && !location.skip;

    if (location.skip) {
      // drop region and country entities - they will be used for keyword search instead
      await setEntities(updatedEntities.filter((e: Entity) => !['region', 'country'].includes(e.label)));
    }

    if (keyword_ && !selectedLocationFromRawQuery) {
      // we skip keyword search if we have a raw query from which location is selected from
      const keywordPayload_ = { ...keywordPayload, query: keyword_ };
      setKeywordPayload(keywordPayload_);
      const { hits } = await getDatasetsByKeyword(keywordPayload_);
      if (hits.length === 0) {
        // there's no candidate datasets to location-filter
        console.info('No dataset results; location filtering unnecessary');
        setError('No dataset results');
        setIsLoading(false);
        console.groupEnd();
        return;
      }
      candidateDatasets = hits;
    } else {
      console.info('Skipping keyword search');
    }

    dispatch(resetSelectedByKey('selectedDataset', 'h3Index'));
    dispatch(resetSearchByKey('location', 'lastZoom'));
    dispatch(setCandidateDatasets(candidateDatasets));

    if (location.skip) {
      console.info('Skip location filtering; display datasets');
      dispatch(setDatasets(candidateDatasets));
      setShowChips(true);
      // temporary ux hack: reset map view for faster load time
      // instead of flying to the first ranked dataset
      // @ts-ignore
      dispatch(setViewState({ latitude: 0, longitude: 0, zoom: 2 }));
    } else {
      await selectLocation({ location, candidateDatasets });
    }
    setIsLoading(false);
    console.groupEnd();
  };

  const handleDeleteFactory = (ce: Entity) => (
    () => {
      console.info(`Removing ${ce.label} entity`);
      // @ts-ignore
      const newEntities = entities.filter((e: Entity) => e.label !== ce.label);
      if (newEntities.length === 0) {
        resetSearch();
        return;
      }

      setEntities(newEntities);
      const reviseArgs = {
        deletedChipLabel: ce.label,
        entities: newEntities,
        keywordPayload,
      };

      // @ts-ignore
      if (ce.text === keywordPayload?.query) {
        // @ts-ignore
        const keywordPayload_ = { ...keywordPayload, query: null };
        setKeywordPayload(keywordPayload_);
        // @ts-ignore
        reviseArgs.keywordPayload = keywordPayload_;
      }

      reviseResults(reviseArgs);
    }
  );

  const resetSearch = () => {
    setEntities([]);
    setQuery('');
    setError('');
    setOptions([]);
    dispatch(resetPreviewByKey('fileUrl', 'isLoadingPreview', 'errorMessage'));
    dispatch(resetSearchByKey('location', 'lastZoom'));
    dispatch(resetSelectedByKey('datasets', 'candidateDatasets'));
    dispatch(resetSelectedFiltersByKey('datasetIds', 'h3IndexedDatasets'));
  };

  useEffect(() => {
    if (location && lastZoom) {
      getSetDatasets({ location, zoom: lastZoom });
    }
  }, [sourceOrgs, accessibilities]);

  // use Autocomplete as the base component since it conveniently
  // combines free text search and dropdown functionalities
  // TODO: consider separating the search autocomplete component and entities into diff files
  return (
    <div className={className}>
      <form className="w-full" onSubmit={handleSubmit} onReset={resetSearch}>
        <Autocomplete
          id="location-search"
          options={options}
          // disable filtering based on substring matching; simply use all of nominatim's results
          filterOptions={(options, state) => options}
          getOptionLabel={(option) => option.display_name || option.name}
          isOptionEqualToValue={(option, value) => option.place_id === value.place_id}
          inputValue={query}
          onChange={selectOption}
          onBlur={console.groupEnd}
          renderInput={(params) => (
            <TextField
              // eslint-disable-next-line react/jsx-props-no-spreading
              {...params}
              label="Search for datasets"
              error={!!error}
              helperText={error}
              variant="outlined"
              value={query}
              onChange={
                (event: React.ChangeEvent<HTMLInputElement>) => {
                  setError('');
                  setQuery(event.target.value);
                }
              }
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    <SearchButton isLoading={isLoading} disabled={query.trim() === ''} />
                    <ClearButton />
                  </>
                ),
              }}
            />
          )}
          // disable popup and clear to reclaim their reserved space
          // custom behavior is used in their place
          forcePopupIcon={false}
          disableClearable
          // prevent the 'No options' notice from showing
          // while the user is still inputting their query
          open={options.length > 0}
          openOnFocus={false}
          onClose={(event: React.SyntheticEvent, reason: string) => { setOptions([]); }}
        />
      </form>
      {
        entities && (
          <div className="mt-1.5">
            {
              !error
                && !isLoading
                && showChips
              // true
                && entities.filter((e: Entity) => !!e.text && e.label !== 'statistical indicator')
                  .map((chippedEntity: Entity) => (
                    <Chip
                      deleteIcon={<ClearIcon color="error" />}
                      onDelete={handleDeleteFactory(chippedEntity)}
                      className="first:ml-0 ml-1.5"
                      key={chippedEntity.label}
                      label={chippedEntity.text}
                      variant="outlined"
                    />
                  ))
            }
          </div>
        )
      }
    </div>
  );
}

export default Search;
