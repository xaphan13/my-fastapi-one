from sqlalchemy import (
    BIGINT,
    Integer,
    String,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from .model_id_pk_mixin import IntIdPkMixin

from db_core.model_base import Base


class TestUser(IntIdPkMixin, Base):
    name: Mapped[str] = mapped_column(
        String(),
        unique=True,
    )
    age: Mapped[int] = mapped_column(
        Integer(),
        nullable=True,
    )
    number: Mapped[int] = mapped_column(
        BIGINT,
        unique=True,
    )
