const nodemailer = require('nodemailer');

// Verify environment variables are set
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.warn('⚠️  EMAIL_USER and EMAIL_PASSWORD environment variables are not configured. Emails will not be sent.');
}

// Initialize transporter - configure with your email service
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Test transporter connection on startup
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ Email Service Error:', error.message);
    console.log('📋 Check your EMAIL_USER and EMAIL_PASSWORD in .env file');
    console.log('📋 Gmail: Use app password, not regular password');
  } else if (success) {
    console.log('✅ Email Service Ready - Emails will be sent');
    console.log(`📧 Sender: ${process.env.EMAIL_USER}`);
  }
});

/**
 * Send registration welcome email
 * @param {Object} user - User object with email, name, role
 */
const sendWelcomeEmail = async (user) => {
  try {
    if (!process.env.EMAIL_USER) {
      console.log(`⏭️  Email not sent to ${user.email} - EMAIL_USER not configured`);
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Welcome to Test Creator Platform',
      html: `
        <h2>Welcome, ${user.name}!</h2>
        <p>Your account has been successfully created on the Test Creator Platform.</p>
        <p><strong>Account Details:</strong></p>
        <ul>
          <li>Email: ${user.email}</li>
          <li>Role: ${user.role || 'external'}</li>
          <li>Registration Date: ${new Date().toLocaleDateString()}</li>
        </ul>
        <p>You can now log in to the platform and start creating question papers.</p>
        <p>If you have any questions, please contact the administrator.</p>
        <br/>
        <p>Best regards,<br/>Test Creator Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${user.email}`);
    return true;
  } catch (err) {
    console.error(`❌ Error sending welcome email to ${user.email}:`, err.message);
    return false;
  }
};

/**
 * Send question paper creation notification
 * @param {Object} options - { userEmail, userName, paperTitle, recipientEmail, recipientRole }
 */
const sendPaperCreationEmail = async (options) => {
  try {
    if (!process.env.EMAIL_USER) {
      console.log(`⏭️  Email not sent to ${options.recipientEmail} - EMAIL_USER not configured`);
      return false;
    }

    const { userEmail, userName, paperTitle, recipientEmail, recipientRole } = options;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `New Question Paper Created: ${paperTitle}`,
      html: `
        <h2>Question Paper Created</h2>
        <p>A new question paper has been created on the Test Creator Platform.</p>
        <p><strong>Details:</strong></p>
        <ul>
          <li>Paper Title: ${paperTitle}</li>
          <li>Created By: ${userName} (${userEmail})</li>
          <li>Recipient Role: ${recipientRole}</li>
          <li>Creation Date: ${new Date().toLocaleDateString()}</li>
        </ul>
        <p>Please log in to the platform to view and review the question paper.</p>
        <br/>
        <p>Best regards,<br/>Test Creator Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Paper creation email sent to ${recipientEmail}`);
    return true;
  } catch (err) {
    console.error(`❌ Error sending paper creation email to ${recipientEmail}:`, err.message);
    return false;
  }
};

/**
 * Send role assignment notification
 * @param {Object} options - { userEmail, userName, newRole, adminName }
 */
const sendRoleChangeEmail = async (options) => {
  try {
    const { userEmail, userName, newRole, adminName } = options;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: 'Your Role Has Been Updated',
      html: `
        <h2>Role Assignment Notification</h2>
        <p>Hello ${userName},</p>
        <p>Your role on the Test Creator Platform has been updated.</p>
        <p><strong>Role Details:</strong></p>
        <ul>
          <li>New Role: <strong>${newRole}</strong></li>
          <li>Updated By: ${adminName}</li>
          <li>Update Date: ${new Date().toLocaleDateString()}</li>
        </ul>
        <p>This role grants you access to new features and responsibilities on the platform.</p>
        <p>Please log in to see your updated dashboard and available options.</p>
        <br/>
        <p>Best regards,<br/>Test Creator Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Role change email sent to ${userEmail}`);
    return true;
  } catch (err) {
    console.error(`❌ Error sending role change email to ${userEmail}:`, err.message);
    return false;
  }
};

/**
 * Send paper sharing notification
 * @param {Object} options - { senderName, senderEmail, recipientEmail, paperTitle, message }
 */
const sendPaperSharingEmail = async (options) => {
  try {
    if (!process.env.EMAIL_USER) {
      console.log(`⏭️  Email not sent to ${options.recipientEmail} - EMAIL_USER not configured`);
      return false;
    }
    const { senderName, senderEmail, recipientEmail, paperTitle, message } = options;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `Question Paper Shared: ${paperTitle}`,
      html: `
        <h2>Question Paper Shared With You</h2>
        <p>A question paper has been shared with you.</p>
        <p><strong>Paper Details:</strong></p>
        <ul>
          <li>Paper Title: ${paperTitle}</li>
          <li>Shared By: ${senderName} (${senderEmail})</li>
          <li>Shared Date: ${new Date().toLocaleDateString()}</li>
        </ul>
        ${message ? `<p><strong>Message from sender:</strong></p><p>${message}</p>` : ''}
        <p>Log in to the platform to view the shared question paper.</p>
        <br/>
        <p>Best regards,<br/>Test Creator Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Paper sharing email sent to ${recipientEmail}`);
    return true;
  } catch (err) {
    console.error(`❌ Error sending paper sharing email to ${recipientEmail}:`, err.message);
    return false;
  }
};

/**
 * Send login notification email
 * @param {Object} user - User object with email, name, role
 */
const sendLoginEmail = async (user) => {
  try {
    if (!process.env.EMAIL_USER) {
      console.log(`⏭️  Email not sent to ${user.email} - EMAIL_USER not configured`);
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Login Notification - Test Creator Platform',
      html: `
        <h2>Login Detected</h2>
        <p>Hello ${user.name},</p>
        <p>You have successfully logged in to the Test Creator Platform.</p>
        <p><strong>Login Details:</strong></p>
        <ul>
          <li>Email: ${user.email}</li>
          <li>Role: ${user.role || 'external'}</li>
          <li>Login Date: ${new Date().toLocaleDateString()}</li>
          <li>Login Time: ${new Date().toLocaleTimeString()}</li>
        </ul>
        <p>If you did not authorize this login, please contact the administrator immediately.</p>
        <br/>
        <p>Best regards,<br/>Test Creator Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Login email sent to ${user.email} (${user.role})`);
    return true;
  } catch (err) {
    console.error(`❌ Error sending login email to ${user.email}:`, err.message);
    return false;
  }
};

/**
 * Send generic notification email
 * @param {Object} options - { to, subject, message }
 */
const sendNotificationEmail = async (options) => {
  try {
    if (!process.env.EMAIL_USER) {
      console.log(`⏭️  Email not sent to ${options.to} - EMAIL_USER not configured`);
      return false;
    }
    const { to, subject, message } = options;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif;">
          ${message}
          <br/><br/>
          <p>Best regards,<br/>Test Creator Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Notification email sent to ${to}`);
    return true;
  } catch (err) {
    console.error(`❌ Error sending notification email to ${to}:`, err.message);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPaperCreationEmail,
  sendRoleChangeEmail,
  sendPaperSharingEmail,
  sendLoginEmail,
  sendNotificationEmail
};
