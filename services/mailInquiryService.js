import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

/**
 * Escapes HTML characters to prevent HTML/XSS injection into emails.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strips carriage returns and newlines to prevent SMTP CRLF header injection.
 */
function sanitizeHeader(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

/**
 * Validates basic email structure to prevent malformed or injection strings.
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

/**
 * MailInquiry Service Integration
 * Configurable via centralized config module.
 * Fallback to console simulation if API keys/SMTP are not yet populated.
 */
class MailInquiryService {
  constructor() {
    this.apiKey = config.mail.apiKey;
    this.adminEmail = config.mail.adminEmail;
    this.fromEmail = config.mail.fromEmail;
    this.smtpHost = config.mail.smtp.host;
    this.smtpPort = config.mail.smtp.port;
    this.smtpUser = config.mail.smtp.user;
    this.smtpPass = config.mail.smtp.pass;

    this.transporter = null;
    if (this.smtpHost && this.smtpUser && this.smtpPass) {
      try {
        this.transporter = nodemailer.createTransport({
          host: this.smtpHost,
          port: Number(this.smtpPort),
          secure: Number(this.smtpPort) === 465,
          auth: {
            user: this.smtpUser,
            pass: this.smtpPass,
          },
          // Harden against SSRF and arbitrary local file reads
          disableFileAccess: true,
          disableUrlAccess: true,
        });
      } catch (err) {
        console.warn('[MailInquiry] Failed to initialize SMTP transporter:', err.message);
      }
    }
  }

  async sendEnquiryNotification(enquiry) {
    const {
      name,
      companyName,
      phone,
      whatsapp,
      email,
      service,
      product,
      material,
      quantity,
      width,
      height,
      thickness,
      requiredDate,
      message,
      uploadedFiles = [],
      _id,
    } = enquiry;

    // Escaped variables for safe HTML interpolation
    const safeName = escapeHtml(name);
    const safeCompany = escapeHtml(companyName);
    const safePhone = escapeHtml(phone);
    const safeWhatsapp = escapeHtml(whatsapp || phone);
    const safeEmail = escapeHtml(email);
    const safeService = escapeHtml(service);
    const safeProduct = escapeHtml(product);
    const safeMaterial = escapeHtml(material);
    const safeQuantity = escapeHtml(quantity);
    const safeWidth = escapeHtml(width);
    const safeHeight = escapeHtml(height);
    const safeThickness = escapeHtml(thickness);
    const safeRequiredDate = escapeHtml(requiredDate);
    const safeMessage = message
      ? escapeHtml(message).replace(/\n/g, '<br>')
      : '<em>No additional message provided.</em>';
    const safeId = escapeHtml(_id);

    // Header-sanitized strings for subject lines and mail headers
    const headerName = sanitizeHeader(name);
    const headerService = sanitizeHeader(service);
    const cleanCustomerEmail = sanitizeHeader(email);

    const filesSummary =
      uploadedFiles.length > 0
        ? uploadedFiles
            .map(
              (f) =>
                `• ${escapeHtml(f.originalName || f.fileName || 'Design File')} (${((f.fileSize || 0) / 1024).toFixed(1)} KB)`
            )
            .join('<br>')
        : 'No files attached';

    const rawWhatsappNumber = (whatsapp || phone || '').replace(/[^0-9]/g, '');
    const whatsappLink = `https://wa.me/91${encodeURIComponent(rawWhatsappNumber)}`;

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #0B0D12; color: #F1F5F9; border-radius: 8px; overflow: hidden; border: 1px solid #282F3E;">
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 24px; color: #000;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">RADHE LASER STUDIO</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 600;">NEW CUSTOMER QUOTE INQUIRY (ID: ${safeId})</p>
        </div>
        
        <div style="padding: 24px; background: #11141A;">
          <h2 style="color: #F59E0B; font-size: 16px; margin-top: 0; border-bottom: 1px solid #282F3E; padding-bottom: 8px;">Customer Information</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #94A3B8; width: 140px;">Customer Name:</td><td style="color: #FFF; font-weight: bold;">${safeName}</td></tr>
            ${safeCompany ? `<tr><td style="padding: 6px 0; color: #94A3B8;">Company:</td><td style="color: #FFF;">${safeCompany}</td></tr>` : ''}
            <tr><td style="padding: 6px 0; color: #94A3B8;">Phone:</td><td><a href="tel:${safePhone}" style="color: #F59E0B; text-decoration: none;">${safePhone}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #94A3B8;">WhatsApp:</td><td><a href="${whatsappLink}" target="_blank" style="color: #25D366; text-decoration: none; font-weight: bold;">Chat on WhatsApp (${safeWhatsapp})</a></td></tr>
            <tr><td style="padding: 6px 0; color: #94A3B8;">Email:</td><td><a href="mailto:${safeEmail}" style="color: #38BDF8; text-decoration: none;">${safeEmail}</a></td></tr>
          </table>

          <h2 style="color: #F59E0B; font-size: 16px; border-bottom: 1px solid #282F3E; padding-bottom: 8px;">Job & Material Specifications</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #94A3B8; width: 140px;">Service:</td><td style="color: #FFF;">${safeService}</td></tr>
            <tr><td style="padding: 6px 0; color: #94A3B8;">Product:</td><td style="color: #FFF;">${safeProduct}</td></tr>
            <tr><td style="padding: 6px 0; color: #94A3B8;">Material:</td><td style="color: #FFF;">${safeMaterial}</td></tr>
            <tr><td style="padding: 6px 0; color: #94A3B8;">Quantity:</td><td style="color: #FFF; font-weight: bold;">${safeQuantity}</td></tr>
            <tr><td style="padding: 6px 0; color: #94A3B8;">Dimensions:</td><td style="color: #FFF;">${safeWidth || '-'} W × ${safeHeight || '-'} H × ${safeThickness || '-'} Thickness</td></tr>
            <tr><td style="padding: 6px 0; color: #94A3B8;">Required Date:</td><td style="color: #FFF;">${safeRequiredDate || 'Flexible / As soon as possible'}</td></tr>
          </table>

          <h2 style="color: #F59E0B; font-size: 16px; border-bottom: 1px solid #282F3E; padding-bottom: 8px;">Customer Notes / Requirements</h2>
          <div style="background: #161A22; padding: 14px; border-radius: 6px; border-left: 4px solid #F59E0B; margin-bottom: 20px; font-size: 14px; line-height: 1.5; color: #CBD5E1;">
            ${safeMessage}
          </div>

          <h2 style="color: #F59E0B; font-size: 16px; border-bottom: 1px solid #282F3E; padding-bottom: 8px;">Uploaded Design Files (${uploadedFiles.length})</h2>
          <div style="background: #161A22; padding: 12px; border-radius: 6px; font-size: 13px; color: #CBD5E1; line-height: 1.6;">
            ${filesSummary}
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #282F3E; text-align: center;">
            <a href="${whatsappLink}" style="display: inline-block; background: #25D366; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; margin-right: 12px;">Reply on WhatsApp</a>
            <a href="mailto:${safeEmail}?subject=Quote%20Request%20-%20Radhe%20Laser%20Studio" style="display: inline-block; background: #282F3E; color: #FFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">Reply via Email</a>
          </div>
        </div>

        <div style="background: #0B0D12; padding: 14px; text-align: center; font-size: 12px; color: #64748B;">
          Radhe Laser Studio • Shop No 1140, Ognaj - Gota Rd, Ahmedabad • +91 7984190368
        </div>
      </div>
    `;

    // Customer Auto-Confirmation Email
    const customerHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1e293b; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: #0f172a; padding: 24px; color: #ffffff; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; color: #f59e0b; letter-spacing: 1px;">RADHE LASER STUDIO</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Precision • Creativity • Customization</p>
        </div>
        <div style="padding: 24px;">
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Thank you, ${safeName}!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            We have received your custom quotation request for <strong>${safeService}</strong> (${safeMaterial}). Our fabrication team in Gota, Ahmedabad will review your dimensions, design, and feasibility.
          </p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px;">Requirement Summary:</p>
            <p style="margin: 4px 0; font-size: 13px; color: #475569;">• Product: ${safeProduct}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #475569;">• Material: ${safeMaterial}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #475569;">• Quantity: ${safeQuantity}</p>
            ${safeWidth || safeHeight ? `<p style="margin: 4px 0; font-size: 13px; color: #475569;">• Size: ${safeWidth || ''} × ${safeHeight || ''} (${safeThickness || ''} thick)</p>` : ''}
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Need an immediate reply or want to share higher resolution vector files? You can reach us directly on WhatsApp:
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://wa.me/917984190368?text=Hello%20Radhe%20Laser%20Studio,%20I%20just%20submitted%20quote%20request%20for%20${encodeURIComponent(name || 'Customer')}" style="background: #25D366; color: #000; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Message Us on WhatsApp (7984190368)</a>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
            <strong>Studio Location:</strong><br>
            SHOP NO - 1140, Radhe Laser Studio, Ognaj - Gota Rd, opposite side of Shell Petrol Pump, Gota, Ahmedabad, Gujarat, India.<br>
            Phone / WhatsApp: +91 7984190368
          </p>
        </div>
      </div>
    `;

    // Attempt delivery via configured Transporter
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Radhe Laser Studio" <${this.fromEmail}>`,
          to: this.adminEmail,
          subject: `🔔 New Quote Request from ${headerName} - ${headerService}`,
          html: adminHtml,
        });

        // Send confirmation to customer if valid email
        if (isValidEmail(cleanCustomerEmail)) {
          await this.transporter.sendMail({
            from: `"Radhe Laser Studio" <${this.fromEmail}>`,
            to: cleanCustomerEmail,
            subject: `We received your inquiry - Radhe Laser Studio`,
            html: customerHtml,
          });
        }
        console.log(`[MailInquiry] Notification emails sent successfully for enquiry ${_id}`);
        return { success: true, method: 'smtp' };
      } catch (err) {
        console.error('[MailInquiry] Delivery error via SMTP:', err.message);
      }
    }

    // Free MailInquiry API endpoint delivery (if configured)
    if (this.apiKey) {
      try {
        const payload = {
          to: this.adminEmail,
          from: this.fromEmail,
          subject: `🔔 New Quote Request from ${headerName} - ${headerService}`,
          html: adminHtml,
        };
        if (isValidEmail(cleanCustomerEmail)) {
          payload.customerConfirmation = {
            to: cleanCustomerEmail,
            html: customerHtml,
          };
        }
        const response = await fetch('https://api.mailinquiry.com/v1/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          console.log(`[MailInquiry] Sent via MailInquiry API for enquiry ${_id}`);
          return { success: true, method: 'mailinquiry-api' };
        }
      } catch (err) {
        console.warn('[MailInquiry] API dispatch attempt failed:', err.message);
      }
    }

    // Graceful Simulated Log
    console.log(`
=============================================================
[MailInquiry Notification Simulated]
To: ${this.adminEmail}
Customer: ${name} (${phone} | ${email})
Service: ${service} | Material: ${material} | Qty: ${quantity}
Files Uploaded: ${uploadedFiles.length}
Note: Add MAILINQUIRY_API_KEY or SMTP credentials in server/.env to enable live email delivery.
=============================================================
    `);
    return { success: true, simulated: true };
  }
}

export const mailInquiryService = new MailInquiryService();
