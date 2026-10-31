import {
  EMAIL_VERIFICATION_DELIVERY,
  EMAIL_VERIFICATION_QUERY_PARAMS,
} from '../config';

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

  if (url.searchParams.get(EMAIL_VERIFICATION_QUERY_PARAMS.verificationId) !== verificationId) return;

  url.searchParams.set(EMAIL_VERIFICATION_QUERY_PARAMS.resendAvailableAt, resendAvailableAt);

  if (deliveryUnconfirmed === true) {
    url.searchParams.set(EMAIL_VERIFICATION_QUERY_PARAMS.delivery, EMAIL_VERIFICATION_DELIVERY.unconfirmed);
  } else if (deliveryUnconfirmed === false) {
    url.searchParams.delete(EMAIL_VERIFICATION_QUERY_PARAMS.delivery);
  }

  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}
