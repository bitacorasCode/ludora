type VerificationLocationUpdate = {
  verificationId: string;
  resendAvailableAt: string;
  deliveryUnconfirmed?: boolean;
};

export function updateVerificationLocation({
  verificationId,
  resendAvailableAt,
  deliveryUnconfirmed,
}: VerificationLocationUpdate) {
  const url = new URL(window.location.href);

  if (url.searchParams.get('verificationId') !== verificationId) return;

  url.searchParams.set('resendAvailableAt', resendAvailableAt);

  if (deliveryUnconfirmed === true) {
    url.searchParams.set('delivery', 'unconfirmed');
  } else if (deliveryUnconfirmed === false) {
    url.searchParams.delete('delivery');
  }

  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}
