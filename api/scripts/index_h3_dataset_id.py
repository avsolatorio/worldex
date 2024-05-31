import os
import sys
import traceback

from psycopg2 import sql
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_CONNECTION = os.getenv("DATABASE_URL_SYNC")

def main():
    engine = create_engine(DATABASE_CONNECTION, connect_args={"options": "-c statement_timeout=7200000"})
    with engine.connect() as conn:
        conn.execute(
            text(
                f"CREATE INDEX ix_h3_data_h3_index_incl_dataset_id ON public.h3_data(h3_index) INCLUDE (dataset_id);"
            )
        )


if __name__ == "__main__":
    sys.exit(main())
