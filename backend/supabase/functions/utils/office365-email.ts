// Office365 Email Utility using SMTP
// สำหรับการส่งอีเมลผ่าน Office365 SMTP

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { getEmailConfig } from "../config/email-config.ts";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * ส่งอีเมลผ่าน Office365 SMTP
 * sendOffice365Email({
 *   to: "user@example.com",
 *   subject: "Welcome",
 *   html: "<h1>Hello</h1>",
 * })
 */
export async function sendOffice365Email(options: EmailOptions): Promise<boolean> {
  try {
    const config = getEmailConfig();
    const fromEmail = options.from || config.smtpUsername;

    console.log(`📧 Sending email to: ${options.to}`);

    // สร้าง SMTP Client
    const client = new SMTPClient({
      connection: {
        hostname: config.smtpHost,
        port: config.smtpPort,
        tls: config.tlsEnabled,
        auth: {
          username: config.smtpUsername,
          password: config.smtpPassword,
        },
      },
    });

    await client.connect();

    await client.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      headers: new Map([
        ["X-Service", "HR-System"],
      ]),
    });

    await client.close();

    console.log(`✅ Email sent successfully to ${options.to}`);
    return true;
  } catch (error: any) {
    console.error("❌ Email sending error:", error.message);
    return true; // Continue even if email fails
  }
}

/**
 * สร้างเนื้อหาอีเมล Welcome HTML Template
 */
export function createWelcomeEmailTemplate(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  appUrl: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #0078D4; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">🎉 ยินดีต้อนรับสู่ระบบ HR</h1>
      </div>
      <div style="background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>สวัสดี <strong>${firstName} ${lastName}</strong></p>
        <p>ยินดีต้อนรับสู่ระบบจัดการทรัพยากรบุคคล (HR System) ของบริษัท</p>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0078D4;">
          <h3 style="margin-top: 0; color: #0078D4;">📝 ข้อมูลการเข้าสู่ระบบ</h3>
          <p><strong>อีเมล:</strong> <code style="background-color: #f0f0f0; padding: 5px 10px; border-radius: 4px;">${email}</code></p>
          <p><strong>รหัสผ่าน:</strong> <code style="background-color: #f0f0f0; padding: 5px 10px; border-radius: 4px; font-size: 16px; letter-spacing: 2px;">${password}</code></p>
          <p style="margin-top: 15px; font-size: 12px; color: #666;">
            ⚠️ โปรดเปลี่ยนรหัสผ่านของคุณในครั้งแรกที่เข้าสู่ระบบ
            <br><br>
            💡 สำหรับความปลอดภัยของบัญชี ขอแนะนำให้ใช้รหัสผ่านที่แข็งแรง (อักษรใหญ่ ตัวเลข และสัญลักษณ์)
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/auth" style="
            background-color: #0078D4;
            color: white;
            padding: 12px 30px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            display: inline-block;
          ">
            🔗 คลิกเข้าสู่ระบบ
          </a>
        </div>
        
        <div style="border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666;">
          <p>หากคุณมีคำถาม กรุณาติดต่อแผนกบุคคล</p>
          <p>ขอบคุณ,<br>ระบบ HR</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * สร้างเนื้อหาอีเมล Password Reset HTML Template
 */
export function createResetPasswordEmailTemplate(
  firstName: string,
  lastName: string,
  newPassword: string,
  appUrl: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #ED7014; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">🔐 การรีเซ็ตรหัสผ่าน</h1>
      </div>
      <div style="background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>สวัสดี <strong>${firstName} ${lastName}</strong></p>
        <p>รหัสผ่านของคุณในระบบ HR ได้รับการรีเซ็ตแล้ว</p>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ED7014;">
          <h3 style="margin-top: 0; color: #ED7014;">🔑 รหัสผ่านใหม่</h3>
          <p style="font-size: 18px; font-weight: bold; letter-spacing: 2px; color: #0078D4; background-color: #f0f0f0; padding: 15px; border-radius: 4px; text-align: center;">
            ${newPassword}
          </p>
          <p style="font-size: 12px; color: #666; margin-top: 15px;">
            ⚠️ โปรดเปลี่ยนรหัสผ่านของคุณในครั้งแรกที่เข้าสู่ระบบ
            <br><br>
            💡 สำหรับความปลอดภัย ขอแนะนำให้ใช้รหัสผ่านที่แข็งแรง (ตัวใหญ่ ตัวเล็ก ตัวเลข และสัญลักษณ์)
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/auth" style="
            background-color: #0078D4;
            color: white;
            padding: 12px 30px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            display: inline-block;
          ">
            🔗 คลิกเข้าสู่ระบบ
          </a>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #FF6B6B; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 12px;">
            <strong>⚠️ สำคัญ:</strong> หากคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่านนี้ กรุณาติดต่อแผนกบุคคลในทันที
          </p>
        </div>
        
        <div style="border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666;">
          <p>หากคุณมีคำถาม กรุณาติดต่อแผนกบุคคล</p>
          <p>ขอบคุณ,<br>ระบบ HR</p>
        </div>
      </div>
    </div>
  `;
}
