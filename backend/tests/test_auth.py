import pytest
from app.core.security.auth import (
    create_reset_token,
    create_verification_token,
    hash_password,
    verify_password,
)
from app.models.role import Role
from app.models.tenant import Tenant
from app.models.user import User
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class TestRegistration:
    async def test_register_success(self, client: AsyncClient, db: AsyncSession):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "StrongPass1!",
                "first_name": "New",
                "last_name": "User",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["first_name"] == "New"
        assert data["is_verified"] is False

    async def test_register_duplicate_email(self, client: AsyncClient, test_user: User):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": test_user.email,
                "password": "StrongPass1!",
            },
        )
        assert response.status_code == 409
        assert "already registered" in response.text.lower()

    async def test_register_weak_password(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak@example.com",
                "password": "short",
            },
        )
        assert response.status_code == 400
        assert "password" in response.text.lower()


class TestLogin:
    async def test_login_success(self, client: AsyncClient, test_user: User, db: AsyncSession):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "TestPass123!",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client: AsyncClient, test_user: User):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "WrongPassword1!",
            },
        )
        assert response.status_code == 401

    async def test_login_inactive_user(self, client: AsyncClient, db: AsyncSession):
        user = User(
            email="inactive@example.com",
            hashed_password=hash_password("TestPass123!"),
            is_active=False,
        )
        db.add(user)
        await db.flush()
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "inactive@example.com",
                "password": "TestPass123!",
            },
        )
        assert response.status_code == 401


class TestTokenRefresh:
    async def test_refresh_success(self, client: AsyncClient, test_user: User):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "TestPass123!",
            },
        )
        refresh_token = login_resp.json()["refresh_token"]

        response = await client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": refresh_token,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_refresh_invalid_token(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": "invalidtoken123",
            },
        )
        assert response.status_code == 401


class TestProfile:
    async def test_get_me(self, client: AsyncClient, auth_headers: dict[str, str], test_user: User):
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["email"] == test_user.email

    async def test_get_me_unauthorized(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    async def test_update_profile(self, client: AsyncClient, auth_headers: dict[str, str]):
        response = await client.patch(
            "/api/v1/auth/me",
            json={
                "first_name": "Updated",
                "last_name": "Name",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Name"

    async def test_change_password(self, client: AsyncClient, auth_headers: dict[str, str], db: AsyncSession):
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "TestPass123!",
                "new_password": "NewStrongPass1!",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        db.expire_all()
        result = await db.execute(select(User).where(User.email == "test@example.com"))
        user = result.scalar_one()
        assert verify_password("NewStrongPass1!", user.hashed_password)  # type: ignore[arg-type]

    async def test_change_password_wrong_current(self, client: AsyncClient, auth_headers: dict[str, str]):
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "WrongPass1!",
                "new_password": "NewStrongPass1!",
            },
            headers=auth_headers,
        )
        assert response.status_code == 401


class TestEmailVerification:
    async def test_verify_email(self, client: AsyncClient, db: AsyncSession):
        user = User(
            email="unverified@example.com",
            hashed_password=hash_password("TestPass123!"),
            is_verified=False,
        )
        db.add(user)
        await db.flush()

        token = create_verification_token("unverified@example.com")
        response = await client.post("/api/v1/auth/verify-email", json={"token": token})
        assert response.status_code == 200
        db.expire_all()
        result = await db.execute(select(User).where(User.email == "unverified@example.com"))
        assert result.scalar_one().is_verified is True

    async def test_verify_email_invalid_token(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/verify-email", json={"token": "badtoken"})
        assert response.status_code == 400

    async def test_verify_email_already_verified(self, client: AsyncClient, test_user: User):
        token = create_verification_token(test_user.email)  # type: ignore[arg-type]
        response = await client.post("/api/v1/auth/verify-email", json={"token": token})
        assert response.status_code == 400

    async def test_resend_verification(self, client: AsyncClient, test_user: User):
        response = await client.post(
            "/api/v1/auth/resend-verification",
            json={
                "email": test_user.email,
            },
        )
        assert response.status_code == 200


class TestPasswordReset:
    async def test_forgot_password(self, client: AsyncClient, test_user: User):
        response = await client.post(
            "/api/v1/auth/forgot-password",
            json={
                "email": test_user.email,
            },
        )
        assert response.status_code == 200

    async def test_reset_password(self, client: AsyncClient, db: AsyncSession):
        user = User(
            email="resetme@example.com",
            hashed_password=hash_password("TestPass123!"),
        )
        db.add(user)
        await db.flush()

        token = create_reset_token("resetme@example.com")
        response = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": token,
                "new_password": "NewResetPass1!",
            },
        )
        assert response.status_code == 200
        db.expire_all()
        result = await db.execute(select(User).where(User.email == "resetme@example.com"))
        assert verify_password("NewResetPass1!", result.scalar_one().hashed_password)  # type: ignore[arg-type]

    async def test_reset_password_invalid_token(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": "badtoken",
                "new_password": "NewResetPass1!",
            },
        )
        assert response.status_code == 400


