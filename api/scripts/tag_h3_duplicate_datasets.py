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
                country_lowered = country.lower()
                natl_boundary_country = f"national boundaries, {country_lowered}$"
                q = text(
                    """
                    WITH country_datasets AS (
                        SELECT id, name FROM datasets
                        WHERE name ~* :country
                    ),
                    with_h3_counts AS (
                        SELECT
                            country_datasets.id,
                            country_datasets.name,
                            COUNT(h3_data.id) h3_count
                        FROM h3_data
                        JOIN
                        country_datasets ON country_datasets.id = h3_data.dataset_id
                        GROUP BY country_datasets.id, country_datasets.name
                        ORDER BY h3_count
                    )
                    SELECT * FROM with_h3_counts
                    WHERE h3_count = (SELECT h3_count FROM with_h3_counts WHERE name ~* :natl_boundary_country)
                    ORDER BY CASE WHEN name ~* :natl_boundary_country THEN 0 ELSE 1 end;
                    """
                ).bindparams(
                    country=country_lowered,
                    natl_boundary_country=natl_boundary_country)
                results = sess.execute(q).fetchall()
                country_datasets = [row._mapping for row in results]
                print(country_datasets)
                if not country_datasets:
                    print("No datasets to tag")
                    continue

                assert "national boundaries" in country_datasets[0]["name"].lower()
                natl_boundary_dataset_id = country_datasets[0]["id"]
                duplicate_dataset_ids = [d["id"] for d in country_datasets[1:]]
                mark_as_duplicate_q = text(
                    """
                    UPDATE datasets
                    SET dataset_id = :natl_boundary_dataset_id
                    WHERE id = ANY(:duplicate_dataset_ids)
                    """
                ).bindparams(natl_boundary_dataset_id=natl_boundary_dataset_id, duplicate_dataset_ids=duplicate_dataset_ids)
                sess.execute(mark_as_duplicate_q)

                sess.execute(
                    text("""
                        UPDATE datasets
                        SET has_derivatives = TRUE
                        WHERE id = (
                            SELECT id FROM datasets WHERE name ~* :natl_boundary_country
                        )
                    """).bindparams(natl_boundary_country=natl_boundary_country)
                )
                if DRY_RUN:
                    print("Dry run only, not committing")
                    continue
                sess.commit()
            except Exception:
                traceback.print_exc()
                sess.rollback()
                continue


if __name__ == "__main__":
    sys.exit(main())
