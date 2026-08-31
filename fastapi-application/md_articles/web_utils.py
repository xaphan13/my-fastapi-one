# ==============================================================================
# +++++++++++++++++++++++++++++++ Web utilities ++++++++++++++++++++++++++++++++
# ------------------- сессии, current_user, password helpers -------------------
# ------------------------------------------------------------------------------
import bcrypt
from fastapi import Request
from sqlalchemy import select

from db_core.db_async import CurrentSession
from md_articles.models import BlogUser


# ==============================================================================
# +++++++++++++++++++++++++++ current_user dependency ++++++++++++++++++++++++++
# ------------------------------------------------------------------------------
async def get_current_user(
    request: Request,
    session: CurrentSession,
) -> BlogUser | None:
    """Получить пользователя из сессии и положить в request.state."""
    user_id = request.session.get("user_id")
    if user_id is None:
        request.state.current_user = None
        return None
    result = await session.execute(select(BlogUser).where(BlogUser.id == user_id))
    user = result.scalar_one_or_none()
    request.state.current_user = user
    return user


# ==============================================================================
# +++++++++++++++++++++++++++++ auth helpers +++++++++++++++++++++++++++++++++++
# ------------------------------------------------------------------------------
def login_user(request: Request, user_id: int) -> None:
    request.session["user_id"] = user_id


def logout_user(request: Request) -> None:
    request.session.pop("user_id", None)


# ==============================================================================
# +++++++++++++++++++++++++++++ password helpers +++++++++++++++++++++++++++++++
# ------------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))