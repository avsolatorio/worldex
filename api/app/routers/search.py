import os
from typing import Union

from app.search.es import keyword_search
from app.search.parser import parse_query
from elasticsearch.client import IndicesClient
from fastapi import APIRouter, Query

from elasticsearch import Elasticsearch

router = APIRouter(
    prefix="/search",
    tags=["search"]
)

ELASTICSEARCH_CONNECTION = os.getenv("ELASTICSEARCH_URL_SYNC")
client = Elasticsearch(ELASTICSEARCH_CONNECTION)
indices_client = IndicesClient(client)


@router.get("/strip_stop_words")
def strip_stop_words(
    query: str
):
    return indices_client.analyze(
        body={
            "tokenizer": "standard",
            "filter": ["stop"],
            "text": query,
        }
    )


@router.get("/parse")
def parse(
    query: Union[str, None] = None,
    labels: list[str] = Query(
        ["year", "country", "statistical indicator", "region"],
        description="A set of labels for tagging segments of the query."
    ),
    threshold: float = 0.3,
    nested_ner: bool = False
):
    if query is None:
        return {"error": "Query parameter is required."}
    return parse_query(query, labels, threshold, nested_ner)


@router.get("/keyword")
def search_keyword(
    query: str,
    source_org: list[str] = Query(None, description="The source organization"),
    accessibility: list[str] = Query(None, description="The accessibility"),
    projection: list[str] = Query(None, description="The projection"),
    min_year: int = Query(None, description="The minimum year"),
    max_year: int = Query(None, description="The maximum year"),
    from_result: int = Query(0, description="The starting index"),
    size: int = Query(10, description="The number of results to return"),
):
    return keyword_search(query, source_org, accessibility, projection, min_year, max_year, from_result, size)
