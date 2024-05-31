import os
import sys
import traceback

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DRY_RUN = os.getenv("DRY_RUN", "true").lower() == "true"
DATABASE_CONNECTION = os.getenv("DATABASE_URL_SYNC")
COUNTRY_KEYWORDS = os.getenv("COUNTRY_KEYWORDS")
if COUNTRY_KEYWORDS:
    COUNTRY_KEYWORDS = COUNTRY_KEYWORDS.split(",") if COUNTRY_KEYWORDS else []


def main():
    engine = create_engine(DATABASE_CONNECTION)

    Session = sessionmaker(bind=engine)
    with Session() as sess:
        for country in COUNTRY_KEYWORDS:
            try:
                dupe_ids = sess.scalars(
                    text(
                        """
                        SELECT id FROM datasets
                        WHERE dataset_id IS NOT NULL
                        AND dataset_id = (
                            SELECT id FROM datasets WHERE name ~* :natl_boundary_country
                        )
                        """
                    ).bindparams(natl_boundary_country=f"national boundaries, {country.lower()}$")
                ).all()
                print(f"Deleting h3 tiles of {country}'s dupe datasets:", dupe_ids)
                for dupe_id in dupe_ids:
                    sess.execute(text("DELETE FROM h3_data WHERE dataset_id = :dupe_id").bindparams(dupe_id=dupe_id))
                    sess.execute(text("DELETE FROM h3_children_indicators WHERE dataset_id = :dupe_id").bindparams(dupe_id=dupe_id))
                if DRY_RUN:
                    print("Dry run only, not committing")
                    continue
                sess.commit()
            except Exception:
                traceback.print_exc()
                continue


if __name__ == "__main__":
    sys.exit(main())
