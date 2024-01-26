import { setViewState } from '@carto/react-redux';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { Autocomplete, CircularProgress, IconButton, Paper, TextField } from "@mui/material";
import booleanWithin from "@turf/boolean-within";
import { multiPolygon, point, polygon } from "@turf/helpers";
import { cellToLatLng, getResolution } from "h3-js";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setFilteredDatasets, setResponse as setLocationResponse, setPendingLocationCheck } from 'store/locationSlice';
import { setH3Index as setSelectedH3Index } from 'store/selectedSlice';
import { RootState } from "store/store";
import bboxToViewStateParams from 'utils/bboxToViewStateParams';
import getClosestZoomResolutionPair from 'utils/getClosestZoomResolutionPair';

const SearchButton = ({isLoading}: {isLoading: boolean}) =>
  <div className="flex justify-center items-center w-[2em] mr-[-8px]">
    {
      isLoading ? <CircularProgress size="1em" /> : (
        <IconButton aria-label="search" type="submit">
          <SearchIcon />
        </IconButton>
      )
    }
  </div>

const ClearButton = () =>
  <div className="flex justify-center items-center w-[2em] mr-[-8px]">
    <IconButton arial-label="clear" type="reset">
      <ClearIcon />
    </IconButton>
  </div>


const LocationSearchManual = ({ className }: { className?: string }) => {
  const [value, setValue] = useState(null);
  const [query, setQuery] = useState("");

  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const dispatch = useDispatch();
  const { h3Index: selectedH3Index }: { h3Index: string } = useSelector((state: RootState) => state.selected);
  const viewState = useSelector((state: RootState) => state.carto.viewState);

  // const getDatasets = async ({ result, zoom }: { result: any, zoom: number }) => {
  //   const [_, resolution] = getClosestZoomResolutionPair(zoom);
  //   const datasetsResp = await fetch('/api/datasets_by_location/', {
  //     method: 'post',
  //     headers: {
  //       'Accept': 'application/json',
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       location: JSON.stringify(result.geojson),
  //       resolution,
  //     })
  //   });
  //   const datasetsResults = await datasetsResp.json();
  //   if (datasetsResults) {
  //     dispatch(setFilteredDatasets(datasetsResults));
  //   }

  //   dispatch(setPendingLocationCheck(true));
  //   if (selectedH3Index) {
  //     // deselect current tile if it's not among the tiles rendered inside the location feature
  //     const locationFeature = result.geojson.type === 'Polygon' ? polygon(result.geojson.coordinates) : multiPolygon(result.geojson.coordinates);
  //     const selectedTilePoint = point(cellToLatLng(selectedH3Index).reverse());
  //     if (getResolution(selectedH3Index) != resolution || !booleanWithin(selectedTilePoint, locationFeature)) {
  //       dispatch(setSelectedH3Index(null));
  //     }
  //   }
  // }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true);
    const encodedQuery = new URLSearchParams(query).toString()
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&polygon_geojson=1`,
    );
    const results = await resp.json();
    if (results == null || results.length === 0) {
      setIsError(true);
    } else {
      // console.log("setting options to", results)
      setOptions(results);
      // const result = results[0];
      // const [ minLat, maxLat, minLon, maxLon ] = result.boundingbox.map(parseFloat);
      // const bbox = { minLat, maxLat, minLon, maxLon };
      // dispatch(setLocationResponse(result));
      // const { width, height } = viewState;
      // const viewStateParams = bboxToViewStateParams({ bbox, width, height });
      // const { zoom } = viewStateParams;
      // @ts-ignore
      // dispatch(setViewState({...viewState, ...viewStateParams }));
      
      // if (result && ['Polygon', 'MultiPolygon'].includes(result.geojson.type)) {
      //   getDatasets({ result, zoom });
      // }
    }
    setIsLoading(false);
  }

  const selectLocation = (event: React.ChangeEvent<HTMLInputElement>, location: any | null) => {
    console.log("selectin location", location)
    setQuery(location.display_name || location.option.name);
    setValue(location);
    // const result = results[0];
      const [ minLat, maxLat, minLon, maxLon ] = location.boundingbox.map(parseFloat);
      const bbox = { minLat, maxLat, minLon, maxLon };
      dispatch(setLocationResponse(location));
      const { width, height } = viewState;
      const viewStateParams = bboxToViewStateParams({ bbox, width, height });
      // const { zoom } = viewStateParams;
      // @ts-ignore
      dispatch(setViewState({...viewState, ...viewStateParams }));
      // if (result && ['Polygon', 'MultiPolygon'].includes(result.geojson.type)) {
      //   getDatasets({ result, zoom });
      // }
      
  }

  const clearLocation = () => {
    setQuery("");
    setIsError(false);
    setOptions([]);
    dispatch(setFilteredDatasets(null));
  }

  return (
    <Paper className={className}>
      <div className="flex items-end">
        <form className="w-full" onSubmit={handleSubmit} onReset={clearLocation}>
          <Autocomplete
            id="location-search"
            options={options}
            getOptionLabel={(option) => option.display_name || option.name}
            isOptionEqualToValue={(option, value) => option.place_id === value.place_id}
            // we disable popup and clear since we implement custom behaviors,
            // and also to reclaim the reserved space/padding for them
            forcePopupIcon={false}
            disableClearable
            value={value}
            inputValue={query}
            onChange={selectLocation}
            renderInput={(params) => {
              return (
              <TextField
                {...params}
                error={isError}
                helperText={isError && "No results."}
                label="Search location"
                variant="outlined"
                value={query}
                onChange={
                  (event: React.ChangeEvent<HTMLInputElement>) => {
                    setIsError(false);
                    setQuery(event.target.value);
                  }
                }
                InputProps={{
                  ...params.InputProps,
                  className: `${params.InputProps.className} pr-0.5`,
                  endAdornment: (<>
                    <SearchButton isLoading={isLoading} />
                    <ClearButton />
                  </>)
                }}
            )}}
            // renderOption={(props, option) => {
            //   return <div className="hidden" />
            // }}
            // open={options.length > 0}
          />
        </form>
      </div>
    </Paper>
  )

export default LocationSearchManual;
