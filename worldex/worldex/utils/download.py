from contextlib import contextmanager
from tempfile import TemporaryDirectory
from pathlib import Path

import requests


def download_file(url, filename):
    """Download a large file using python streams"""
    # TODO: Optional progress bar
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        # total_size_in_bytes= int(response.headers.get('content-length', 0))
        # progress_bar = tqdm(total=total_size_in_bytes, unit='iB', unit_scale=True)
        with open(filename, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                # progress_bar.update(len(data))
                f.write(chunk)


@contextmanager
def create_staging_dir(dir=None) -> (Path, bool):
    """Create tempdir if dir is none, else convert dir to Pathlib
    Usage:
    >>> with create_staging_dir(dir)as (staging, is_tempdir):
    >>>     ...
    """
    if dir is None:
        with TemporaryDirectory() as temp_dir:
            yield (Path(temp_dir.name), True)
    else:
        staging_dir = Path(dir)
        # TODO: test if this works with s3 filemounting
        if staging_dir.is_dir():
            raise Exception(f"dir: {dir} is not a valid directory")
        yield (staging_dir, False)
