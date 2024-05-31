import base64
from typing import List

import numpy as np
import pyarrow as pa
from app.models import Dataset
from app.sql.bounds_fill import FILL, FILL_RES2
from app.sql.dataset_counts import DATASET_COUNTS, DATASET_COUNTS_FILTERED
from app.sql.dataset_metadata import DATASET_METADATA, DATASET_METADATA_FILTERED
from sqlalchemy import or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy.sql.functions import coalesce


def img_to_data_url(img: np.ndarray):
    import cv2
    retval, buffer = cv2.imencode('.png', img)
    if not retval:
        raise Exception("Error encoding image")
    base64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/png;base64,{base64_str}"


def build_h3_parents_expression(resolution: int) -> str:
    # dynamically constructing this expression is faster than deriving from
    # generate_series(0, :resolution) despite the latter resulting to more readable code
    parents_array = ["fill_index"] + [
        f"h3_cell_to_parent(fill_index, {res})" for res in range(0, resolution)
    ]
    return ", ".join(parents_array)


def build_dataset_count_tiles_query(z: int, x: int, y: int, resolution: int, location: str, filters=None):
    dataset_counts_query = DATASET_COUNTS_FILTERED if filters else DATASET_COUNTS

    candidate_datasets_stmt = select(Dataset.id)
    if source_org := filters.get("source_org"):
        candidate_datasets_stmt = candidate_datasets_stmt.where(Dataset.source_org.in_(source_org))
    if accessibility := filters.get("accessibility"):
        conditions = []
        if "Others" in accessibility:
            conditions.append(Dataset.accessibility == None)
            accessibility.remove("Others")
        conditions.append(Dataset.accessibility.in_(accessibility))
        candidate_datasets_stmt = candidate_datasets_stmt.where(or_(*conditions))

    compiled = candidate_datasets_stmt.compile(compile_kwargs={"literal_binds": True})
    filter_kwargs = { "candidate_datasets_query": compiled } if filters else {}
    query = dataset_counts_query.format(
        parents_array=build_h3_parents_expression(resolution),
        fill_query=FILL_RES2 if resolution == 2 else FILL,
        **filter_kwargs
    )
    return text(query).bindparams(z=z, x=x, y=y, resolution=resolution, location=location)


async def get_dataset_count_tiles_async(session: AsyncSession, z: int, x: int, y: int, resolution: int, location: str, filters: dict[str, List[str]]={}):
    query = build_dataset_count_tiles_query(z, x, y, resolution, location, filters)
    results = await session.execute(query)
    return results.fetchall()


def get_dataset_count_tiles(session: Session, z: int, x: int, y: int, resolution: int, location: str, filters: dict[str, List[str]]={}):
    query = build_dataset_count_tiles_query(z, x, y, resolution, location, filters)
    results = session.execute(query)
    return results.fetchall()


def dataset_count_to_bytes(dataset_counts):
    table = pa.Table.from_pydict(
        dataset_counts,
        schema=pa.schema([
            ('index', pa.string()),
            ('dataset_count', pa.int32()),
        ]),
    )
    sink = pa.BufferOutputStream()
    with pa.RecordBatchStreamWriter(sink, table.schema) as writer:
        writer.write_table(table)
    serialized_data = sink.getvalue()
    return serialized_data.to_pybytes()


async def get_dataset_metadata_results(session: Session, target: str, filters: dict[str, List[str]]={}):
    dataset_metadata_query = DATASET_METADATA_FILTERED if filters else DATASET_METADATA
    candidate_datasets_stmt = select(Dataset.id)
    if source_org := filters.get("source_org"):
        candidate_datasets_stmt = candidate_datasets_stmt.where(Dataset.source_org.in_(source_org))
    if accessibility := filters.get("accessibility"):
        conditions = []
        if "Others" in accessibility:
            conditions.append(Dataset.accessibility == None)
            accessibility.remove("Others")
        conditions.append(Dataset.accessibility.in_(accessibility))
        candidate_datasets_stmt = candidate_datasets_stmt.where(or_(*conditions))
    compiled = candidate_datasets_stmt.compile(compile_kwargs={"literal_binds": True})
    filter_kwargs = { "candidate_datasets_query": compiled } if filters else {}
    query = dataset_metadata_query.format(
        **filter_kwargs
    )
    query = text(query).bindparams(target=target)
    results = await session.execute(query)
    return results.fetchall()
