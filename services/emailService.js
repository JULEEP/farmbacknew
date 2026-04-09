// services/emailService.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  // Configure your email service
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendApplicationEmail = async ({ to, applicationId, farmhouseName, status, reason, credentials }) => {
  let subject, html;
  
  if (status === 'pending') {
    subject = `Farmhouse Application Received - ${applicationId}`;
    html = `
      <h2>Application Submitted Successfully!</h2>
      <p>Dear Vendor,</p>
      <p>Your farmhouse "<strong>${farmhouseName}</strong>" application has been received.</p>
      <p><strong>Application ID:</strong> ${applicationId}</p>
      <p>Use this ID to track your application status.</p>
      <p>Track status at: ${process.env.APP_URL}/vendor/status/${applicationId}</p>
      <p>We will review your application and notify you within 2-3 business days.</p>
    `;
  } else if (status === 'approved') {
    subject = `Farmhouse Application Approved - ${applicationId}`;
    html = `
      <h2>Congratulations! Your Farmhouse is Approved 🎉</h2>
      <p>Dear Vendor,</p>
      <p>Your farmhouse "<strong>${farmhouseName}</strong>" has been approved!</p>
      <p><strong>Login Credentials:</strong></p>
      <ul>
        <li>Username: ${credentials.vendorName}</li>
        <li>Password: ${credentials.password}</li>
      </ul>
      <p><strong>Important:</strong> Please change your password after first login.</p>
      <p>Login here: ${process.env.VENDOR_PORTAL_URL}</p>
    `;
  } else if (status === 'rejected') {
    subject = `Farmhouse Application Update - ${applicationId}`;
    html = `
      <h2>Application Status Update</h2>
      <p>Dear Vendor,</p>
      <p>Your farmhouse "<strong>${farmhouseName}</strong>" application has been reviewed.</p>
      <p><strong>Status:</strong> Not Approved</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>You can submit a new application with the required modifications.</p>
    `;
  }
  
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html
  });
};