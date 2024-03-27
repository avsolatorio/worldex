import base64
import cv2
import numpy as np
import pyarrow as pa

from app.sql.bounds_fill import FILL, FILL_RES2
from app.sql.dataset_counts import DATASET_COUNTS
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


def img_to_data_url(img: np.ndarray):
    retval, buffer = cv2.imencode('.png', img)
    if not retval:
        raise Exception("Error encoding image")
    base64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/png;base64,{base64_str}"


async def get_dataset_count_tiles(session: AsyncSession, z: int, x: int, y: int, resolution: int, location: str):
    # dynamically constructing this expression is faster than deriving from
    # generate_series(0, :resolution) despite the latter resulting to more readable code
    parents_array = ["fill_index"] + [
        f"h3_cell_to_parent(fill_index, {res})" for res in range(0, resolution)
    ]
    parents_comma_delimited = ", ".join(parents_array)
    query = DATASET_COUNTS.format(
        parents_array=parents_comma_delimited,
        fill_query=FILL_RES2 if resolution == 2 else FILL
    )
    query = text(query).bindparams(z=z, x=x, y=y, resolution=resolution, location=location)
    results = await session.execute(query)
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