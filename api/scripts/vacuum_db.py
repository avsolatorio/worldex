import os
import sys
import traceback

from psycopg2 import sql
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_CONNECTION = os.getenv("DATABASE_URL_SYNC")
TABLE_TO_VACUUM = os.getenv("TABLE_TO_VACUUM", "datasets")

def main():
    engine = create_engine(DATABASE_CONNECTION)

    # Session = sessionmaker(bind=engine)
    with engine.connect() as conn:
        with conn.execution_options(isolation_level='AUTOCOMMIT'):
            conn.execute(text(f"VACUUM FULL VERBOSE ANALYZE {engine.dialect.identifier_preparer.quote(TABLE_TO_VACUUM)}"))


if __name__ == "__main__":
    sys.exit(main())
