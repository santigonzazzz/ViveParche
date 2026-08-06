"""
Email service for Parché using Gmail SMTP.
"""

import os
import smtplib
from email.message import EmailMessage
from typing import Optional
from concurrent.futures import ThreadPoolExecutor
import asyncio
from app.config import settings

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SMTP_HOST: str = settings.smtp_host
SMTP_PORT: int = settings.smtp_port
SMTP_USER: Optional[str] = settings.smtp_user
SMTP_PASS: Optional[str] = settings.smtp_pass
FROM_EMAIL: str = settings.smtp_user or "noreply@parche.ai"
APP_NAME: str = settings.app_name

# For non-blocking SMTP calls in FastAPI
executor = ThreadPoolExecutor(max_workers=3)

# ---------------------------------------------------------------------------
# HTML email templates
# ---------------------------------------------------------------------------

def _otp_html(code: str, purpose: str, expiry_minutes: int = 15) -> str:
    """Shared HTML template for OTP emails."""
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050508;font-family:'Helvetica Neue',Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050508;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" 
             style="background:linear-gradient(145deg,#0d0d14,#111118);
                    border:1px solid rgba(255,255,255,0.08); 
                    border-radius:28px;overflow:hidden;">
        
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#8b5cf6,#6d28d9); 
                        padding:36px 40px;text-align:center;">
          <h1 style="margin:0;font-size:28px;font-weight:900;
                     letter-spacing:-0.02em;color:#fff;">
            {APP_NAME} 🎉
          </h1>
          <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.75);">
            {purpose}
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="margin:0 0 24px;font-size:16px;color:rgba(255,255,255,0.7);line-height:1.6;">
            Usa el siguiente código. Es válido por <strong style="color:#fff;">{expiry_minutes} minutos</strong>
            y solo tiene <strong style="color:#fff;">3 intentos</strong>.
          </p>

          <!-- Code box -->
          <div style="background:rgba(139,92,246,0.12);border:2px solid rgba(139,92,246,0.4);
                      border-radius:20px;padding:28px;text-align:center;margin:24px 0;">
            <span style="font-size:48px;font-weight:900;letter-spacing:12px;color:#a78bfa;">
              {code}
            </span>
          </div>

          <p style="margin:24px 0 0;font-size:13px;color:rgba(255,255,255,0.35);line-height:1.6;">
            Si no solicitaste este código, ignora este correo.
            Nunca compartas este código con nadie.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.05);
                        text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.2);">
            © 2025 {APP_NAME}. Todos los derechos reservados.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

# ---------------------------------------------------------------------------
# Public send functions
# ---------------------------------------------------------------------------

async def send_verification_email(to_email: str, code: str) -> bool:
    subject = f"[{APP_NAME}] Código de verificación: {code}"
    html = _otp_html(code=code, purpose="Verificación de cuenta")
    return await _send_email_async(to_email, subject, html)

async def send_forgot_password_email(to_email: str, code: str) -> bool:
    subject = f"[{APP_NAME}] Recupera tu contraseña: {code}"
    html = _otp_html(code=code, purpose="Recuperación de contraseña", expiry_minutes=5)
    return await _send_email_async(to_email, subject, html)


