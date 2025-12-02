import fetch from 'node-fetch';
import nodemailer from 'nodemailer';

jest.mock('dotenv/config', () => ({}));
jest.mock('node-fetch');
jest.mock('nodemailer');

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockCreateTransport = nodemailer.createTransport as jest.MockedFunction<typeof nodemailer.createTransport>;

// Helper to create mock API response
function createApiResponse(balance: number) {
    return {
        code: 200,
        desc: 'OK',
        data: {
            accountNo: '13151091',
            meterNo: '661120227647',
            balance: balance,
            currentMonthConsumption: 43.1,
            readingTime: '2025-12-03 00:00:00'
        }
    };
}

describe('DESCO Balance Checker', () => {
    let mockSendMail: jest.Mock;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let processExitSpy: jest.SpyInstance;

    beforeEach(() => {
        mockSendMail = jest.fn().mockResolvedValue({});
        mockCreateTransport.mockReturnValue({
            sendMail: mockSendMail,
        } as any);

        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
            return undefined as never;
        });

        // Set all required environment variables
        process.env.DESCO_ACCOUNT_NO = '13151091';
        process.env.DESCO_METER_NO = '661120227647';
        process.env.EMAIL_TO = 'test@example.com';
        process.env.EMAIL_FROM = 'from@example.com';
        process.env.SMTP_HOST = 'smtp.test.com';
        process.env.SMTP_PORT = '587';
        process.env.SMTP_USER = 'user@test.com';
        process.env.SMTP_PASS = 'password';
        delete process.env.LOW_THRESHOLD;
        delete process.env.CRITICAL_THRESHOLD;

        jest.clearAllMocks();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
    });

    describe('checkBalance', () => {
        it('should not send email when balance is above 150', async () => {
            mockFetch.mockResolvedValue({
                json: async () => createApiResponse(200),
            } as any);

            jest.isolateModules(() => {
                require('./check-balance');
            });
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockSendMail).not.toHaveBeenCalled();
        });

        it('should send one email when balance is below 150 but above 100', async () => {
            mockFetch.mockResolvedValue({
                json: async () => createApiResponse(120),
            } as any);

            jest.isolateModules(() => {
                require('./check-balance');
            });
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockSendMail).toHaveBeenCalledTimes(1);
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: expect.stringContaining('Electricity About to Ghost You'),
                })
            );
        });

        it('should send two emails when balance is below 100 (both critical and warning)', async () => {
            mockFetch.mockResolvedValue({
                json: async () => createApiResponse(50),
            } as any);

            jest.isolateModules(() => {
                require('./check-balance');
            });
            await new Promise(resolve => setTimeout(resolve, 100));

            // Now sends both emails: critical (< 100) AND warning (< 150)
            expect(mockSendMail).toHaveBeenCalledTimes(2);
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: expect.stringContaining('Stone Age'),
                })
            );
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: expect.stringContaining('Electricity About to Ghost You'),
                })
            );
        });

        it('should handle API errors gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('API Error'));

            jest.isolateModules(() => {
                require('./check-balance');
            });
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error checking balance:',
                expect.any(Error)
            );
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should throw error when API returns invalid response', async () => {
            mockFetch.mockResolvedValue({
                json: async () => ({invalid: 'response'}),
            } as any);

            jest.isolateModules(() => {
                require('./check-balance');
            });
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error checking balance:',
                expect.objectContaining({
                    message: expect.stringContaining('Invalid API response'),
                })
            );
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should throw error when API returns non-200 code', async () => {
            mockFetch.mockResolvedValue({
                json: async () => ({
                    code: 500,
                    desc: 'Internal Server Error',
                    data: null
                }),
            } as any);

            jest.isolateModules(() => {
                require('./check-balance');
            });
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error checking balance:',
                expect.objectContaining({
                    message: expect.stringContaining('Invalid API response'),
                })
            );
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });
    });

    describe('Environment validation', () => {
        it('should throw error when required env vars are missing', async () => {
            delete process.env.DESCO_ACCOUNT_NO;
            delete process.env.EMAIL_TO;

            jest.isolateModules(() => {
                require('./check-balance');
            });
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error checking balance:',
                expect.objectContaining({
                    message: expect.stringContaining('Missing required environment variables'),
                })
            );
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });
    });

    describe('sendEmail', () => {
        it('should configure SMTP transport correctly', async () => {
            mockFetch.mockResolvedValue({
                json: async () => createApiResponse(120),
            } as any);

            jest.isolateModules(() => {
                require('./check-balance');
            });
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockCreateTransport).toHaveBeenCalledWith({
                host: 'smtp.test.com',
                port: 587,
                secure: false,
                auth: {
                    user: 'user@test.com',
                    pass: 'password',
                },
            });
        });

        it('should use secure connection for port 465', async () => {
            process.env.SMTP_PORT = '465';
            mockFetch.mockResolvedValue({
                json: async () => createApiResponse(120),
            } as any);

            jest.isolateModules(() => {
                require('./check-balance');
            });
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockCreateTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    secure: true,
                })
            );
        });

        it('should send email with correct from, to, and html content', async () => {
            mockFetch.mockResolvedValue({
                json: async () => createApiResponse(120),
            } as any);

            jest.isolateModules(() => {
                require('./check-balance');
            });
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'from@example.com',
                    to: 'test@example.com',
                    html: expect.stringContaining('<!DOCTYPE html>'),
                    text: expect.any(String),
                })
            );
        });

        it('should continue execution if email sending fails', async () => {
            mockSendMail.mockRejectedValue(new Error('SMTP Error'));
            mockFetch.mockResolvedValue({
                json: async () => createApiResponse(80),
            } as any);

            jest.isolateModules(() => {
                require('./check-balance');
            });
            await new Promise(resolve => setTimeout(resolve, 150));

            // Should log the email error but not exit
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to send'),
                expect.any(Error)
            );
            // Balance check should complete successfully
            expect(consoleLogSpy).toHaveBeenCalledWith('Balance check completed successfully');
        });
    });

    describe('Configurable thresholds', () => {
        it('should use custom thresholds from environment', async () => {
            process.env.LOW_THRESHOLD = '200';
            process.env.CRITICAL_THRESHOLD = '150';

            mockFetch.mockResolvedValue({
                json: async () => createApiResponse(160),
            } as any);

            jest.isolateModules(() => {
                require('./check-balance');
            });
            await new Promise(resolve => setTimeout(resolve, 100));

            // 160 is below 200 (low) but above 150 (critical), so only 1 email
            expect(mockSendMail).toHaveBeenCalledTimes(1);
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: expect.stringContaining('Electricity About to Ghost You'),
                })
            );
        });
    });
});
