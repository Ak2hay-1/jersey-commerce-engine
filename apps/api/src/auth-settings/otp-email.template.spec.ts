import { buildOtpEmail, buildOtpSmsText } from './otp-email.template';

describe('buildOtpEmail', () => {
  it('builds branded OTP content with formatted code', () => {
    const content = buildOtpEmail({
      storeName: 'Jerzyfy',
      code: '123456',
      expiresInMinutes: 5,
    });

    expect(content.subject).toBe('Jerzyfy — Your sign-in code');
    expect(content.text).toContain('123 456');
    expect(content.text).toContain('5 minutes');
    expect(content.html).toContain('123 456');
    expect(content.html).toContain('Jerzyfy');
    expect(content.html).toContain('Your sign-in code');
  });

  it('escapes HTML in store names', () => {
    const content = buildOtpEmail({
      storeName: '<script>alert(1)</script>',
      code: '654321',
      expiresInMinutes: 1,
    });

    expect(content.html).not.toContain('<script>');
    expect(content.html).toContain('&lt;script&gt;');
  });

  it('marks preview emails clearly', () => {
    const content = buildOtpEmail({
      storeName: 'Jerzyfy',
      code: '111111',
      expiresInMinutes: 5,
      preview: true,
    });

    expect(content.subject).toContain('Test sign-in email');
    expect(content.text).toContain('This is a test message');
    expect(content.html).toContain('This is a test message');
  });
});

describe('buildOtpSmsText', () => {
  it('builds a concise SMS body', () => {
    expect(
      buildOtpSmsText({
        storeName: 'Jerzyfy',
        code: '987654',
        expiresInMinutes: 5,
      }),
    ).toBe('Jerzyfy: your sign-in code is 987 654. Expires in 5 min.');
  });
});
