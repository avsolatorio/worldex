DATASET_METADATA = """
WITH with_parents AS (
  SELECT
    CAST(:target AS H3INDEX),
    h3_cell_to_parent(
      CAST(:target AS H3INDEX),
      generate_series(0, h3_get_resolution(CAST(:target AS H3INDEX)))
    ) parent
),
_parent_datasets AS (
  SELECT DISTINCT(dataset_id) dataset_id FROM h3_data
  WHERE h3_index = ANY(ARRAY(SELECT parent FROM with_parents))
),
parent_datasets AS (
  SELECT UNNEST(
    ARRAY_CAT(ARRAY[d1.dataset_id], ARRAY_AGG(d2.id))
  ) dataset_id
  FROM _parent_datasets d1
  LEFT JOIN datasets d2 ON d1.dataset_id = d2.dataset_id
  GROUP BY d1.dataset_id
),
_children_datasets AS (
  SELECT DISTINCT(dataset_id) dataset_id FROM h3_children_indicators
  WHERE h3_index = CAST(:target AS H3INDEX)
),
children_datasets AS (
  SELECT UNNEST(
    ARRAY_CAT(ARRAY[d1.dataset_id], ARRAY_AGG(d2.id))
  ) dataset_id
  FROM _children_datasets d1
  LEFT JOIN datasets d2 ON d1.dataset_id = d2.dataset_id
  GROUP BY d1.dataset_id
),
dataset_ids AS (
  SELECT dataset_id FROM parent_datasets UNION
  SELECT dataset_id FROM children_datasets
)
SELECT
  id,
  name,
  ST_AsEWKT(bbox) bbox,
  source_org,
  regexp_replace(description, '\n', '\n', 'g') description,
  files,
  url,
  accessibility,
  date_start,
  date_end
FROM datasets
WHERE id = ANY(ARRAY(SELECT dataset_id FROM dataset_ids WHERE dataset_id IS NOT NULL))
"""

DATASET_METADATA_FILTERED = """
WITH with_parents AS (
  SELECT
    CAST(:target AS H3INDEX),
    h3_cell_to_parent(
      CAST(:target AS H3INDEX),
      generate_series(0, h3_get_resolution(CAST(:target AS H3INDEX)))
    ) parent
),
candidate_datasets AS ({candidate_datasets_query}),
_parent_datasets AS (
  SELECT DISTINCT(dataset_id) dataset_id FROM h3_data
  WHERE h3_index = ANY(ARRAY(SELECT parent FROM with_parents))
),
parent_datasets AS (
  SELECT UNNEST(
    CASE
      WHEN d1.dataset_id IN (SELECT id FROM candidate_datasets)
      THEN ARRAY_CAT(ARRAY[d1.dataset_id], ARRAY_AGG(d2.id))
      ELSE ARRAY_AGG(d2.id)
    END
  ) dataset_id
  FROM _parent_datasets d1
  LEFT JOIN datasets d2 ON (
    d1.dataset_id = d2.dataset_id
    AND d2.dataset_id IN (SELECT id FROM candidate_datasets)
  )
  GROUP BY d1.dataset_id
),
_children_datasets AS (
  SELECT DISTINCT(dataset_id) dataset_id FROM h3_children_indicators
  WHERE h3_index = CAST(:target AS H3INDEX)
),
children_datasets AS (
  SELECT UNNEST(
    CASE
      WHEN d1.dataset_id IN (SELECT id FROM candidate_datasets)
      THEN ARRAY_CAT(ARRAY[d1.dataset_id], ARRAY_AGG(d2.id))
      ELSE ARRAY_AGG(d2.id)
    END
  ) dataset_id
  FROM _children_datasets d1
  LEFT JOIN datasets d2 ON (
    d1.dataset_id = d2.dataset_id
    AND d2.dataset_id IN (SELECT id FROM candidate_datasets)
  )
  GROUP BY d1.dataset_id
),
dataset_ids AS (
  SELECT dataset_id FROM parent_datasets UNION
  SELECT dataset_id FROM children_datasets
)
SELECT
  id,
  name,
  ST_AsEWKT(bbox) bbox,
  source_org,
  regexp_replace(description, '\n', '\n', 'g') description,
  files,
  url,
  accessibility,
  date_start,
  date_end
FROM datasets
WHERE id = ANY(ARRAY(SELECT dataset_id FROM dataset_ids WHERE dataset_id IS NOT NULL))
"""
