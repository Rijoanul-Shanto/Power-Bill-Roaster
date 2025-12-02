# Power-Roast

A TypeScript-based DESCO prepaid electricity balance monitor that sends brutally honest email notifications when your balance gets dangerously low. Because sometimes you need tough love to remember to recharge.

## What It Does

Checks your DESCO prepaid electricity balance and sends savage email notifications at two critical thresholds:

- **Below 150 BDT**: Warning shot - "Your Electricity About to Ghost You"
- **Below 100 BDT**: DEFCON 1 - "You're About to Live in the Stone Age"

Runs automatically every 6 hours via GitHub Actions, so you'll never be caught off guard by a sudden blackout.

## Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd power-roast
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
DESCO_ACCOUNT_NO=your_account_number
DESCO_METER_NO=your_meter_number
EMAIL_TO=recipient@example.com
EMAIL_FROM=sender@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 3. Set Up GitHub Secrets

For automated checks via GitHub Actions, add these secrets to your repository:

1. Go to your repo's **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:
    - `DESCO_ACCOUNT_NO`
    - `DESCO_METER_NO`
    - `EMAIL_TO`
    - `EMAIL_FROM`
    - `SMTP_HOST`
    - `SMTP_PORT`
    - `SMTP_USER`
    - `SMTP_PASS`

## Usage

### Run Manually

```bash
npm run check-balance
```

### Automated Checks

The GitHub Actions workflow runs automatically every 6 hours. You can also trigger it manually from the **Actions** tab in your GitHub repository.

## Email Providers

### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Use the app password as your `SMTP_PASS`
4. Set `SMTP_HOST=smtp.gmail.com` and `SMTP_PORT=587`

### Other Providers

Works with any SMTP provider. Common settings:

- **Outlook**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your provider's settings

## How It Works

1. Fetches your current balance from DESCO's prepaid API
2. Compares balance against thresholds (150 BDT and 100 BDT)
3. Sends hilariously aggressive email notifications if thresholds are breached
4. Logs everything for your viewing pleasure

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

## Tech Stack

- **TypeScript** - Type-safe balance checking
- **node-fetch** - API requests
- **nodemailer** - Email notifications
- **GitHub Actions** - Automated scheduling

## License

MIT - Use it, modify it, roast yourself with it.

## Disclaimer

This tool is for personal use. DESCO's API usage is at your own risk. The savage emails are intentionally over-the-top - adjust the tone in `check-balance.ts` if you prefer gentler reminders.
