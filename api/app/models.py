from pydantic import BaseModel

class HealthCheck(BaseModel):
    name: str

