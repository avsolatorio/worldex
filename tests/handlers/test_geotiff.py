import numpy as np
import rasterio
from rasterio.transform import from_origin

import pytest
from worldex.handlers.raster_handlers import RasterHandler


@pytest.fixture
def geotiff_test_file(tmp_path):
    data = np.random.rand(128, 128)
    transform = from_origin(0, 0, 0.0001, 0.0001)
    crs = "epsg:4326"
    output_file = tmp_path / "output.tif"

    with rasterio.open(
        output_file,
        "w",
        driver="GTiff",
        height=data.shape[0],
        width=data.shape[1],
        count=1,  # Number of bands
        dtype=data.dtype,
        crs=crs,
        transform=transform,
    ) as dst:
        dst.write(data, 1)
    yield output_file


def test_geotiff_file(geotiff_test_file):
    result = RasterHandler.from_file(geotiff_test_file)
    assert set(result.h3index()) == {
        614552959832817663,
        614552959830720511,
        614552959839109119,
        614552959826526207,
    }


@pytest.fixture
def geotiff_test_file_epsg3857(tmp_path):
    data = np.random.rand(128, 128)
    transform = from_origin(-391951, 3919506, 100, 100)
    crs = "epsg:3847"
    output_file = tmp_path / "output.tif"

    with rasterio.open(
        output_file,
        "w",
        driver="GTiff",
        height=data.shape[0],
        width=data.shape[1],
        count=1,  # Number of bands
        dtype=data.dtype,
        crs=crs,
        transform=transform,
    ) as dst:
        dst.write(data, 1)
    yield output_file


@pytest.mark.skip(reason="Supporting non epsg:4387 is not yet implemented")
def test_geotiff_file_epsg3857(geotiff_test_file_epsg3857):
    result = RasterHandler.from_file(geotiff_test_file_epsg3857)
    assert set(result.h3index()) == {
        614552959832817663,
        614552959830720511,
        614552959839109119,
        614552959826526207,
    }
