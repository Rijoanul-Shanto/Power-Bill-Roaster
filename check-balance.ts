import 'dotenv/config';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import https from 'https';

// Environment variables - no hardcoded fallbacks for sensitive data
const ACCOUNT_NO = process.env.DESCO_ACCOUNT_NO;
const METER_NO = process.env.DESCO_METER_NO;
const EMAIL_TO = process.env.EMAIL_TO;
const EMAIL_FROM = process.env.EMAIL_FROM;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || '587';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

// Configurable thresholds
const LOW_THRESHOLD = parseInt(process.env.LOW_THRESHOLD || '150');
const CRITICAL_THRESHOLD = parseInt(process.env.CRITICAL_THRESHOLD || '100');

interface BalanceData {
    accountNo: string;
    meterNo: string;
    balance: number;
    currentMonthConsumption: number;
    readingTime: string;
}

interface ApiResponse {
    code: number;
    desc: string;
    data: BalanceData;
}

function validateEnv(): void {
    const required = [
        'DESCO_ACCOUNT_NO',
        'DESCO_METER_NO',
        'EMAIL_TO',
        'EMAIL_FROM',
        'SMTP_HOST',
        'SMTP_USER',
        'SMTP_PASS',
    ];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

function validateApiResponse(response: unknown): response is ApiResponse {
    if (typeof response !== 'object' || response === null) {
        return false;
    }
    const obj = response as Record<string, unknown>;

    if (obj.code !== 200 || typeof obj.data !== 'object' || obj.data === null) {
        return false;
    }

    const data = obj.data as Record<string, unknown>;
    return typeof data.balance === 'number';
}

function generateCriticalEmailHtml(balance: number, accountNo: string, meterNo: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d0d0d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d0d0d;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px rgba(255, 0, 0, 0.3);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(90deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
                            <div style="font-size: 64px; margin-bottom: 10px;">💀⚡💀</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
                                POWER EMERGENCY
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Balance Display -->
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <div style="background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border: 2px solid #dc2626;">
                                <p style="margin: 0 0 10px 0; color: #fca5a5; font-size: 14px; text-transform: uppercase; letter-spacing: 3px;">Current Balance</p>
                                <p style="margin: 0; color: #fef2f2; font-size: 56px; font-weight: 900;">
                                    ৳${balance.toFixed(2)}
                                </p>
                                <p style="margin: 10px 0 0 0; color: #f87171; font-size: 18px; font-weight: 600;">⚠️ CRITICALLY LOW ⚠️</p>
                            </div>
                            
                            <p style="color: #fecaca; font-size: 20px; line-height: 1.6; margin: 0 0 25px 0;">
                                <strong>THIS IS NOT A DRILL!</strong><br>
                                Your balance is in the danger zone. DESCO will cut your power any moment now.
                            </p>
                            
                            <p style="color: #f87171; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; font-style: italic;">
                                You'll be charging your phone at McDonald's like it's 2005. Is that the life you want? Living off their WiFi, pretending to order fries?
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Account Details -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(0,0,0,0.4); border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 15px 20px; border-bottom: 1px solid #7f1d1d;">
                                        <span style="color: #fca5a5; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Account No</span>
                                        <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 18px; font-weight: 600; font-family: 'Courier New', monospace;">${accountNo}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 20px;">
                                        <span style="color: #fca5a5; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Meter No</span>
                                        <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 18px; font-weight: 600; font-family: 'Courier New', monospace;">${meterNo}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- CTA Button -->
                    <tr>
                        <td style="padding: 0 30px 40px 30px; text-align: center;">
                            <a href="https://prepaid.desco.org.bd/" style="display: inline-block; background: linear-gradient(90deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 30px rgba(220, 38, 38, 0.5);">
                                ⚡ RECHARGE NOW ⚡
                            </a>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: rgba(0,0,0,0.5); padding: 20px; text-align: center;">
                            <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                                P.S. - Your neighbors are judging you. Just saying. 👀
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
}

function generateWarningEmailHtml(balance: number, accountNo: string, meterNo: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #0c0a15 0%, #1a1625 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px rgba(251, 191, 36, 0.2);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
                            <div style="font-size: 64px; margin-bottom: 10px;">🚨⚡🚨</div>
                            <h1 style="margin: 0; color: #0c0a0a; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">
                                Balance Running Low
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Balance Display -->
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <div style="background: linear-gradient(135deg, #1c1917 0%, #292524 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border: 2px solid #f59e0b;">
                                <p style="margin: 0 0 10px 0; color: #fcd34d; font-size: 14px; text-transform: uppercase; letter-spacing: 3px;">Current Balance</p>
                                <p style="margin: 0; color: #fffbeb; font-size: 56px; font-weight: 900;">
                                    ৳${balance.toFixed(2)}
                                </p>
                                <p style="margin: 10px 0 0 0; color: #fbbf24; font-size: 16px; font-weight: 600;">Getting Low...</p>
                            </div>
                            
                            <p style="color: #fef3c7; font-size: 20px; line-height: 1.6; margin: 0 0 25px 0;">
                                <strong>Bruh, wake up!</strong><br>
                                Your DESCO balance is looking kinda sad right now.
                            </p>
                            
                            <p style="color: #fcd34d; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; font-style: italic;">
                                You really gonna let your lights go dark like your future? Don't be that person sitting in the dark contemplating poor life choices.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Account Details -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(0,0,0,0.4); border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 15px 20px; border-bottom: 1px solid #78716c;">
                                        <span style="color: #fcd34d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Account No</span>
                                        <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 18px; font-weight: 600; font-family: 'Courier New', monospace;">${accountNo}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 20px;">
                                        <span style="color: #fcd34d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Meter No</span>
                                        <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 18px; font-weight: 600; font-family: 'Courier New', monospace;">${meterNo}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- CTA Button -->
                    <tr>
                        <td style="padding: 0 30px 40px 30px; text-align: center;">
                            <a href="https://prepaid.desco.org.bd/" style="display: inline-block; background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); color: #0c0a0a; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 30px rgba(245, 158, 11, 0.4);">
                                ⚡ RECHARGE NOW ⚡
                            </a>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: rgba(0,0,0,0.5); padding: 20px; text-align: center;">
                            <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                                Get your act together. Seriously. 💪
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
}

function generateCriticalEmailText(balance: number, accountNo: string, meterNo: string): string {
    return `💀 POWER EMERGENCY 💀

THIS IS NOT A DRILL!

Current Balance: ৳${balance.toFixed(2)} (CRITICALLY LOW)

Your balance is in the danger zone. That's like, TWO digits. Do you even know how numbers work?

Account: ${accountNo}
Meter: ${meterNo}

DESCO is about to cut your power and you'll be out here charging your phone at McDonald's like it's 2005. Is that the life you want? Living off their WiFi, pretending to order fries?

RECHARGE RIGHT NOW → https://prepaid.desco.org.bd/

Or accept your fate as someone who literally can't keep the lights on. Your call, but make it quick before you can't even read this email.

P.S. - Your neighbors are judging you. Just saying.`;
}

function generateWarningEmailText(balance: number, accountNo: string, meterNo: string): string {
    return `🚨 BALANCE RUNNING LOW 🚨

Bruh, wake up!

Current Balance: ৳${balance.toFixed(2)}

Your DESCO balance is looking kinda sad right now. That's BROKE energy right there.

Account: ${accountNo}
Meter: ${meterNo}

You really gonna let your lights go dark like your future? Recharge NOW before you're sitting in the dark like a caveman contemplating your poor life choices.

RECHARGE NOW → https://prepaid.desco.org.bd/

Get your act together. Seriously.`;
}

async function sendEmail(subject: string, text: string, html: string): Promise<void> {
    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT),
        secure: parseInt(SMTP_PORT) === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    await transporter.sendMail({
        from: EMAIL_FROM,
        to: EMAIL_TO,
        subject: subject,
        text: text,
        html: html,
    });
}

async function checkBalance(): Promise<void> {
    try {
        validateEnv();

        console.log('Checking balance for account:', ACCOUNT_NO);

        const apiUrl = `https://prepaid.desco.org.bd/api/tkdes/customer/getBalance?accountNo=${ACCOUNT_NO}&meterNo=${METER_NO}`;

        // Note: rejectUnauthorized is set to false due to DESCO API certificate issues
        // This is a known limitation - consider monitoring for certificate updates
        const agent = new https.Agent({
            rejectUnauthorized: false
        });

        const response = await fetch(apiUrl, {agent});
        const apiResponse = await response.json();

        if (!validateApiResponse(apiResponse)) {
            throw new Error('Invalid API response: missing or invalid data');
        }

        const balance = apiResponse.data.balance;
        console.log('Current balance:', balance, 'BDT');
        console.log('Critical Threshold:', CRITICAL_THRESHOLD, 'BDT');
        console.log('Low Threshold:', LOW_THRESHOLD, 'BDT');

        // Send notifications based on thresholds
        // Both emails are sent if balance is critically low
        if (balance < CRITICAL_THRESHOLD) {
            console.log(`Balance below ${CRITICAL_THRESHOLD}, sending critical notification...`);
            try {
                await sendEmail(
                    '💀 EMERGENCY: You\'re About to Live in the Stone Age',
                    generateCriticalEmailText(balance, ACCOUNT_NO!, METER_NO!),
                    generateCriticalEmailHtml(balance, ACCOUNT_NO!, METER_NO!)
                );
                console.log('Critical notification sent');
            } catch (emailError) {
                console.error('Failed to send critical notification email:', emailError);
            }
        } else if (balance < LOW_THRESHOLD) {
            console.log(`Balance below ${LOW_THRESHOLD}, sending warning notification...`);
            try {
                await sendEmail(
                    '🚨 Yo, Your Electricity About to Ghost You!',
                    generateWarningEmailText(balance, ACCOUNT_NO!, METER_NO!),
                    generateWarningEmailHtml(balance, ACCOUNT_NO!, METER_NO!)
                );
                console.log('Warning notification sent');
            } catch (emailError) {
                console.error('Failed to send warning notification email:', emailError);
            }
        }

        console.log('Balance check completed successfully');
    } catch (error) {
        console.error('Error checking balance:', error);
        process.exit(1);
    }
}

checkBalance().then(() => {
});
