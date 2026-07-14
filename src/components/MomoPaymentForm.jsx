import { useState } from 'react'
import {
  requestLoanRepayment,
} from '../services/momoPaymentService'

export default function MomoPaymentForm({ farmerId, loanId, onPaymentCreated }) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [amount, setAmount] = useState('')
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
        payerMessage: 'Loan repayment',
        payeeNote: 'AgriFinance',
      })
      setMessage(`Payment initiated: ${payment.status} (${payment.externalId})`)
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
      <h3>MTN MoMo Loan Repayment</h3>
      <p className="muted">Enter a phone number and repayment amount in RWF to trigger the MoMo prompt.</p>
      <form onSubmit={onPay} className="momo-form-grid">
        <input
          placeholder="Phone number (+250...)"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
        <input
          placeholder="Amount"
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <button type="submit" disabled={loading || !loanId}>
          {loading ? 'Processing...' : 'Pay with MTN MoMo'}
        </button>
      </form>
      {message ? <p className="momo-form-message">{message}</p> : null}
    </div>
  )
}
