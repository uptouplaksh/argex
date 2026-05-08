import smtplib
from email.message import EmailMessage

from fastapi import HTTPException

from backend.app.core.config import SMTP_EMAIL, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USE_TLS


def _is_placeholder(value: str | None) -> bool:
    return not value or value.startswith("your_")


def ensure_email_delivery_configured() -> None:
    if _is_placeholder(SMTP_EMAIL) or _is_placeholder(SMTP_PASSWORD):
        raise HTTPException(
            status_code=503,
            detail="OTP email service is not configured. Set SMTP_EMAIL and SMTP_PASSWORD with a Gmail App Password.",
        )


def build_otp_email_html(code: str, expires_in_minutes: int, purpose: str) -> str:
    action = "complete your registration" if purpose == "registration" else "complete your sign in"
    return f"""\
<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #e2e8f0;">
                <div style="font-size:22px;font-weight:800;letter-spacing:0;color:#4f46e5;">Argex</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f172a;">Verify your account</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">
                  Use this 6-digit code to {action}. This code expires in {expires_in_minutes} minutes.
                </p>
                <div style="margin:24px 0;padding:18px 20px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;text-align:center;">
                  <div style="font-size:13px;font-weight:700;color:#4338ca;text-transform:uppercase;">Your Argex verification code is</div>
                  <div style="margin-top:8px;font-size:34px;line-height:1;font-weight:800;letter-spacing:6px;color:#111827;">{code}</div>
                </div>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                  If you did not request this code, you can ignore this email. Never share this code with anyone.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def send_otp_email(to_email: str, code: str, expires_in_minutes: int, purpose: str) -> None:
    ensure_email_delivery_configured()

    action = "complete your registration" if purpose == "registration" else "complete your sign in"
    message = EmailMessage()
    message["From"] = f"Argex <{SMTP_EMAIL}>"
    message["To"] = to_email
    message["Subject"] = "Your Argex verification code"
    message.set_content(
        f"Your Argex verification code is: {code}\n\n"
        f"Use this 6-digit code to {action}. It expires in {expires_in_minutes} minutes.\n\n"
        "If you did not request this code, you can ignore this email."
    )
    message.add_alternative(build_otp_email_html(code, expires_in_minutes, purpose), subtype="html")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
            if SMTP_USE_TLS:
                smtp.starttls()
            smtp.login(SMTP_EMAIL, SMTP_PASSWORD)
            smtp.send_message(message)
    except smtplib.SMTPAuthenticationError as exc:
        raise HTTPException(status_code=502, detail="Gmail SMTP authentication failed. Use a Gmail App Password.") from exc
    except (smtplib.SMTPException, OSError) as exc:
        raise HTTPException(status_code=502, detail="Could not send OTP email") from exc
