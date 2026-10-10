import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER, resolveClientIp } from './client-ip';

const SECRET = 'x'.repeat(40);

describe('resolveClientIp', () => {
  it('uses request.ip when no proxy secret is configured', () => {
    const ip = resolveClientIp(
      { ip: '10.0.0.1', headers: { [CLIENT_IP_HEADER]: '1.2.3.4', [PROXY_SECRET_HEADER]: SECRET } },
      '',
    );
    expect(ip).toBe('10.0.0.1');
  });

  it('uses the forwarded IP when the proxy secret matches', () => {
    const ip = resolveClientIp(
      { ip: '10.0.0.1', headers: { [CLIENT_IP_HEADER]: '1.2.3.4', [PROXY_SECRET_HEADER]: SECRET } },
      SECRET,
    );
    expect(ip).toBe('1.2.3.4');
  });

  it('ignores the forwarded IP when the secret is wrong or the value is not an IP', () => {
    expect(
      resolveClientIp({ ip: '10.0.0.1', headers: { [CLIENT_IP_HEADER]: '1.2.3.4', [PROXY_SECRET_HEADER]: 'nope' } }, SECRET),
    ).toBe('10.0.0.1');
    expect(
      resolveClientIp({ ip: '10.0.0.1', headers: { [CLIENT_IP_HEADER]: 'evil', [PROXY_SECRET_HEADER]: SECRET } }, SECRET),
    ).toBe('10.0.0.1');
  });
});
