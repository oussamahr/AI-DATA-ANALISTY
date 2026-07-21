from fastapi import APIRouter, Depends, Request, Response

from app.core.config import settings
from app.core.dependencies import get_current_user, require_auth_mode
from app.core.security.audit import audit_logger
from app.core.security.csrf import set_csrf_cookie_headers
from app.core.security.rate_limit import rate_limit_dependency
from app.core.security.session import get_session_store
from app.core.security.validators import validate_no_html, validate_no_sql_injection
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordRequest,
    MessageResponse,
    OIDCLoginRequest,
    OIDCProviderConfig,
    PasswordChange,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenRefresh,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    VerifyEmailRequest,
)
from app.services.auth_service import AuthService
from app.services.oidc_service import OIDCService

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    data: UserCreate,
    request: Request,
    auth_service: AuthService = Depends(),
    _: bool = Depends(require_auth_mode("local")),
):
    if data.first_name:
        validate_no_sql_injection(data.first_name)
        validate_no_html(data.first_name)
    if data.last_name:
        validate_no_sql_injection(data.last_name)
        validate_no_html(data.last_name)
    user = await auth_service.register(data)
    await audit_logger.create("user", str(user.id), str(user.id), request=request)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(),
    _: bool = Depends(require_auth_mode("local")),
):
    await rate_limit_dependency("5/minute", "auth_login", request)
    access_token, refresh_token, user = await auth_service.login(data.email, data.password)
    csrf_token: str | None = None
    
    # Set httpOnly cookies for tokens (secure, cannot be read by JavaScript)
    response.set_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=not settings.is_development(),
        samesite="strict",
        path="/",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=not settings.is_development(),
        samesite="strict",
        path="/",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )
    
    if settings.SESSION_COOKIE_ENABLED:
        session = await get_session_store().create_session(str(user.id))
        response.set_cookie(
            key=settings.SESSION_COOKIE_NAME,
            value=session.session_id,
            httponly=True,
            secure=not settings.is_development(),
            samesite="strict",
            path="/",
        )
        set_csrf_cookie_headers(response, session.csrf_token)
        csrf_token = session.csrf_token
    
    await audit_logger.login(str(user.id), success=True, request=request)
    # Return empty TokenResponse (tokens are now in httpOnly cookies)
    return TokenResponse(
        access_token="", refresh_token="", csrf_token=csrf_token
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(),
):
    # Read refresh_token from httpOnly cookie (set by previous login/refresh)
    refresh_token = request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not found")
    
    access_token, new_refresh_token = await auth_service.refresh_token(refresh_token)
    
    # Set new httpOnly cookies for refreshed tokens
    response.set_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=not settings.is_development(),
        samesite="strict",
        path="/",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        value=new_refresh_token,
        httponly=True,
        secure=not settings.is_development(),
        samesite="strict",
        path="/",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )
    
    # Return empty TokenResponse (tokens are now in httpOnly cookies)
    return TokenResponse(access_token="", refresh_token="")


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
):
    # Clear token cookies
    response.delete_cookie(settings.ACCESS_TOKEN_COOKIE_NAME, path="/")
    response.delete_cookie(settings.REFRESH_TOKEN_COOKIE_NAME, path="/")
    
    if settings.SESSION_COOKIE_ENABLED and request is not None and response is not None:
        session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
        if session_id:
            await get_session_store().revoke_session(session_id)
        response.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")
        response.delete_cookie(settings.CSRF_COOKIE_NAME, path="/")
    
    await audit_logger.logout(str(current_user.id), request=request)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(),
):
    if data.first_name:
        validate_no_sql_injection(data.first_name)
        validate_no_html(data.first_name)
    if data.last_name:
        validate_no_sql_injection(data.last_name)
        validate_no_html(data.last_name)
    return await auth_service.update_profile(current_user, data.first_name, data.last_name)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(),
    _: bool = Depends(require_auth_mode("local")),
):
    await auth_service.change_password(current_user, data.current_password, data.new_password)
    return MessageResponse(message="Password changed successfully")


@router.post("/verify-email")
async def verify_email(
    data: VerifyEmailRequest,
    auth_service: AuthService = Depends(),
    _: bool = Depends(require_auth_mode("local")),
):
    await auth_service.verify_email(data.token)
    return MessageResponse(message="Email verified successfully")


@router.post("/resend-verification")
async def resend_verification(
    data: ResendVerificationRequest,
    _: bool = Depends(require_auth_mode("local")),
):
    return MessageResponse(message="If that email exists, a verification link has been sent")


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    auth_service: AuthService = Depends(),
    _: bool = Depends(require_auth_mode("local")),
):
    await auth_service.request_password_reset(data.email)
    return MessageResponse(message="If that email exists, a reset link has been sent")


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    auth_service: AuthService = Depends(),
    _: bool = Depends(require_auth_mode("local")),
):
    await auth_service.reset_password(data.token, data.new_password)
    return MessageResponse(message="Password reset successfully")


@router.post("/oidc/login", response_model=TokenResponse)
async def oidc_login(
    data: OIDCLoginRequest,
    request: Request,
    response: Response,
    oidc_service: OIDCService = Depends(),
    _: bool = Depends(require_auth_mode("oidc")),
):
    access_token, refresh_token, user = await oidc_service.login(data.id_token)
    csrf_token: str | None = None
    if settings.SESSION_COOKIE_ENABLED:
        session = await get_session_store().create_session(str(user.id))
        response.set_cookie(
            key=settings.SESSION_COOKIE_NAME,
            value=session.session_id,
            httponly=True,
            secure=not settings.is_development(),
            samesite="strict",
            path="/",
        )
        set_csrf_cookie_headers(response, session.csrf_token)
        csrf_token = session.csrf_token
    await audit_logger.login(str(user.id), success=True, request=request)
    return TokenResponse(
        access_token=access_token, refresh_token=refresh_token, csrf_token=csrf_token
    )


@router.get("/oidc/config", response_model=OIDCProviderConfig)
async def oidc_config(
    oidc_service: OIDCService = Depends(),
):
    return oidc_service.get_provider_config()
