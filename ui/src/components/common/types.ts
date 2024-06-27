
export interface Dataset {
  id: number;
  bbox: number[];
  name: string;
  source_org: string;
  description: string;
  url: string;
  files: string[];
  accessibility: string;
  date_start: Date;
  date_end: Date;
  meta: any;
}

export interface DatasetCount {
  index: string;
  dataset_count: number;
}

export interface Entity {
  raw?: boolean;
  start?: number;
  end?: number;
  text: string;
  label: string;
  score?: number;
}

// no actual range validation
// longitude is x-coordinate, latitude is y-coordinate
export interface BoundingBox {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}
