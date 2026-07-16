import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
        self.use_tls = settings.SMTP_USE_TLS

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None = None,
    ) -> bool:
        if not self.host:
            logger.warning("SMTP not configured, email not sent")
            return False

        try:
            message = MIMEMultipart("alternative")
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            message["Subject"] = subject

            if text_content:
                message.attach(MIMEText(text_content, "plain"))
            
            message.attach(MIMEText(html_content, "html"))

            await aiosmtplib.send(
                message,
                hostname=self.host,
                port=self.port,
                username=self.user,
                password=self.password,
                use_tls=self.use_tls,
            )
            
            logger.info(f"Email sent to {to_email}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    async def send_verification_email(self, to_email: str, token: str, base_url: str) -> bool:
        verify_url = f"{base_url}/verify-email?token={token}"
        
        subject = "Verify your email address"
        html_content = f"""
        <html>
        <body>
            <h2>Welcome to AI Data Analytics</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <p><a href="{verify_url}">Verify Email</a></p>
            <p>This link will expire in 48 hours.</p>
            <p>If you did not create an account, please ignore this email.</p>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_content)

    async def send_password_reset_email(self, to_email: str, token: str, base_url: str) -> bool:
        reset_url = f"{base_url}/reset-password?token={token}"
        
        subject = "Reset your password"
        html_content = f"""
        <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <p><a href="{reset_url}">Reset Password</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_content)

    async def send_invitation_email(
        self, to_email: str, tenant_name: str, token: str, base_url: str
    ) -> bool:
        invite_url = f"{base_url}/accept-invitation?token={token}"
        
        subject = f"You've been invited to {tenant_name}"
        html_content = f"""
        <html>
        <body>
            <h2>You've Been Invited</h2>
            <p>You've been invited to join <strong>{tenant_name}</strong> on AI Data Analytics.</p>
            <p>Click the link below to accept the invitation:</p>
            <p><a href="{invite_url}">Accept Invitation</a></p>
            <p>This link will expire in 7 days.</p>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_content)


email_service = EmailService()
