import { useDispatch, useSelector } from 'react-redux';
// @ts-ignore
import { BitmapLayer } from '@deck.gl/layers/typed';
import '@loaders.gl/polyfills';
import GeoTIFF, {
  GeoTIFFImage,
  ReadRasterResult,
  fromUrl,
} from 'geotiff';
import { useEffect, useState } from 'react';
import { RootState } from 'store/store';
import { setErrorMessage, setFileUrl, setIsLoadingPreview } from 'store/previewSlice';

export const TIF_PREVIEW_LAYER_ID = 'tifPreviewLayer';

export default function TifPreviewLayer() {
  const { tifPreviewLayer } = useSelector((state: RootState) => state.carto.layers);
  const { fileUrl } = useSelector((state: RootState) => state.preview);

  const [tifData, setTifData] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    if (fileUrl == null) {
      if (tifData !== null) {
        setTifData(null);
      }
    } else if (['.tif', '.tiff', '.geotif', '.geotiff'].some((ext) => fileUrl.endsWith(ext))) {
      // TODO: inspect mimetype as well? or copy how GeoTIFFLoader checks the magic numbers
      dispatch(setIsLoadingPreview(true));
      fetch(
        '/api/tif_as_png/',
        {
          method: 'post',
          body: JSON.stringify({
            url: fileUrl,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ).then(
        (resp: Response) => resp.json(),
      ).then(
        (resp) => {
          const { data_url, bbox } = resp;
          setTifData({ dataUrl: data_url, bbox });
        },
      ).catch((e) => {
        dispatch(setFileUrl(null));
        dispatch(setErrorMessage(e.message));
      })
        .finally(() => {
          dispatch(setIsLoadingPreview(false));
        });
    }
  }, [fileUrl]);

  if (tifPreviewLayer && tifData) {
    return new BitmapLayer({
      id: TIF_PREVIEW_LAYER_ID,
      image: tifData.dataUrl,
      // @ts-ignore
      bounds: [...tifData.bbox],
    });
  }
}
