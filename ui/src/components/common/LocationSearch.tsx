import { CircularProgress, IconButton, Paper, TextField } from "@mui/material"
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import React, { useState } from "react";
import { setViewState } from '@carto/react-redux';
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "store/store";
import { setFilteredDatasets, setResponse as setLocationResponse } from 'store/locationSlice';
import bboxToViewStateParams from 'utils/bboxToViewStateParams';

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


const LocationSearch = ({ className }: { className?: string }) => {
  const [query, setQuery] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const dispatch = useDispatch();
  const viewState = useSelector((state: RootState) => state.carto.viewState);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true);
    const encodedQuery = new URLSearchParams(query).toString()
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&polygon_geojson`,
    );
    const results = await resp.json();
    if (results == null || results.length === 0) {
      setIsError(true);
    } else {
      const result = results[0];
      const [ minLat, maxLat, minLon, maxLon ] = result.boundingbox.map(parseFloat);
      const bbox = { minLat, maxLat, minLon, maxLon };
      dispatch(setLocationResponse(result));
      const { width, height } = viewState;
      // @ts-ignore
      dispatch(setViewState({...viewState, ...bboxToViewStateParams({ bbox, width, height }) }));
      
      if (result && ['Polygon', 'MultiPolygon'].includes(result.geojson.type)) {
        const datasetsResp = await fetch('/api/datasets_by_location/', {
          method: 'post',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ location: JSON.stringify(result.geojson) })
        });
        const datasetsResults = await datasetsResp.json();
        if (datasetsResults) {
          dispatch(setFilteredDatasets(datasetsResults));
        }
      }
    }
    setIsLoading(false);
  }

  const clearLocation = () => {
    setQuery("");
    setIsError(false);
    dispatch(setLocationResponse(null));
    dispatch(setFilteredDatasets(null));
  }

  return (
    <Paper className={className}>
      <div className="flex items-end">
        <form onSubmit={handleSubmit} onReset={clearLocation}>
          <TextField
            error={isError}
            helperText={isError && "No results."}
            label="Search Location"
            variant="outlined"
            value={query}
            onChange={
              (event: React.ChangeEvent<HTMLInputElement>) => {
                setIsError(false);
                setQuery(event.target.value);
              }
            }
            InputProps={{
              // @ts-ignore
              endAdornment: (
                <>
                  <SearchButton isLoading={isLoading} />
                  <ClearButton />
                </>
              ),
              className: "pr-0.5"
            }}
          />
        </form>
      </div>
    </Paper>
  )
}

export default LocationSearch;
