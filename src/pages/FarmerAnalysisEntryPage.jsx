import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFarmers } from '../services/farmerService'

export default function FarmerAnalysisEntryPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Finding a farmer profile...')

  useEffect(() => {
    const load = async () => {
      try {
        const farmers = await getFarmers()
        if (Array.isArray(farmers) && farmers.length > 0) {
          navigate(`/farmer/${farmers[0].farmerId}`, { replace: true })
          return
        }
        setMessage('No farmer profiles are available with consent right now.')
      } catch (error) {
        setMessage('Could not load farmer profiles right now.')
      }
    }
    load()
  }, [navigate])

  return (
    <section className="dashboard-page">
      <article className="card">
        <h2>Farmer Analysis</h2>
        <p>{message}</p>
      </article>
    </section>
  )
}
