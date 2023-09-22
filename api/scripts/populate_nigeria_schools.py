import os
import s3fs
import sys
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import exists
from app.models import Dataset, H3Index
from datetime import datetime
import pytz
from worldex.handlers.vector_handlers import VectorHandler

DATABASE_CONNECTION = os.getenv("DATABASE_URL_SYNC")
BUCKET = os.getenv("AWS_BUCKET")
DATASET_DIR = os.getenv("AWS_DATASET_DIRECTORY")
DATASET_NAME = "Nigeria Schools"


def main():
    engine = create_engine(DATABASE_CONNECTION)
    s3 = s3fs.S3FileSystem(
        key=os.getenv("AWS_ACCESS_KEY_ID"),
        secret=os.getenv("AWS_SECRET_ACCESS_KEY"),
        endpoint_url=os.getenv("AWS_ENDPOINT_URL"),
    )

    Session = sessionmaker(bind=engine)
    with Session() as sess:
        if sess.query(exists().where(Dataset.name == DATASET_NAME)).scalar():
            print(f"{DATASET_NAME} dataset already exists")
            return
        with s3.open(
            url := f"s3://{BUCKET}/{DATASET_DIR}/nigeria-schools.zip"
        ) as schools_file:
            try:
                last_fetched = schools_file._details["LastModified"]
            except:
                last_fetched = datetime.now(pytz.utc)
            handler = VectorHandler.from_file(schools_file)
            h3_indices = handler.h3index()
            dataset = Dataset(
                name=DATASET_NAME,
                last_fetched=last_fetched,
                source_org="Humanitarian Data Exchange",
                data_format="shp",
                files=[
                    url,
                    "https://data.humdata.org/dataset/ec228c18-8edc-4f3c-94c9-a6b946af7229/resource/8dcb7188-16f2-447a-b006-1895e450bf11/download/nigeria_-_schools.zip'",
                ],
                description="Schools and educational institutions in Nigeria",
            )
            sess.add(dataset)
            sess.commit()

            hdf = pd.DataFrame({"h3_index": h3_indices, "dataset_id": dataset.id})
            print(hdf)
            hdf.to_sql(
                "h3_data",
                engine,
                if_exists="append",
                index=False,
                dtype={"h3_index": H3Index},
            )
            print(f"{DATASET_NAME} dataset loaded")


if __name__ == "__main__":
    sys.exit(main())
