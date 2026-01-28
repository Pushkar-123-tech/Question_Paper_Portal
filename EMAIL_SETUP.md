# Email Configuration Guide for Test Creator Platform

## Overview
The application now includes an email gateway that sends notifications for:
1. **User Registration** - Welcome email when a new user signs up
2. **Question Paper Creation** - Notifications to admin/faculty/coordinators when a paper is created
3. **Role Assignment** - Notifications when a user's role is changed by an admin

## Email Configuration

### Required Environment Variables

Add these variables to your `.env` file in the `backend` directory:

```env
# Email Service Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Gmail Setup (Recommended)

1. **Enable 2-Step Verification:**
   - Go to https://myaccount.google.com
   - Select "Security" from the left menu
   - Enable "2-Step Verification"

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or your device)
   - Google will generate a 16-character password
   - Copy this password and paste it in your `.env` file as `EMAIL_PASSWORD`

3. **Set Email Address:**
   - Use your Gmail address as `EMAIL_USER`

### Alternative Email Services

The system supports any email service compatible with Nodemailer. Examples:

**Outlook:**
```env
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

**Custom SMTP Server:**
```env
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-password
```

### Testing the Email Configuration

1. Create a test user by signing up through the application
2. Check the console logs for email send confirmations (✓ or ✗ messages)
3. Verify the email was received in the recipient's inbox

## Email Templates

### 1. Welcome Email (On Signup)
- Sent to newly registered users
- Includes: Name, email, role, registration date
- Confirms successful account creation

### 2. Paper Creation Email
- Sent to all admins, faculty, module coordinators, and chairmen
- Includes: Paper title, creator name, creation date
- Notifies about new question papers

### 3. Role Change Email
- Sent when an admin updates a user's role
- Includes: New role, admin name, update date
- Informs users about their new permissions

## Files Modified

- **[backend/services/emailService.js](backend/services/emailService.js)** - Email service module with all email functions
- **[backend/routes/auth.js](backend/routes/auth.js)** - Updated signup route to send welcome email
- **[backend/routes/papers.js](backend/routes/papers.js)** - Updated paper creation to send notifications
- **[backend/routes/admin.js](backend/routes/admin.js)** - Updated role change to send notification

## Features

✓ Asynchronous email sending (non-blocking)
✓ Error logging and retry handling
✓ HTML formatted emails
✓ Multiple email template support
✓ Role-based notification routing

## Troubleshooting

**Emails not being sent:**
- Verify EMAIL_USER and EMAIL_PASSWORD are correct
- Check that less secure app access is enabled (for Gmail)
- Review console logs for error messages

**Getting "Invalid credentials" error:**
- Ensure you're using an app-specific password (not your regular Gmail password)
- Verify 2-step verification is enabled on your Google account

**Emails going to spam:**
- Add your sender email to contacts
- Check spam/junk folder
- Consider using a business email service for production

## Production Recommendations

For production use:
1. Use a dedicated email service like SendGrid, Mailgun, or AWS SES
2. Store sensitive credentials in secure environment variables
3. Implement email queuing for reliability
4. Add bounce/complaint handling
5. Use templates from email service providers for better deliverability
