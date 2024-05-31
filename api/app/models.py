from datetime import datetime
from typing import List, Optional

from app.db import Base
from geoalchemy2.types import Geometry
from pydantic import BaseModel
from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Table,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import expression, func
from sqlalchemy.types import UserDefinedType


class H3Index(UserDefinedType):
    def get_col_spec(self):
        return "H3INDEX"


class HealthCheck(BaseModel):
    name: str
    version: str


class DatasetCountsRequest(BaseModel):
    resolution: int
    location: str | None = None
    source_org: Optional[List[str]] = []
    accessibility: Optional[List[str]] = []
    debug_json_response: bool = False
    ignore_cache: bool = False


class IndexedDatasetCountRequest(BaseModel):
    source_org: Optional[List[str]] = []
    accessibility: Optional[List[str]] = []


class DatasetMetadataRequest(BaseModel):
    source_org: Optional[List[str]] = []
    accessibility: Optional[List[str]] = []


class DatasetRequest(BaseModel):
    resolution: int
    dataset_id: int
    location: str | None = None


class DatasetsByLocationRequest(BaseModel):
    location: str
    resolution: int
    source_org: Optional[List[str]] = []
    accessibility: Optional[List[str]] = []


class TifAsPngRequest(BaseModel):
    url: str


dataset_keyword_association_table = Table(
    "dataset_keyword_association_table",
    Base.metadata,
    Column("dataset_id", ForeignKey("datasets.id"), primary_key=True),
    Column("keyword_id", ForeignKey("keywords.id"), primary_key=True),
)


class Dataset(Base):
    """
    Dataset metadata, including name
    """

    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    has_derivatives: Mapped[bool] = mapped_column(nullable=False, server_default=expression.false())
    dataset_id: Mapped[int] = mapped_column(nullable=True, index=True)
    uid: Mapped[str] = mapped_column(nullable=False, server_default='')
    name: Mapped[str] = mapped_column(nullable=False)
    source_org: Mapped[str] = mapped_column(nullable=True)
    last_fetched: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    date_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    date_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    url: Mapped[str] = mapped_column(String, nullable=True)
    files: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=True, default=[])
    accessibility: Mapped[str] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(nullable=True)
    data_format: Mapped[str] = mapped_column(nullable=False)
    projection: Mapped[str] = mapped_column(default="epsg:4326", nullable=False)
    properties = Column(JSONB, nullable=True)
    bbox = Column(Geometry(), nullable=False)
    keywords: Mapped[List["Keyword"]] = relationship(
        secondary=dataset_keyword_association_table, back_populates="datasets"
    )
    h3_data: Mapped[List["H3Data"]] = relationship(
        backref="dataset", cascade="all, delete-orphan"
    )
    has_compact_only: Mapped[bool] = mapped_column(server_default=expression.true(), nullable=False)

    __table_args__ = (
        Index(
            "ix_datasets_bbox_srid",
            text("st_setsrid(bbox, 4326)"),
            postgresql_using="gist",
        ),
    )

    __table_args__ = (
        UniqueConstraint("name", "uid", name="unique_name_uid"),
        CheckConstraint(
            '(date_start IS NULL AND date_end IS NULL) OR'
            '(date_start < date_end)',
            name="date_order"
        ),
    )


class Keyword(Base):

    __tablename__ = "keywords"

    id: Mapped[int] = mapped_column(primary_key=True)
    keyword = Column(String, nullable=False)

    datasets: Mapped[List["Dataset"]] = relationship(
        secondary=dataset_keyword_association_table, back_populates="keywords"
    )


class H3Data(Base):
    """
    Represents and dataset entries the are under an h3 tile
    """

    __tablename__ = "h3_data"

    id: Mapped[int] = mapped_column(primary_key=True)
    h3_index = Column(H3Index, index=True, nullable=False)

    dataset_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("dataset_id", "h3_index"),
        Index("ix_h3_data_h3_index_res", text("h3_get_resolution(h3_index)")),
    )


class H3ChildrenIndicator(Base):
    """
    H3 tiles that indicate presence of child cell(s) at higher resolutions.
    These are redundant, non-compact cells from a dataset used to prevent having
    to do EXISTS queries agains higher resolution tiles.
    """

    __tablename__ = "h3_children_indicators"

    id: Mapped[int] = mapped_column(primary_key=True)
    h3_index = Column(H3Index, index=True, nullable=False)

    dataset_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("dataset_id", "h3_index"),
    )


class DatasetCountTile(Base):
    """
    Caches dataset counts for all h3 tiles contained
    in the corresponding OSM tile (indexed z/x/y)
    """
    __tablename__ = "dataset_count_tiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    cached_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    z: Mapped[int] = mapped_column(Integer, nullable=False)
    x: Mapped[int] = mapped_column(Integer, nullable=False)
    y: Mapped[int] = mapped_column(Integer, nullable=False)
    dataset_counts = mapped_column(LargeBinary)

    __table_args__ = (
        UniqueConstraint("z", "x", "y"),
        Index("ix_dataset_count_tiles_zxy", "z", "x", "y")
    )
