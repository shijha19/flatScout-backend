import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter using Gmail
const createTransporter = () => {
  // Check if email configuration is available
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email configuration not found. Emails will not be sent.');
    return null;
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Generic email sending function
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = createTransporter();
    
    // If no email configuration, return early with warning
    if (!transporter) {
      console.warn('📧 Email not configured - email not sent');
      return { success: false, error: 'Email service not configured' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"FlatScout" <noreply@flatscout.com>',
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send booking notification to flat owner
export const sendBookingNotification = async (ownerEmail, bookingDetails) => {
  try {
    const transporter = createTransporter();
    
    // If no email configuration, return early with warning
    if (!transporter) {
      console.warn('📧 Email not configured - booking notification not sent');
      return { success: false, error: 'Email service not configured' };
    }

    const { 
      visitorName, 
      visitorEmail, 
      visitorPhone, 
      flatTitle, 
      flatLocation, 
      date, 
      timeSlot, 
      purpose, 
      notes 
    } = bookingDetails;

    // Format the date for better readability
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: process.env.EMAIL_USER || 'flatscout.notification@gmail.com',
      to: ownerEmail,
      subject: `New Flat Visit Scheduled - ${flatTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🏠 New Visit Scheduled!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Someone is interested in visiting your property</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Property Details -->
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
              <h2 style="color: #1976d2; margin: 0 0 10px 0; font-size: 20px;">📍 Property Details</h2>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Property:</strong> ${flatTitle}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Location:</strong> ${flatLocation}</p>
            </div>

            <!-- Visit Details -->
            <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #9c27b0;">
              <h2 style="color: #7b1fa2; margin: 0 0 10px 0; font-size: 20px;">📅 Visit Details</h2>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Time:</strong> ${timeSlot}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Purpose:</strong> ${purpose}</p>
              ${notes ? `<p style="margin: 5px 0; font-size: 16px;"><strong>Notes:</strong> ${notes}</p>` : ''}
            </div>

            <!-- Visitor Details -->
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4caf50;">
              <h2 style="color: #388e3c; margin: 0 0 10px 0; font-size: 20px;">👤 Visitor Information</h2>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Name:</strong> ${visitorName}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Email:</strong> <a href="mailto:${visitorEmail}" style="color: #1976d2; text-decoration: none;">${visitorEmail}</a></p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Phone:</strong> <a href="tel:${visitorPhone}" style="color: #1976d2; text-decoration: none;">${visitorPhone}</a></p>
            </div>

            <!-- Action Required -->
            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff9800;">
              <h2 style="color: #f57c00; margin: 0 0 10px 0; font-size: 20px;">⚡ Action Required</h2>
              <p style="margin: 5px 0; font-size: 16px; line-height: 1.5;">
                Please contact the visitor to confirm the visit details and provide any specific instructions. 
                You can reach them via email or phone using the contact information above.
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                This notification was sent by <strong>FlatScout</strong> - Your Property Companion
              </p>
              <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
                If you have any questions, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      `,
      // Plain text version for email clients that don't support HTML
      text: `
New Flat Visit Scheduled!

Property Details:
- Property: ${flatTitle}
- Location: ${flatLocation}

Visit Details:
- Date: ${formattedDate}
- Time: ${timeSlot}
- Purpose: ${purpose}
${notes ? `- Notes: ${notes}` : ''}

Visitor Information:
- Name: ${visitorName}
- Email: ${visitorEmail}
- Phone: ${visitorPhone}

Action Required:
Please contact the visitor to confirm the visit details and provide any specific instructions.

Best regards,
FlatScout Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Booking notification email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending booking notification email:', error);
    return { success: false, error: error.message };
  }
};

// Send booking confirmation to visitor
export const sendBookingConfirmation = async (visitorEmail, bookingDetails) => {
  try {
    const transporter = createTransporter();
    
    // If no email configuration, return early with warning
    if (!transporter) {
      console.warn('📧 Email not configured - booking confirmation not sent');
      return { success: false, error: 'Email service not configured' };
    }

    const { 
      visitorName, 
      ownerEmail,
      flatTitle, 
      flatLocation, 
      date, 
      timeSlot, 
      purpose, 
      notes 
    } = bookingDetails;

    // Format the date for better readability
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: process.env.EMAIL_USER || 'flatscout.notification@gmail.com',
      to: visitorEmail,
      subject: `Booking Confirmation - ${flatTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">✅ Booking Confirmed!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your flat visit has been successfully scheduled</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${visitorName}</strong>,</p>
            <p style="font-size: 16px; margin-bottom: 20px; line-height: 1.5;">
              Your visit request has been submitted successfully! The property owner will be notified and will contact you soon to confirm the details.
            </p>

            <!-- Booking Details -->
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
              <h2 style="color: #1976d2; margin: 0 0 15px 0; font-size: 20px;">📋 Your Booking Details</h2>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Property:</strong> ${flatTitle}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Location:</strong> ${flatLocation}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Time:</strong> ${timeSlot}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Purpose:</strong> ${purpose}</p>
              ${notes ? `<p style="margin: 5px 0; font-size: 16px;"><strong>Notes:</strong> ${notes}</p>` : ''}
            </div>

            <!-- Next Steps -->
            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff9800;">
              <h2 style="color: #f57c00; margin: 0 0 10px 0; font-size: 20px;">📞 Next Steps</h2>
              <p style="margin: 5px 0; font-size: 16px; line-height: 1.5;">
                The property owner has been notified about your visit request. They will contact you soon at your provided email or phone number to confirm the appointment and share any additional details.
              </p>
            </div>

            <!-- Contact Info -->
            <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #9c27b0;">
              <h2 style="color: #7b1fa2; margin: 0 0 10px 0; font-size: 20px;">📧 Property Owner Contact</h2>
              <p style="margin: 5px 0; font-size: 16px;">
                Owner Email: <a href="mailto:${ownerEmail}" style="color: #1976d2; text-decoration: none;">${ownerEmail}</a>
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                Thank you for using <strong>FlatScout</strong> - Your Property Companion
              </p>
              <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
                If you have any questions, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
Booking Confirmed!

Hi ${visitorName},

Your visit request has been submitted successfully! The property owner will be notified and will contact you soon.

Your Booking Details:
- Property: ${flatTitle}
- Location: ${flatLocation}
- Date: ${formattedDate}
- Time: ${timeSlot}
- Purpose: ${purpose}
${notes ? `- Notes: ${notes}` : ''}

Next Steps:
The property owner has been notified and will contact you soon to confirm the appointment.

Property Owner Contact: ${ownerEmail}

Thank you for using FlatScout!
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Booking confirmation email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return { success: false, error: error.message };
  }
};

export default { sendBookingNotification, sendBookingConfirmation };
