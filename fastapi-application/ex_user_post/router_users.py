from typing import Annotated

from fastapi import (
    APIRouter,
    Body,
)

from .schemas.schema_user import UserResp, UserCreate

from .crud import crud_users as users_crud

from core.config import settings
from db_core.db_async import CurrentSession


r_users_sql = APIRouter(
    prefix=settings.api.user_post_prefix,
    tags=["Sql example users"],
)


@r_users_sql.get("/get_all_users", response_model=list[UserResp])
async def get_users(session: CurrentSession):
    users = await users_crud.get_all_users(session=session)
    return users


@r_users_sql.post("/create_user", response_model=UserResp)
async def create_user(
    session: CurrentSession,
    user_create: Annotated[
        UserCreate,
        Body(),
    ],
):
    user = await users_crud.create_user(
        session=session,
        user_create=user_create,
    )
    return user
