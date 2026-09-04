from base_dir_path import BASE_DIR

from pydantic import (
    BaseModel,
    AnyUrl,
    UrlConstraints,
    PostgresDsn,
)

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class RunConfig(BaseModel):
    host: str = "0.0.0.0"
    port: int = 8000


class WebConfig(BaseModel):
    secret_key: str = "dev-insecure-secret-key-change-me"


class ApiV1Prefix(BaseModel):
    prefix: str = "/v1"
    dep_examples: str = "/dep_examples"
    fastapi_class_old: str = "/fastapi_class_old"
    fastapi_class_annotated: str = "/fastapi_class_annotated"
    depends_class_annotated: str = "/depends_class_annotated"
    depends_function_annotated: str = "/depends_function_annotated"


class ApiPrefix(BaseModel):
    prefix: str = "/api"
    v1: ApiV1Prefix = ApiV1Prefix()
    user_post_prefix: str = "/users"
    order_product_prefix: str = "/orders"


class SqliteDsn(AnyUrl):
    _constraints = UrlConstraints(
        allowed_schemes=[
            "sqlite",
            "sqlite+aiosqlite",
        ],
        host_required=False,
    )


class DatabaseConfig(BaseModel):
    url: PostgresDsn | SqliteDsn
    echo: bool = False
    echo_pool: bool = False
    pool_size: int = 50
    max_overflow: int = 10

    naming_convention: dict[str, str] = {
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_N_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            BASE_DIR / "prod_db.env",  # postgres
            BASE_DIR / "dev_sqlite.env",  # sqlite
            BASE_DIR / ".env",
        ),
        case_sensitive=False,
        env_prefix="APP__",
        env_nested_delimiter="__",
    )

    run: RunConfig = RunConfig()
    api: ApiPrefix = ApiPrefix()
    web: WebConfig = WebConfig()

    db: DatabaseConfig


settings = Settings()
