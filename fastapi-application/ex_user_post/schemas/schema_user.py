from pydantic import BaseModel, ConfigDict
from datetime import datetime


# ========================================================= #
#                BaseModel - User - pydantic                #
# ========================================================= #
class UserCreate(BaseModel):
    nickname: str
    firstname: str | None
    surname: str | None
    password: str


class UserResp(UserCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ========================================================== #
#                BaseModel - Post - pydantic                 #
# ========================================================== #
class PostCreate(BaseModel):
    title: str
    content: str
    user_id: int


class PostResp(PostCreate):
    id: int
    time_created: datetime

    model_config = ConfigDict(from_attributes=True)
