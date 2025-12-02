import fetch from 'node-fetch';
import nodemailer from 'nodemailer';

jest.mock('node-fetch');
jest.mock('nodemailer');

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockCreateTransport = nodemailer.createTransport as jest.MockedFunction<typeof nodemailer.createTransport>;

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

        process.env.DESCO_ACCOUNT_NO = '13151091';
        process.env.DESCO_METER_NO = '661120227647';
        process.env.EMAIL_TO = 'test@example.com';
        process.env.EMAIL_FROM = 'from@example.com';
        process.env.SMTP_HOST = 'smtp.test.com';
        process.env.SMTP_PORT = '587';
        process.env.SMTP_USER = 'user@test.com';
        process.env.SMTP_PASS = 'password';

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
                json: async () => ({ balance: 200 }),
            } as any);

            const checkBalance = require('./check-balance');
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockSendMail).not.toHaveBeenCalled();
        });

        it('should send one email when balance is below 150 but above 100', async () => {
            mockFetch.mockResolvedValue({
                json: async () => ({ balance: 120 }),
            } as any);

            try {
                jest.isolateModules(() => {
                    require('./check-balance');
                });
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {}

            expect(mockSendMail).toHaveBeenCalledTimes(1);
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: expect.stringContaining('Electricity About to Ghost You'),
                })
            );
        });

        it('should send two emails when balance is below 100', async () => {
            mockFetch.mockResolvedValue({
                json: async () => ({ balance: 50 }),
            } as any);

            try {
                jest.isolateModules(() => {
                    require('./check-balance');
                });
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {}

            expect(mockSendMail).toHaveBeenCalledTimes(2);
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: expect.stringContaining('Electricity About to Ghost You'),
                })
            );
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: expect.stringContaining('Stone Age'),
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

        it('should use currentBalance field if balance is not present', async () => {
            mockFetch.mockResolvedValue({
                json: async () => ({ currentBalance: 80 }),
            } as any);

            try {
                jest.isolateModules(() => {
                    require('./check-balance');
                });
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {}

            expect(mockSendMail).toHaveBeenCalledTimes(2);
        });
    });

    describe('sendEmail', () => {
        it('should configure SMTP transport correctly', async () => {
            mockFetch.mockResolvedValue({
                json: async () => ({ balance: 120 }),
            } as any);

            try {
                jest.isolateModules(() => {
                    require('./check-balance');
                });
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {}

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
                json: async () => ({ balance: 120 }),
            } as any);

            try {
                jest.isolateModules(() => {
                    require('./check-balance');
                });
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {}

            expect(mockCreateTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    secure: true,
                })
            );
        });

        it('should send email with correct from and to addresses', async () => {
            mockFetch.mockResolvedValue({
                json: async () => ({ balance: 120 }),
            } as any);

            try {
                jest.isolateModules(() => {
                    require('./check-balance');
                });
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {}

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'from@example.com',
                    to: 'test@example.com',
                })
            );
        });
    });
});
