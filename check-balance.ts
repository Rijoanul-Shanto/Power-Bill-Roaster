import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import https from 'https';

const ACCOUNT_NO = process.env.DESCO_ACCOUNT_NO || '13151091';
const METER_NO = process.env.DESCO_METER_NO || '661120227647';
const EMAIL_TO = process.env.EMAIL_TO;
const EMAIL_FROM = process.env.EMAIL_FROM;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || '587';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

interface BalanceResponse {
    balance?: number;
    currentBalance?: number;
}

async function sendEmail(subject: string, text: string): Promise<void> {
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
    });
}

async function checkBalance(): Promise<void> {
    try {
        console.log('Checking balance for account:', ACCOUNT_NO);

        const apiUrl = `https://prepaid.desco.org.bd/api/tkdes/customer/getBalance?accountNo=${ACCOUNT_NO}&meterNo=${METER_NO}`;

        const agent = new https.Agent({
            rejectUnauthorized: false
        });

        const response = await fetch(apiUrl, { agent });
        const data = await response.json() as BalanceResponse;

        const balance = parseFloat(String(data.balance || data.currentBalance || 0));
        console.log('Current balance:', balance);

        if (balance < 150) {
            console.log('Balance below 150, sending notification...');
            await sendEmail(
                '🚨 Yo, Your Electricity About to Ghost You!',
                `Bruh, wake up! Your DESCO balance is at ${balance} BDT. That's BROKE energy right there.\n\nAccount: ${ACCOUNT_NO}\nMeter: ${METER_NO}\nCurrent Balance: ${balance} BDT\n\nYou really gonna let your lights go dark like your future? Recharge NOW before you're sitting in the dark like a caveman contemplating your poor life choices.\n\nGet your act together. Seriously.`
            );
            console.log('Notification sent for 150 threshold');
        }

        if (balance < 100) {
            console.log('Balance below 100, sending notification...');
            await sendEmail(
                '💀 EMERGENCY: You\'re About to Live in the Stone Age',
                `THIS IS NOT A DRILL!\n\nYour balance is ${balance} BDT. That's like, TWO digits. Do you even know how numbers work?\n\nAccount: ${ACCOUNT_NO}\nMeter: ${METER_NO}\nCurrent Balance: ${balance} BDT (YIKES)\n\nDESCO is about to cut your power and you'll be out here charging your phone at McDonald's like it's 2005. Is that the life you want? Living off their WiFi, pretending to order fries?\n\nRECHARGE RIGHT NOW or accept your fate as someone who literally can't keep the lights on. Your call, but make it quick before you can't even read this email.\n\nP.S. - Your neighbors are judging you. Just saying.`
            );
            console.log('Notification sent for 100 threshold');
        }

        console.log('Balance check completed successfully');
    } catch (error) {
        console.error('Error checking balance:', error);
        process.exit(1);
    }
}

checkBalance().then(r => r);
