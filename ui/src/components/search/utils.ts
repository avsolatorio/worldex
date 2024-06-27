import booleanWithin from '@turf/boolean-within';
import { multiPolygon, point, polygon } from '@turf/helpers';
import axios from 'axios';
import { Entity } from 'components/common/types';
import { cellToLatLng, getResolution } from 'h3-js';
import { resetByKey as resetSelectedByKey } from 'store/selectedSlice';

const stripEntities = (query: string, entities: Entity[]): string => {
  if (!Array.isArray(entities) || entities.length === 0) {
    return query;
  }
  const strippedQ = entities.reduce((acc, entity, idx, arr) => {
    const prevEntity = arr[idx - 1];
    const nextEntity = arr[idx + 1];
    acc += prevEntity ? query.slice(prevEntity.end, entity.start) : query.slice(0, entity.start);
    acc += !nextEntity ? query.slice(entity.end) : '';
    return acc;
  }, '');
  return strippedQ.trim();
};

export const prepSearchKeyword = async (query: string, entities: Entity[], labelsToKeep: string[]) => {
  const entitiesToStrip = entities.filter((e) => !labelsToKeep.includes(e.label));
  const stripped = stripEntities(query, entitiesToStrip);
  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_API_URL}/search/strip_stop_words`,
      { params: { query: stripped } },
    );
    const { tokens } = data;
    return tokens.map((t: any) => t.token).join(' ');
  } catch (err) {
    console.error(err.toJSON());
  }
};

export const getDatasetsByKeyword = async (params: any) => {
  console.info('Keyword search:', params);
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_URL}/search/keyword`,
    { params },
  );
  return data;
};

export const deselectTile = (h3Index: string, resolution: number, location: any, dispatch: any) => {
  // deselect current tile if it's not among the tiles rendered inside the location feature
  const locationFeature = (location.geojson.type === 'Polygon' ? polygon : multiPolygon)(location.geojson.coordinates);
  const selectedTilePoint = point(cellToLatLng(h3Index).reverse());
  if (getResolution(h3Index) !== resolution || !booleanWithin(selectedTilePoint, locationFeature)) {
    dispatch(resetSelectedByKey('h3Index'));
  }
};

export const updateKeywordEntity = ({ keywordEntity, entities }: { keywordEntity: any, entities: Entity[] }) => ([
  ...entities.filter((e: Entity) => e.label !== 'keyword'),
  { ...keywordEntity, label: 'keyword' },
]);
