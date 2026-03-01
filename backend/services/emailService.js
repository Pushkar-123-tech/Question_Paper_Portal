const nodemailer = require('nodemailer');

// Support flexible SMTP env vars for deployment
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_SECURE = process.env.SMTP_SECURE;
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
const EMAIL_SERVICE = process.env.EMAIL_SERVICE;

const isEmailConfigured = Boolean(
  (SMTP_HOST && SMTP_USER && SMTP_PASS) ||
  (EMAIL_SERVICE && SMTP_USER && SMTP_PASS)
);

let transporter;
if (isEmailConfigured) {
  if (SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
      secure: SMTP_SECURE === 'true' || (SMTP_PORT && Number(SMTP_PORT) === 465),
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  } else {
    transporter = nodemailer.createTransport({
      service: EMAIL_SERVICE || 'gmail',
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
  }

  transporter.verify(function(error, success) {
    if (error) {
      console.error('❌ Email Service Error:', error && error.message ? error.message : error);
      console.log('📋 Check your SMTP_* or EMAIL_* environment variables (SMTP_USER/SMTP_PASS).');
    } else {
      console.log('✅ Email Service Ready - Emails will be sent from', SMTP_USER);
    }
  });
} else {
  console.warn('⚠️  Email transport not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS or EMAIL_SERVICE/EMAIL_USER/EMAIL_PASSWORD. Emails will be skipped.');
  // fallback to a no-op JSON transport so sendMail doesn't throw
  transporter = nodemailer.createTransport({ jsonTransport: true });
}

/**
 * Send registration welcome email
 * @param {Object} user - User object with email, name, role
 */
const sendWelcomeEmail = async (user) => {
    try {
      if (!isEmailConfigured) {
        console.log(`⏭️  Email not sent to ${user.email} - email transport not configured`);
        return false;
      }

      const mailOptions = {
        from: SMTP_USER,
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
      console.error(`❌ Error sending welcome email to ${user.email}:`, err && err.message ? err.message : err);
      return false;
    }
};

/**
 * Send question paper creation notification
 * @param {Object} options - { userEmail, userName, paperTitle, recipientEmail, recipientRole }
 */
const sendPaperCreationEmail = async (options) => {
    try {
      if (!isEmailConfigured) {
        console.log(`⏭️  Email not sent to ${options.recipientEmail} - email transport not configured`);
        return false;
      }

      const { userEmail, userName, paperTitle, recipientEmail, recipientRole } = options;
      
      const mailOptions = {
        from: SMTP_USER,
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
      console.error(`❌ Error sending paper creation email to ${options.recipientEmail}:`, err && err.message ? err.message : err);
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
    
    if (!isEmailConfigured) {
      console.log(`⏭️  Role change email not sent to ${userEmail} - email transport not configured`);
      return false;
    }

    const mailOptions = {
      from: SMTP_USER,
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
    console.error(`❌ Error sending role change email to ${userEmail}:`, err && err.message ? err.message : err);
    return false;
  }
};

/**
 * Send paper sharing notification
 * @param {Object} options - { senderName, senderEmail, recipientEmail, paperTitle, message }
 */
const sendPaperSharingEmail = async (options) => {
    try {
      if (!isEmailConfigured) {
        console.log(`⏭️  Email not sent to ${options.recipientEmail} - email transport not configured`);
        return false;
      }
      const { senderName, senderEmail, recipientEmail, paperTitle, message } = options;
      
      const mailOptions = {
        from: SMTP_USER,
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
      console.error(`❌ Error sending paper sharing email to ${options.recipientEmail}:`, err && err.message ? err.message : err);
      return false;
    }
};

/**
 * Send login notification email
 * @param {Object} user - User object with email, name, role
 */
const sendLoginEmail = async (user) => {
    try {
      if (!isEmailConfigured) {
        console.log(`⏭️  Email not sent to ${user.email} - email transport not configured`);
        return false;
      }

      const mailOptions = {
        from: SMTP_USER,
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
      console.error(`❌ Error sending login email to ${user.email}:`, err && err.message ? err.message : err);
      return false;
    }
};

/**
 * Send generic notification email
 * @param {Object} options - { to, subject, message }
 */
const sendNotificationEmail = async (options) => {
    try {
      if (!isEmailConfigured) {
        console.log(`⏭️  Email not sent to ${options.to} - email transport not configured`);
        return false;
      }
      const { to, subject, message } = options;
      
      const mailOptions = {
        from: SMTP_USER,
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
      console.error(`❌ Error sending notification email to ${options.to}:`, err && err.message ? err.message : err);
      return false;
    }
};

/**
 * Send password reset email
 * @param {string} email
 * @param {string} token
 */
const sendPasswordResetEmail = async (email, token) => {
    try {
      if (!isEmailConfigured) {
        console.log(`⏭️  Email not sent to ${email} - email transport not configured`);
        return false;
      }

      const resetBase = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetLink = `${resetBase.replace(/\/$/, '')}/resetpassword.html?token=${token}`;

      const mailOptions = {
        from: SMTP_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your account.</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${resetLink}">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request this, please ignore this email.</p>
          <br/>
          <p>Best regards,<br/>Test Creator Team</p>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}`);
      return true;
    } catch (err) {
      console.error(`❌ Error sending password reset email to ${email}:`, err && err.message ? err.message : err);
      return false;
    }
};

module.exports = {
  sendWelcomeEmail,
  sendPaperCreationEmail,
  sendRoleChangeEmail,
  sendPaperSharingEmail,
  sendLoginEmail,
  sendNotificationEmail,
  sendPasswordResetEmail
};
