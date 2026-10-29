import { afterEach, describe, expect, it, vi } from 'vitest';

import { updateVerificationLocation } from './update-verification-location';

const verificationId = 'b9328943-c189-499a-8fbf-64c37c8c2a59';
const resendAvailableAt = '2026-10-29T12:01:00.000Z';

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('updateVerificationLocation', () => {
  it('updates the waiting time while preserving the locale, other query values and hash', () => {
    window.history.replaceState(
      null,
      '',
      `/es/verify-email?verificationId=${verificationId}&source=login#code`,
    );
    const replaceState = vi.spyOn(window.history, 'replaceState');

    updateVerificationLocation({ verificationId, resendAvailableAt });

    const url = new URL(window.location.href);
    expect(url.pathname).toBe('/es/verify-email');
    expect(url.searchParams.get('verificationId')).toBe(verificationId);
    expect(url.searchParams.get('resendAvailableAt')).toBe(resendAvailableAt);
    expect(url.searchParams.get('source')).toBe('login');
    expect(url.hash).toBe('#code');
    expect(replaceState).toHaveBeenCalledExactlyOnceWith(
      null,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  });

  it('records an unconfirmed email delivery', () => {
    window.history.replaceState(
      null,
      '',
      `/es/verify-email?verificationId=${verificationId}`,
    );

    updateVerificationLocation({
      verificationId,
      resendAvailableAt,
      deliveryUnconfirmed: true,
    });

    expect(new URL(window.location.href).searchParams.get('delivery')).toBe(
      'unconfirmed',
    );
  });

  it('removes the delivery warning after a confirmed submission', () => {
    window.history.replaceState(
      null,
      '',
      `/es/verify-email?verificationId=${verificationId}&delivery=unconfirmed`,
    );

    updateVerificationLocation({
      verificationId,
      resendAvailableAt,
      deliveryUnconfirmed: false,
    });

    expect(new URL(window.location.href).searchParams.has('delivery')).toBe(false);
  });

  it('keeps the current delivery status when only the waiting time changes', () => {
    window.history.replaceState(
      null,
      '',
      `/es/verify-email?verificationId=${verificationId}&delivery=unconfirmed`,
    );

    updateVerificationLocation({ verificationId, resendAvailableAt });

    expect(new URL(window.location.href).searchParams.get('delivery')).toBe(
      'unconfirmed',
    );
  });

  it.each([
    '/es/login',
    '/es/verify-email?verificationId=another-verification',
  ])('does not change the URL after leaving this verification: %s', (path) => {
    window.history.replaceState(null, '', path);
    const replaceState = vi.spyOn(window.history, 'replaceState');

    updateVerificationLocation({ verificationId, resendAvailableAt });

    expect(replaceState).not.toHaveBeenCalled();
    expect(`${window.location.pathname}${window.location.search}`).toBe(path);
  });
});
