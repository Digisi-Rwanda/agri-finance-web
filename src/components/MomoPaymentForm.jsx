import { useState } from 'react'
import { requestLoanRepayment } from '../services/momoPaymentService'

const PROVIDERS = [
  { value: 'MTN_MOMO', label: 'MTN MoMo' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
]

export default function MomoPaymentForm({ farmerId, loanId, onPaymentCreated }) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [provider, setProvider] = useState('MTN_MOMO')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const onPay = async (event) => {
    event.preventDefault()
    if (!loanId) {
      setMessage('No active loan available for repayment.')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const payment = await requestLoanRepayment({
        farmerId,
        loanId,
        amount: Number(amount),
        currency: 'RWF',
        phoneNumber,
        provider,
        payerMessage:
          provider === 'AIRTEL_MONEY' ? 'Airtel Money loan repayment' : 'MTN MoMo loan repayment',
        payeeNote: 'AgriFinance',
      })
      setMessage(
        `Payment ${payment.status}${payment.providerReference ? ` · ref ${payment.providerReference}` : ''}`,
      )
      if (onPaymentCreated) {
        onPaymentCreated()
      }
    } catch (error) {
      setMessage(error?.response?.data?.error || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card momo-form-card">
      <h3>Loan repayment (MTN / Airtel)</h3>
      <p className="muted">
        Pay via Paypack — enter a Rwanda mobile number and amount in RWF. Approve the prompt on the phone.
      </p>
      <form onSubmit={onPay} className="momo-form-grid">
        <div className="momo-provider-row" role="group" aria-label="Payment provider">
          {PROVIDERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`momo-provider-btn${provider === option.value ? ' is-active' : ''}${
                option.value === 'AIRTEL_MONEY' ? ' momo-provider-btn--airtel' : ' momo-provider-btn--mtn'
              }`}
              onClick={() => setProvider(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <input
          placeholder="Phone number (078… or +250…)"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
        <input
          placeholder="Amount (RWF)"
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <button type="submit" disabled={loading || !loanId}>
          {loading
            ? 'Processing…'
            : provider === 'AIRTEL_MONEY'
              ? 'Pay with Airtel Money'
              : 'Pay with MTN MoMo'}
        </button>
      </form>
      {message ? <p className="momo-form-message">{message}</p> : null}
    </div>
  )
}