class TestRBAC:
    async def test_list_roles(self, client: AsyncClient, db: AsyncSession, default_roles: list[Role]):
        response = await client.get("/api/v1/roles")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3
        names = [r["name"] for r in data]
        assert "admin" in names
        assert "analyst" in names
        assert "viewer" in names

    async def test_create_role_admin(
        self, client: AsyncClient, db: AsyncSession, default_roles: list[Role]
    ):
        admin_user = User(
            email="admin@example.com",
            hashed_password=hash_password("TestPass123!"),
            is_superuser=True,
        )
        db.add(admin_user)
        await db.flush()

        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@example.com",
                "password": "TestPass123!",
            },
        )
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            "/api/v1/roles",
            json={
                "name": "custom_role",
                "description": "Custom role",
                "permissions": ["dataset:read"],
            },
            headers=headers,
        )
        assert response.status_code == 201
        assert response.json()["name"] == "custom_role"

    async def test_create_role_non_admin(
        self, client: AsyncClient, db: AsyncSession, auth_headers: dict[str, str]
    ):
        response = await client.post(
            "/api/v1/roles",
            json={
                "name": "custom_role",
                "permissions": [],
            },
            headers=auth_headers,
        )
        assert response.status_code == 403


class TestTenant:
    async def test_create_tenant(
        self, client: AsyncClient, auth_headers: dict[str, str], default_roles: list[Role]
    ):
        response = await client.post(
            "/api/v1/tenants",
            json={
                "name": "My Company",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "My Company"
        assert data["id"] is not None

    async def test_create_tenant_sets_admin_role(
        self,
        client: AsyncClient,
        auth_headers: dict[str, str],
        test_user: User,
        default_roles: list[Role],
        db: AsyncSession,
    ):
        await client.post("/api/v1/tenants", json={"name": "Test Co"}, headers=auth_headers)
        db.expire_all()
        await db.refresh(test_user)
        assert test_user.tenant_id is not None
        assert test_user.role_id is not None

    async def test_invite_and_accept(
        self,
        client: AsyncClient,
        auth_headers: dict[str, str],
        test_user: User,
        default_roles: list[Role],
        db: AsyncSession,
    ):
        await client.post("/api/v1/tenants", json={"name": "Invite Co"}, headers=auth_headers)
        await db.refresh(test_user)

        invite_resp = await client.post(
            "/api/v1/tenants/invitations",
            json={
                "email": "invited@example.com",
            },
            headers=auth_headers,
        )
        assert invite_resp.status_code == 201
        invite_data = invite_resp.json()
        assert invite_data["email"] == "invited@example.com"
        assert invite_data["is_accepted"] is False

        token = invite_data["token"]
        accept_resp = await client.post(
            "/api/v1/tenants/accept-invitation",
            json={
                "token": token,
                "password": "AcceptPass1!",
                "first_name": "Invited",
                "last_name": "User",
            },
        )
        assert accept_resp.status_code == 200
        assert accept_resp.json()["email"] == "invited@example.com"
        assert accept_resp.json()["tenant_id"] == str(test_user.tenant_id)

    async def test_list_members(
        self, client: AsyncClient, auth_headers: dict[str, str], test_user: User, test_tenant: Tenant
    ):
        response = await client.get("/api/v1/tenants/members", headers=auth_headers)
        assert response.status_code == 200
        members = response.json()
        assert len(members) == 1
        assert members[0]["email"] == test_user.email

    async def test_list_invitations(
        self, client: AsyncClient, auth_headers: dict[str, str], test_user: User, test_tenant: Tenant
    ):
        invite_resp = await client.post(
            "/api/v1/tenants/invitations",
            json={
                "email": "pending@example.com",
            },
            headers=auth_headers,
        )
        assert invite_resp.status_code == 201

        list_resp = await client.get("/api/v1/tenants/invitations", headers=auth_headers)
        assert list_resp.status_code == 200
        assert len(list_resp.json()) == 1

    async def test_revoke_invitation(
        self, client: AsyncClient, auth_headers: dict[str, str], test_user: User, test_tenant: Tenant
    ):
        invite_resp = await client.post(
            "/api/v1/tenants/invitations",
            json={
                "email": "revoke@example.com",
            },
            headers=auth_headers,
        )
        invite_id = invite_resp.json()["id"]

        revoke_resp = await client.delete(
            f"/api/v1/tenants/invitations/{invite_id}", headers=auth_headers
        )
        assert revoke_resp.status_code == 200

        list_resp = await client.get("/api/v1/tenants/invitations", headers=auth_headers)
        assert len(list_resp.json()) == 0


class TestLogout:
    async def test_logout(self, client: AsyncClient, auth_headers: dict[str, str]):
        response = await client.post("/api/v1/auth/logout", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["message"] == "Logged out successfully"


class TestOIDC:
    @pytest.fixture(autouse=True)
    def mock_oidc_settings(self, monkeypatch: pytest.MonkeyPatch):
        from app.core.config import settings

        monkeypatch.setattr(settings, "AUTH_MODE", "oidc")
        monkeypatch.setattr(settings, "OIDC_AUTO_PROVISION_USERS", True)
        monkeypatch.setattr(settings, "OIDC_DEFAULT_ROLE", "viewer")
        monkeypatch.setattr(settings, "OIDC_ROLES_CLAIM", "roles")
        monkeypatch.setattr(
            settings,
            "OIDC_ROLE_MAPPING",
            {"admin": "admin", "analyst": "analyst", "user": "viewer"},
        )

    @pytest.fixture(autouse=True)
    def mock_decode_oidc_token(self, monkeypatch: pytest.MonkeyPatch):
        async def fake_decode_oidc_token(token: str):
            if token == "valid-oidc-token":
                return {
                    "sub": "oidc|12345",
                    "email": "oidc_user@example.com",
                    "email_verified": True,
                    "given_name": "OIDC",
                    "family_name": "User",
                    "roles": ["admin"],
                }
            if token == "existing-oidc-token":
                return {
                    "sub": "oidc|existing",
                    "email": "test@example.com",
                    "email_verified": True,
                }
            if token == "inactive-oidc-token":
                return {
                    "sub": "oidc|inactive",
                    "email": "inactive@example.com",
                    "email_verified": True,
                }
            if token == "analyst-oidc-token":
                return {
                    "sub": "oidc|analyst",
                    "email": "analyst@example.com",
                    "email_verified": True,
                    "roles": ["analyst"],
                }
            if token == "no-roles-oidc-token":
                return {
                    "sub": "oidc|noroles",
                    "email": "noroles@example.com",
                    "email_verified": True,
                }
            return None

        monkeypatch.setattr("app.services.oidc_service.decode_oidc_token", fake_decode_oidc_token)

    async def _create_inactive_user(self, db: AsyncSession):
        user = User(
            email="inactive@example.com",
            hashed_password=hash_password("dummy"),
            first_name="Inactive",
            last_name="User",
            is_verified=True,
            is_active=False,
        )
        db.add(user)
        await db.flush()
        return user

    async def test_oidc_login_new_user(
        self, client: AsyncClient, db: AsyncSession, default_roles: list[Role]
    ):
        response = await client.post(
            "/api/v1/auth/oidc/login", json={"id_token": "valid-oidc-token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

        result = await db.execute(select(User).where(User.email == "oidc_user@example.com"))
        user = result.scalar_one_or_none()
        assert user is not None
        assert str(user.first_name) == "OIDC"
        assert str(user.last_name) == "User"
        assert user.is_verified is True

        admin_role = next(r for r in default_roles if str(r.name) == "admin")
        assert str(user.role_id) == str(admin_role.id)

    async def test_oidc_login_existing_user(
        self, client: AsyncClient, test_user: User, db: AsyncSession
    ):
        response = await client.post(
            "/api/v1/auth/oidc/login", json={"id_token": "existing-oidc-token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

        refreshed_user = await db.get(User, test_user.id)
        assert refreshed_user is not None
        assert refreshed_user.is_verified is True

    async def test_oidc_login_invalid_token(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/oidc/login", json={"id_token": "bad-token"})
        assert response.status_code == 401
        assert "Invalid" in response.json()["error"]

    async def test_oidc_login_inactive_user(self, client: AsyncClient, db: AsyncSession):
        await self._create_inactive_user(db)
        response = await client.post(
            "/api/v1/auth/oidc/login", json={"id_token": "inactive-oidc-token"}
        )
        assert response.status_code == 401
        assert "inactive" in response.json()["error"].lower()

    async def test_oidc_login_role_mapping(
        self, client: AsyncClient, db: AsyncSession, default_roles: list[Role]
    ):
        response = await client.post(
            "/api/v1/auth/oidc/login", json={"id_token": "analyst-oidc-token"}
        )
        assert response.status_code == 200
        result = await db.execute(select(User).where(User.email == "analyst@example.com"))
        user = result.scalar_one_or_none()
        assert user is not None
        analyst_role = next(r for r in default_roles if str(r.name) == "analyst")
        assert str(user.role_id) == str(analyst_role.id)

    async def test_oidc_login_default_role(
        self, client: AsyncClient, db: AsyncSession, default_roles: list[Role]
    ):
        response = await client.post(
            "/api/v1/auth/oidc/login", json={"id_token": "no-roles-oidc-token"}
        )
        assert response.status_code == 200
        result = await db.execute(select(User).where(User.email == "noroles@example.com"))
        user = result.scalar_one_or_none()
        assert user is not None
        viewer_role = next(r for r in default_roles if str(r.name) == "viewer")
        assert str(user.role_id) == str(viewer_role.id)

    async def test_oidc_config(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/oidc/config")
        assert response.status_code == 200
        data = response.json()
        assert "issuer" in data
        assert "client_id" in data
        assert "scopes" in data
        assert "audience" in data
        assert "auth_mode" in data

    async def test_oidc_login_blocked_in_local_mode(
        self, client: AsyncClient, monkeypatch: pytest.MonkeyPatch
    ):
        from app.core.config import settings

        monkeypatch.setattr(settings, "AUTH_MODE", "local")
        response = await client.post(
            "/api/v1/auth/oidc/login", json={"id_token": "valid-oidc-token"}
        )
        assert response.status_code == 403
        assert "AUTH_MODE=oidc" in response.json()["error"]

    async def test_local_login_blocked_in_oidc_mode(self, client: AsyncClient, test_user: User):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPass123!",
            },
        )
        assert response.status_code == 403
        assert "AUTH_MODE=local" in response.json()["error"]
