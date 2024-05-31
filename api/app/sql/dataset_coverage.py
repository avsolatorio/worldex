# we take a minimal query time penalty for using generate_series()
# instead of concatenating the h3_cell_to_parent() calls for each
# resolution. but we do one less string concatenation
DATASET_COVERAGE = """
WITH fill AS ({fill_query}),
with_parents AS (
  SELECT fill_index, ARRAY_AGG(h3_cell_to_parent(fill_index, resolution)) parents
  FROM fill,
  LATERAL generate_series(0, :resolution) AS resolution
  GROUP BY fill_index
),
dataset AS (
  SELECT COALESCE(dataset_id, id) id FROM datasets WHERE id = :dataset_id
)
SELECT fill_index FROM with_parents
JOIN h3_data ON h3_index = ANY(parents)
AND dataset_id = (SELECT id FROM dataset)
UNION ALL
SELECT fill_index h3_index FROM fill
JOIN h3_children_indicators ON h3_children_indicators.h3_index = fill_index
AND dataset_id = (SELECT id FROM dataset)
"""
