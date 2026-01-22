const nodemailer = require('nodemailer');
const config = require('./index');

// Create transporter
const createTransporter = () => {
  if (config.isDevelopment() && !config.email.user) {
    // Use ethereal for development if no SMTP configured
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }

  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.pass
    }
  });
};

const transporter = createTransporter();

// Email templates
const templates = {
  welcome: (user) => ({
    subject: 'Welcome to Hospital Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0ea5e9;">Welcome to Hospital Management System</h1>
        <p>Hello ${user.firstName},</p>
        <p>Your account has been created successfully.</p>
        <p><strong>Role:</strong> ${user.role}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p>You can now login to access the system.</p>
        <br>
        <p>Best regards,<br>Hospital Management Team</p>
      </div>
    `
  }),

  passwordReset: (user, resetToken) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0ea5e9;">Password Reset Request</h1>
        <p>Hello ${user.firstName},</p>
        <p>You requested a password reset. Use this token to reset your password:</p>
        <p style="background: #f0f9ff; padding: 15px; border-radius: 5px; font-size: 18px; text-align: center;">
          <strong>${resetToken}</strong>
        </p>
        <p>This token expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <br>
        <p>Best regards,<br>Hospital Management Team</p>
      </div>
    `
  }),

  appointmentConfirmation: (patient, appointment, doctor) => ({
    subject: `Appointment Confirmation - ${appointment.date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0ea5e9;">Appointment Confirmed</h1>
        <p>Hello ${patient.firstName},</p>
        <p>Your appointment has been confirmed:</p>
        <div style="background: #f0f9ff; padding: 15px; border-radius: 5px;">
          <p><strong>Doctor:</strong> Dr. ${doctor.firstName} ${doctor.lastName}</p>
          <p><strong>Date:</strong> ${appointment.date}</p>
          <p><strong>Time:</strong> ${appointment.timeSlot}</p>
          <p><strong>Type:</strong> ${appointment.type}</p>
        </div>
        <p>Please arrive 15 minutes before your scheduled time.</p>
        <br>
        <p>Best regards,<br>Hospital Management Team</p>
      </div>
    `
  }),

  dischargeNotification: (patient, admission) => ({
    subject: 'Discharge Summary',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0ea5e9;">Discharge Summary</h1>
        <p>Hello ${patient.firstName},</p>
        <p>You have been discharged from the hospital.</p>
        <div style="background: #f0f9ff; padding: 15px; border-radius: 5px;">
          <p><strong>Admission Date:</strong> ${admission.admissionDate}</p>
          <p><strong>Discharge Date:</strong> ${admission.dischargeDate}</p>
          <p><strong>Diagnosis:</strong> ${admission.diagnosis}</p>
        </div>
        <p>Please follow up with your doctor as advised.</p>
        <br>
        <p>Best regards,<br>Hospital Management Team</p>
      </div>
    `
  }),

  invoiceGenerated: (patient, invoice) => ({
    subject: `Invoice #${invoice.invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0ea5e9;">Invoice Generated</h1>
        <p>Hello ${patient.firstName},</p>
        <p>Your invoice has been generated:</p>
        <div style="background: #f0f9ff; padding: 15px; border-radius: 5px;">
          <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Total Amount:</strong> ₹${invoice.totalAmount.toLocaleString()}</p>
          <p><strong>Due Date:</strong> ${invoice.dueDate}</p>
          <p><strong>Status:</strong> ${invoice.status}</p>
        </div>
        <p>Please make the payment before the due date.</p>
        <br>
        <p>Best regards,<br>Hospital Management Team</p>
      </div>
    `
  })
};

// Send email function
const sendEmail = async (to, template, data) => {
  try {
    const { subject, html } = templates[template](data);
    
    const mailOptions = {
      from: config.email.from,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent: ${info.messageId}`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Send custom email
const sendCustomEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: config.email.from,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendCustomEmail,
  templates
};