async def send_subscription_approved_email(
    to_email: str,
    owner_name: str,
    venue_name: str,
    plan_name: str,
    expiry_date: str,
    dashboard_url: str = "https://viveparche.cloud/business"
) -> bool:
    """Email to venue owner when their payment proof is approved."""
    subject = f"[{APP_NAME}] ¡Tu plan {plan_name} está activo! 🎉"
    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050508;font-family:'Helvetica Neue',Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050508;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:linear-gradient(145deg,#0d0d14,#111118);
                    border:1px solid rgba(255,255,255,0.08);
                    border-radius:28px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#22c55e,#16a34a);
                        padding:36px 40px;text-align:center;">
          <h1 style="margin:0;font-size:32px;font-weight:900;color:#fff;">
            ✅ ¡Pago Aprobado!
          </h1>
          <p style="margin:8px 0 0;font-size:15px;color:rgba(255,255,255,0.85);">
            Tu suscripción a <strong>{APP_NAME}</strong> está activa
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="margin:0 0 20px;font-size:16px;color:rgba(255,255,255,0.8);line-height:1.7;">
            Hola <strong style="color:#fff;">{owner_name}</strong>,
          </p>
          <p style="margin:0 0 28px;font-size:16px;color:rgba(255,255,255,0.65);line-height:1.7;">
            Verificamos tu comprobante de pago para <strong style="color:#fff;">{venue_name}</strong>.
            Tu plan ya está activo y puedes disfrutar todas las herramientas.
          </p>

          <!-- Plan summary card -->
          <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);
                      border-radius:20px;padding:24px;margin-bottom:28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);font-weight:700;
                            text-transform:uppercase;letter-spacing:0.05em;">Plan activo</td>
                <td style="padding:8px 0;font-size:15px;color:#22c55e;font-weight:800;
                            text-align:right;">{plan_name}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);font-weight:700;
                            text-transform:uppercase;letter-spacing:0.05em;">Local</td>
                <td style="padding:8px 0;font-size:15px;color:#fff;font-weight:700;
                            text-align:right;">{venue_name}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);font-weight:700;
                            text-transform:uppercase;letter-spacing:0.05em;">Válido hasta</td>
                <td style="padding:8px 0;font-size:15px;color:#fff;font-weight:700;
                            text-align:right;">{expiry_date}</td>
              </tr>
            </table>
          </div>

          <!-- CTA -->
          <div style="text-align:center;">
            <a href="{dashboard_url}"
               style="display:inline-block;padding:16px 40px;
                      background:linear-gradient(135deg,#22c55e,#16a34a);
                      color:#fff;font-weight:900;font-size:15px;
                      text-decoration:none;border-radius:100px;
                      box-shadow:0 0 30px rgba(34,197,94,0.35);">
              Ir a mi Dashboard →
            </a>
          </div>

          <p style="margin:32px 0 0;font-size:13px;color:rgba(255,255,255,0.3);line-height:1.6;">
            Recuerda renovar antes de la fecha de vencimiento para no perder el acceso.
            ¿Preguntas? Escríbenos en la plataforma.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.2);">© 2025 {APP_NAME}. Todos los derechos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return await _send_email_async(to_email, subject, html)


async def send_subscription_rejected_email(
    to_email: str,
    owner_name: str,
    venue_name: str,
    retry_count: int,
    max_retries: int = 3,
    support_url: str = "https://viveparche.cloud/business/subscription"
) -> bool:
    """Email to venue owner when their payment proof is rejected."""
    subject = f"[{APP_NAME}] Hubo un problema con tu comprobante de pago"
    retries_left = max(0, max_retries - retry_count)
    retries_text = (
        f"Te quedan <strong style='color:#ef4444;'>{retries_left} intento(s)</strong> más."
        if retries_left > 0
        else "<strong style='color:#ef4444;'>Has alcanzado el límite de intentos.</strong> Contáctanos para reactivar tu cuenta."
    )
    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050508;font-family:'Helvetica Neue',Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050508;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:linear-gradient(145deg,#0d0d14,#111118);
                    border:1px solid rgba(255,255,255,0.08);
                    border-radius:28px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#ef4444,#dc2626);
                        padding:36px 40px;text-align:center;">
          <h1 style="margin:0;font-size:32px;font-weight:900;color:#fff;">❌ Pago Rechazado</h1>
          <p style="margin:8px 0 0;font-size:15px;color:rgba(255,255,255,0.85);">Necesitamos que vuelvas a intentarlo</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="margin:0 0 20px;font-size:16px;color:rgba(255,255,255,0.8);line-height:1.7;">
            Hola <strong style="color:#fff;">{owner_name}</strong>,
          </p>
          <p style="margin:0 0 24px;font-size:16px;color:rgba(255,255,255,0.65);line-height:1.7;">
            No pudimos verificar el comprobante de pago para
            <strong style="color:#fff;">{venue_name}</strong>.
            Puede ser por imagen borrosa, monto incorrecto o transferencia no recibida.
          </p>

          <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);
                      border-radius:16px;padding:20px;margin-bottom:28px;
                      font-size:14px;color:rgba(255,255,255,0.7);line-height:1.6;">
            {retries_text}
          </div>

          <div style="text-align:center;">
            <a href="{support_url}"
               style="display:inline-block;padding:16px 40px;
                      background:linear-gradient(135deg,#8b5cf6,#6d28d9);
                      color:#fff;font-weight:900;font-size:15px;
                      text-decoration:none;border-radius:100px;
                      box-shadow:0 0 30px rgba(139,92,246,0.35);">
              Volver a intentarlo →
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.2);">© 2025 {APP_NAME}. Todos los derechos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return await _send_email_async(to_email, subject, html)


