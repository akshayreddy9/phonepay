import { post } from './api';

// Opens the UPI PIN screen; on PIN entry the payment is sent and the result screen shown.
export function startPayment(requestPin, { account, amount, payload, to }) {
  requestPin({
    account,
    amount,
    to,
    submit: (pin) => post('/pay', { ...payload, amount, accountId: account.id, pin }),
  });
}
