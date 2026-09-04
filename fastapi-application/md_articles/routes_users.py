# ==============================================================================
# +++++++++++++++++++++++++++++++ routes_users +++++++++++++++++++++++++++++++++
# ---------------------- /register /login /logout /account ---------------------
# ------------------------------------------------------------------------------
import io
import os
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import RedirectResponse
from PIL import Image
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import select

from config_log import logF
from db_core.db_async import CurrentSession
from md_articles.models import BlogUser
from md_articles.web_utils import (
    flash,
    hash_password,
    login_user,
    logout_user,
    render_template,
    require_login,
    validate_csrf,
    verify_password,
)


router_users = APIRouter(
    tags=["blog users"],
)


# ==============================================================================
# +++++++++++++++++++++++++++++ pydantic forms +++++++++++++++++++++++++++++++++
# ------------------------------------------------------------------------------
class RegistrationForm(BaseModel):
    username: str = ""
    email: str = ""
    password: str = ""
    confirm_password: str = ""

    @field_validator("username")
    @classmethod
    def _username_required(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("This field is required.")
        return value.strip()

    @field_validator("username")
    @classmethod
    def _username_length(cls, value: str) -> str:
        if len(value) < 2 or len(value) > 20:
            raise ValueError("Field must be between 2 and 20 characters long.")
        return value

    @field_validator("email")
    @classmethod
    def _email_required(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("This field is required.")
        return value.strip()


class LoginForm(BaseModel):
    email: str = ""
    password: str = ""
    remember: bool = False

    @field_validator("email")
    @classmethod
    def _email_required(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("This field is required.")
        return value.strip()

    @field_validator("password")
    @classmethod
    def _password_required(cls, value: str) -> str:
        if not value:
            raise ValueError("This field is required.")
        return value


class UpdateAccountForm(BaseModel):
    username: str = ""
    email: str = ""

    @field_validator("username")
    @classmethod
    def _username_required(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("This field is required.")
        return value.strip()

    @field_validator("username")
    @classmethod
    def _username_length(cls, value: str) -> str:
        if len(value) < 2 or len(value) > 20:
            raise ValueError("Field must be between 2 and 20 characters long.")
        return value

    @field_validator("email")
    @classmethod
    def _email_required(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("This field is required.")
        return value.strip()


# ==============================================================================
# +++++++++++++++++++++++++++++++ helpers ++++++++++++++++++++++++++++++++++++++
# ------------------------------------------------------------------------------
_ERROR_INVALID_EMAIL = "Invalid email address."
_ERROR_PASSWORD_MATCH = "Fields must match."
_ERROR_USERNAME_TAKEN = "That username is taken. Please choose a different one."
_ERROR_EMAIL_TAKEN = "That email is taken. Please choose a different one."


def _build_field_context(
    name: str,
    label: str,
    value: str = "",
    type_: str = "text",
    errors: list[str] | None = None,
    checked: bool = False,
) -> dict:
    return {
        "name": name,
        "id": name,
        "type": type_,
        "label": label,
        "value": value,
        "errors": errors or [],
        "checked": checked,
    }


def _is_valid_email(email: str) -> bool:
    try:
        from pydantic import EmailStr

        EmailStr._validate(email)  # type: ignore[attr-defined]
        return True
    except Exception:
        return False


async def _username_exists(session: CurrentSession, username: str) -> bool:
    result = await session.execute(select(BlogUser).where(BlogUser.username == username))
    return result.scalar_one_or_none() is not None


async def _email_exists(session: CurrentSession, email: str) -> bool:
    result = await session.execute(select(BlogUser).where(BlogUser.email == email))
    return result.scalar_one_or_none() is not None


# ==============================================================================
# +++++++++++++++++++++++++++++++ register +++++++++++++++++++++++++++++++++++++
# ------------------------------------------------------------------------------
@router_users.get("/register", name="users.register")
async def register_get(request: Request):
    if getattr(request.state, "current_user", None) is not None:
        return RedirectResponse("/art_home", status_code=307)
    return render_template(
        "register.html",
        {
            "request": request,
            "title": "Register",
            "form": _build_register_form_context(),
        },
    )


@router_users.post("/register", name="users.register")
async def register_post(
    request: Request,
    session: CurrentSession,
    username: Annotated[str, Form()] = "",
    email: Annotated[str, Form()] = "",
    password: Annotated[str, Form()] = "",
    confirm_password: Annotated[str, Form()] = "",
):
    await validate_csrf(request)

    if getattr(request.state, "current_user", None) is not None:
        return RedirectResponse("/art_home", status_code=307)

    errors = await _validate_registration(session, username, email, password, confirm_password)
    if errors:
        return render_template(
            "register.html",
            {
                "request": request,
                "title": "Register",
                "form": _build_register_form_context(
                    username, email, password, confirm_password, errors
                ),
            },
            status_code=200,
        )

    hashed_password = hash_password(password)
    user = BlogUser(username=username.strip(), email=email.strip(), password=hashed_password)
    logF.info(f"register = {user}")
    session.add(user)
    await session.commit()

    flash(request, "Your account has been created! You are now able to log in", "success")
    return RedirectResponse("/login", status_code=307)


async def _validate_registration(
    session: CurrentSession,
    username: str,
    email: str,
    password: str,
    confirm_password: str,
) -> dict[str, list[str]]:
    errors: dict[str, list[str]] = {}
    username = username.strip()
    email = email.strip()

    if not username:
        errors.setdefault("username", []).append("This field is required.")
    elif len(username) < 2 or len(username) > 20:
        errors.setdefault("username", []).append("Field must be between 2 and 20 characters long.")

    if not email:
        errors.setdefault("email", []).append("This field is required.")
    elif not _is_valid_email(email):
        errors.setdefault("email", []).append(_ERROR_INVALID_EMAIL)

    if not password:
        errors.setdefault("password", []).append("This field is required.")

    if not confirm_password:
        errors.setdefault("confirm_password", []).append("This field is required.")
    elif confirm_password != password:
        errors.setdefault("confirm_password", []).append(_ERROR_PASSWORD_MATCH)

    if username and not errors.get("username") and await _username_exists(session, username):
        errors.setdefault("username", []).append(_ERROR_USERNAME_TAKEN)

    if email and not errors.get("email") and await _email_exists(session, email):
        errors.setdefault("email", []).append(_ERROR_EMAIL_TAKEN)

    return errors


def _build_register_form_context(
    username: str = "",
    email: str = "",
    password: str = "",
    confirm_password: str = "",
    errors: dict[str, list[str]] | None = None,
) -> dict:
    errors = errors or {}
    return {
        "username": _build_field_context(
            "username", "Username", username, errors=errors.get("username", [])
        ),
        "email": _build_field_context(
            "email", "Email", email, "email", errors=errors.get("email", [])
        ),
        "password": _build_field_context(
            "password", "Password", password, "password", errors=errors.get("password", [])
        ),
        "confirm_password": _build_field_context(
            "confirm_password",
            "Confirm Password",
            confirm_password,
            "password",
            errors=errors.get("confirm_password", []),
        ),
    }


# ==============================================================================
# ++++++++++++++++++++++++++++++++ login +++++++++++++++++++++++++++++++++++++++
# ------------------------------------------------------------------------------
@router_users.get("/login", name="users.login")
async def login_get(request: Request):
    if getattr(request.state, "current_user", None) is not None:
        return RedirectResponse("/art_home", status_code=307)
    return render_template(
        "login.html",
        {
            "request": request,
            "title": "Login",
            "form": _build_login_form_context(),
        },
    )


@router_users.post("/login", name="users.login")
async def login_post(
    request: Request,
    session: CurrentSession,
    email: Annotated[str, Form()] = "",
    password: Annotated[str, Form()] = "",
    remember: Annotated[bool, Form()] = False,
):
    await validate_csrf(request)

    if getattr(request.state, "current_user", None) is not None:
        return RedirectResponse("/art_home", status_code=307)

    errors: dict[str, list[str]] = {}
    if not email:
        errors.setdefault("email", []).append("This field is required.")
    if not password:
        errors.setdefault("password", []).append("This field is required.")

    user = None
    if email:
        result = await session.execute(select(BlogUser).where(BlogUser.email == email.strip()))
        user = result.scalar_one_or_none()

    if user and verify_password(password, user.password):
        login_user(request, user.id)
        next_page = request.query_params.get("next", "")
        if next_page.startswith("/") and not next_page.startswith("//"):
            return RedirectResponse(next_page, status_code=307)
        return RedirectResponse("/art_home", status_code=307)

    flash(request, "Login Unsuccessful. Please check email and password", "danger")
    return render_template(
        "login.html",
        {
            "request": request,
            "title": "Login",
            "form": _build_login_form_context(email, remember, errors),
        },
        status_code=200,
    )


def _build_login_form_context(
    email: str = "",
    remember: bool = False,
    errors: dict[str, list[str]] | None = None,
) -> dict:
    errors = errors or {}
    return {
        "email": _build_field_context(
            "email", "Email", email, "email", errors=errors.get("email", [])
        ),
        "password": _build_field_context(
            "password", "Password", "", "password", errors=errors.get("password", [])
        ),
        "remember": {
            "name": "remember",
            "id": "remember",
            "type": "checkbox",
            "label": "Remember Me",
            "checked": remember,
            "value": "y",
            "errors": [],
        },
    }


# ==============================================================================
# ++++++++++++++++++++++++++++++++ logout ++++++++++++++++++++++++++++++++++++++
# ------------------------------------------------------------------------------
@router_users.get("/logout", name="users.logout")
async def logout(request: Request):
    logout_user(request)
    return RedirectResponse("/art_home", status_code=307)


# ==============================================================================
# ++++++++++++++++++++++++++++++++ account +++++++++++++++++++++++++++++++++++++
# ------------------------------------------------------------------------------
@router_users.get("/account", name="users.account")
async def account_get(request: Request, _user=Depends(require_login)):
    current_user = request.state.current_user
    return render_template(
        "account.html",
        {
            "request": request,
            "title": "Account",
            "image_file": f"/static/profile_pics/{current_user.image_file}",
            "form": _build_account_form_context(current_user.username, current_user.email),
        },
    )


@router_users.post("/account", name="users.account")
async def account_post(
    request: Request,
    session: CurrentSession,
    _user=Depends(require_login),
    username: Annotated[str, Form()] = "",
    email: Annotated[str, Form()] = "",
    picture: Annotated[UploadFile, File()] = None,
):
    await validate_csrf(request)
    current_user = request.state.current_user

    errors = await _validate_account(session, current_user, username, email)
    if errors:
        return render_template(
            "account.html",
            {
                "request": request,
                "title": "Account",
                "image_file": f"/static/profile_pics/{current_user.image_file}",
                "form": _build_account_form_context(
                    username, email, picture and picture.filename or "", errors
                ),
            },
            status_code=200,
        )

    if picture and picture.filename:
        picture_file = await _save_picture(picture)
        current_user.image_file = picture_file

    current_user.username = username.strip()
    current_user.email = email.strip()
    await session.commit()

    flash(request, "Your account has been updated!", "success")
    return RedirectResponse("/account", status_code=307)


async def _validate_account(
    session: CurrentSession,
    current_user: BlogUser,
    username: str,
    email: str,
) -> dict[str, list[str]]:
    errors: dict[str, list[str]] = {}
    username = username.strip()
    email = email.strip()

    if not username:
        errors.setdefault("username", []).append("This field is required.")
    elif len(username) < 2 or len(username) > 20:
        errors.setdefault("username", []).append("Field must be between 2 and 20 characters long.")

    if not email:
        errors.setdefault("email", []).append("This field is required.")
    elif not _is_valid_email(email):
        errors.setdefault("email", []).append(_ERROR_INVALID_EMAIL)

    if username != current_user.username and await _username_exists(session, username):
        errors.setdefault("username", []).append(_ERROR_USERNAME_TAKEN)

    if email != current_user.email and await _email_exists(session, email):
        errors.setdefault("email", []).append(_ERROR_EMAIL_TAKEN)

    return errors


def _build_account_form_context(
    username: str = "",
    email: str = "",
    picture: str = "",
    errors: dict[str, list[str]] | None = None,
) -> dict:
    errors = errors or {}
    return {
        "username": _build_field_context(
            "username", "Username", username, errors=errors.get("username", [])
        ),
        "email": _build_field_context(
            "email", "Email", email, "email", errors=errors.get("email", [])
        ),
        "picture": {
            "name": "picture",
            "id": "picture",
            "type": "file",
            "label": "Update Profile Picture",
            "value": picture,
            "errors": errors.get("picture", []),
        },
    }


# ==============================================================================
# ++++++++++++++++++++++++++++++ save picture ++++++++++++++++++++++++++++++++++
# ------------------------------------------------------------------------------
async def _save_picture(form_picture: UploadFile) -> str:
    random_hex = secrets.token_hex(8)
    _, f_ext = os.path.splitext(form_picture.filename or "")
    f_ext = f_ext.lower()
    if f_ext not in {".jpg", ".jpeg", ".png"}:
        f_ext = ".jpg"
    picture_fn = random_hex + f_ext

    profile_pics_dir = os.path.join(os.path.dirname(__file__), "..", "static", "profile_pics")
    profile_pics_dir = os.path.abspath(profile_pics_dir)
    os.makedirs(profile_pics_dir, exist_ok=True)
    picture_path = os.path.join(profile_pics_dir, picture_fn)

    output_size = (125, 125)
    content = await form_picture.read()
    i = Image.open(io.BytesIO(content))
    i.thumbnail(output_size)
    i.save(picture_path)

    return picture_fn