async def send_subscription_expired_email(
    to_email: str,
    owner_name: str,
    venue_name: str,
    renewal_url: str = "https://viveparche.cloud/business/subscription"
) -> bool:
    """Email to venue owner when their subscription expires automatically."""
    subject = f"[{APP_NAME}] Tu plan ha vencido — Renueva para mantener el acceso"
    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050508;font-family:'Helvetica Neue',Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050508;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:linear-gradient(145deg,#0d0d14,#111118);
                    border:1px solid rgba(255,255,255,0.08);
                    border-radius:28px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);
                        padding:36px 40px;text-align:center;">
          <h1 style="margin:0;font-size:32px;font-weight:900;color:#fff;">⚠️ Plan Vencido</h1>
          <p style="margin:8px 0 0;font-size:15px;color:rgba(255,255,255,0.85);">Tu suscripción en {APP_NAME} ha expirado</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="margin:0 0 20px;font-size:16px;color:rgba(255,255,255,0.8);line-height:1.7;">
            Hola <strong style="color:#fff;">{owner_name}</strong>,
          </p>
          <p style="margin:0 0 28px;font-size:16px;color:rgba(255,255,255,0.65);line-height:1.7;">
            El plan de <strong style="color:#fff;">{venue_name}</strong> ha vencido.
            Tu perfil ahora está en modo <strong style="color:#f59e0b;">Vitrina (gratuito)</strong>.
            Renueva para recuperar el acceso completo al dashboard, eventos y herramientas.
          </p>

          <div style="text-align:center;">
            <a href="{renewal_url}"
               style="display:inline-block;padding:16px 40px;
                      background:linear-gradient(135deg,#f59e0b,#d97706);
                      color:#fff;font-weight:900;font-size:15px;
                      text-decoration:none;border-radius:100px;
                      box-shadow:0 0 30px rgba(245,158,11,0.35);">
              Renovar mi plan →
            </a>
          </div>

          <p style="margin:32px 0 0;font-size:13px;color:rgba(255,255,255,0.3);line-height:1.6;">
            Si ya realizaste el pago de renovación, envía el comprobante desde el mismo enlace.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.2);">© 2025 {APP_NAME}. Todos los derechos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return await _send_email_async(to_email, subject, html)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _send_sync(to_email: str, subject: str, html: str) -> bool:
    """Synchronous send using smtplib."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"\n[EMAIL - DEV] To: {to_email}, Subject: {subject}")
        print("⚠️ No SMTP credentials set in .env")
        return False

    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"{APP_NAME} <{FROM_EMAIL}>"
        msg["To"] = to_email
        msg.set_content("Usa una aplicación compatible con HTML para ver este mensaje.")
        msg.add_alternative(html, subtype="html")

        print(f"[EMAIL] Attempting to send to {to_email} via {SMTP_HOST}:{SMTP_PORT} as {SMTP_USER}...")
        # Use SSL for port 465
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        
        print(f"[EMAIL] ✅ Successfully sent to {to_email}")
        return True
    except smtplib.SMTPAuthenticationError:
        print(f"[EMAIL] ❌ Auth Error: Check SMTP_USER and SMTP_PASS for {SMTP_USER}")
        return False
    except Exception as e:
        print(f"[EMAIL] ❌ General Error sending to {to_email}: {type(e).__name__}: {e}")
        return False

async def _send_email_async(to_email: str, subject: str, html: str) -> bool:
    """Run sync send in a thread to keep the event loop moving."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(executor, _send_sync, to_email, subject, html)

