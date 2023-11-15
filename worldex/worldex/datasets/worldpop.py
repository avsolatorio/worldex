"""
Automates indexing of world pop datasets
"""
import os
from datetime import datetime, date
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pandas as pd
import requests
from bs4 import BeautifulSoup
from shapely import wkt
from shapely.geometry import box

from ..handlers.raster_handlers import RasterHandler
from ..utils.filemanager import create_staging_dir, download_file
from .dataset import BaseDataset

WORLDPOP_API_CACHE = {}


def worldpop_get(url):
    """Simple caching for world pop api. Only cache certain urls"""
    if url not in WORLDPOP_API_CACHE:
        WORLDPOP_API_CACHE[url] = requests.get(url)
    return WORLDPOP_API_CACHE[url]


def get_date_range_from_pop_year(popyear: str) -> tuple[date, date]:
    year = int(popyear)
    return (date(year, 1, 1), date(year, 12, 31))


class WorldPopDataset(BaseDataset):
    """
    Usage:

    >>> dataset = WorldPopDataset.from_url("https://hub.worldpop.org/geodata/summary?id=34165")
    >>> dataset.index(dir="output/directory/")
    """

    source_org: str = "WorldPop"

    @classmethod
    def from_url(cls, url: str):
        # TODO: catch malformed url
        if "summary" in url:
            url = cls.summary_parser(url)
        data = worldpop_get(url).json()["data"]
        if isinstance(data, list):
            raise Exception("Processing a list of data is not yet supported")
        (date_start, date_end) = get_date_range_from_pop_year(data["popyear"])
        return cls(
            name=data["title"],
            last_fetched=datetime.now().isoformat(),
            files=data["files"],
            data_format="GeoTiff",  # TODO figure this out from metadata
            description=data["desc"],
            projection="EPSG:4326",
            properties={
                "category": data["category"],
            },
            keywords=[],
            date_start=date_start,
            date_end=date_end,
            accessibility="public/open",
            url=data["url_summary"],
        )

    @classmethod
    def summary_parser(cls, url: str):
        # TODO: catch malformed url
        parsed_url = urlparse(url)
        data_id = parse_qs(parsed_url.query)["id"][0]

        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        category = soup.find(class_="breadcrumb").find_all("a")[0].text
        listing = soup.find(class_="breadcrumb").find_all("a")[1].text
        # TODO: Add useful error message
        categories = worldpop_get("https://hub.worldpop.org/rest/data/").json()
        category_alias = next(
            filter(lambda x: x["name"] == category, categories["data"])
        )["alias"]
        listings = worldpop_get(
            f"https://hub.worldpop.org/rest/data/{category_alias}/"
        ).json()
        listing_alias = next(filter(lambda x: x["name"] == listing, listings["data"]))[
            "alias"
        ]
        return f"https://hub.worldpop.org/rest/data/{category_alias}/{listing_alias}/?id={data_id}"

    def index(self, window=(10, 10)):
        # TODO: Allow none tiff files like zip, 7z files.
        # TODO: handle multiple files
        url = next(filter(lambda x: x.endswith(".tif"), self.files))
        filename = Path(url).name
        # Skip downloading if file exists in dir
        if not os.path.exists(self.dir / filename):
            # TODO: https download is way slower than using worldpop ftp
            download_file(url, self.dir / filename)

        handler = RasterHandler.from_file(self.dir / filename)
        h3indices = handler.h3index(window=window)

        self.bbox = wkt.dumps(box(*handler.bbox))
        df = pd.DataFrame({"h3_index": h3indices})
        df.to_parquet(self.dir / "h3.parquet", index=False)
        with open(self.dir / "metadata.json", "w") as f:
            f.write(self.model_dump_json())
        return df
