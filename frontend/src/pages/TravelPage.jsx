import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import PageShell from '../components/PageShell'
import Ico from '../components/Icon'
import { useIsMobile } from '../hooks/useIsMobile'
import { useUser } from '../context/UserContext'
import { useT } from '../i18n'
import { t, badge } from '../theme'

const STATUSES = ['PLANNING','BOOKED','COMPLETED','CANCELLED']

const STATUS_BADGE = { PLANNING: badge.amber, BOOKED: badge.blue, COMPLETED: badge.green, CANCELLED: badge.red }

export default function TravelPage() {
  const isMobile = useIsMobile()
  const { fmt } = useUser()
  const { t: tr } = useT()
  const [trips, setTrips]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm]         = useState({ destination: '', departureFrom: '', startDate: '', endDate: '', totalBudget: '' })

  useEffect(() => { loadTrips() }, [])

  async function loadTrips() {
    setLoading(true); setError('')
    try { setTrips(await apiFetch('/api/travel/trips')) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function createTrip(e) {
    e.preventDefault()
    try {
      await apiFetch('/api/travel/trips', { method: 'POST', body: JSON.stringify({ destination: form.destination, departureFrom: form.departureFrom || null, startDate: form.startDate || null, endDate: form.endDate || null, totalBudget: form.totalBudget ? Number(form.totalBudget) : null }) })
      setShowForm(false); setForm({ destination: '', departureFrom: '', startDate: '', endDate: '', totalBudget: '' }); loadTrips()
    } catch (e) { setError(e.message) }
  }

  async function updateStatus(tripId, status) {
    try { await apiFetch(`/api/travel/trips/${tripId}/status?status=${status}`, { method: 'PATCH' }); loadTrips() }
    catch (e) { setError(e.message) }
  }

  async function deleteTrip(tripId) {
    try { await apiFetch(`/api/travel/trips/${tripId}`, { method: 'DELETE' }); loadTrips() }
    catch (e) { setError(e.message) }
  }

  const grouped = STATUSES.reduce((acc, st) => { acc[st] = trips.filter(t => t.status === st); return acc }, {})

  return (
    <PageShell>
      <main style={{ ...s.main, padding: isMobile ? '20px 14px' : '32px' }}>
        <div style={{ ...s.titleRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 12 }}>
          <h1 style={s.title}>{tr('travel.title')}</h1>
          <button style={s.btnPrimary} onClick={() => setShowForm(true)}>{tr('travel.newTripBtn')}</button>
        </div>

        {error && <p style={s.error}>{error}</p>}

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {STATUSES.map(status => (
            <div key={status} style={{ ...s.statCard, background: STATUS_BADGE[status].bg }}>
              <span style={{ color: STATUS_BADGE[status].color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr('tstatus.' + status)}</span>
              <span style={{ color: STATUS_BADGE[status].color, fontSize: 28, fontWeight: 700 }}>{grouped[status].length}</span>
            </div>
          ))}
        </div>

        {/* New trip form */}
        {showForm && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>{tr('travel.newTrip')}</h3>
            <form onSubmit={createTrip}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={s.label}>{tr('travel.destination')}</label>
                  <input style={s.input} placeholder={tr('travel.destinationPlaceholder')} required value={form.destination}
                    onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
                </div>
                <div>
                  <label style={s.label}>{tr('travel.departureFrom')}</label>
                  <input style={s.input} placeholder={tr('travel.departurePlaceholder')} value={form.departureFrom}
                    onChange={e => setForm(f => ({ ...f, departureFrom: e.target.value }))} />
                </div>
                <div>
                  <label style={s.label}>{tr('travel.startDate')}</label>
                  <input style={s.input} type="date" value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label style={s.label}>{tr('travel.endDate')}</label>
                  <input style={s.input} type="date" value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
                <div>
                  <label style={s.label}>{tr('travel.totalBudget')}</label>
                  <input style={s.input} type="number" placeholder="0.00" min="0" step="0.01"
                    value={form.totalBudget} onChange={e => setForm(f => ({ ...f, totalBudget: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={s.btnPrimary}>{tr('travel.createTrip')}</button>
                <button type="button" style={s.btnSecondary} onClick={() => setShowForm(false)}>{tr('common.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        {loading && <p style={s.muted}>{tr('common.loading')}</p>}
        {!loading && trips.length === 0 && <div style={s.empty}>{tr('travel.empty')}</div>}

        {STATUSES.map(status => {
          const statusTrips = grouped[status]
          if (!statusTrips.length) return null
          return (
            <div key={status}>
              <div style={{ ...s.sectionLabel, ...STATUS_BADGE[status] }}>{tr('tstatus.' + status)}</div>
              {statusTrips.map(trip => (
                <div key={trip.id} style={s.card}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: t.navy, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {trip.destination}
                      </h2>
                      {trip.departureFrom && <p style={s.muted}>{tr('travel.from')} {trip.departureFrom}</p>}
                      <div style={{ display: 'flex', gap: 7, marginTop: 8, flexWrap: 'wrap' }}>
                        {trip.startDate && <span style={{ ...s.pill, ...badge.grey, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{trip.startDate} <Ico e="→" size={12} /> {trip.endDate || '?'}</span>}
                        {trip.totalBudget && <span style={{ ...s.pill, ...badge.blue }}>{fmt(trip.totalBudget)}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
                      <button style={s.btnTiny} onClick={() => setExpanded(expanded === trip.id ? null : trip.id)}>
                        {expanded === trip.id ? tr('travel.hide') : tr('travel.details')}
                      </button>
                      <button style={s.deleteBtn} onClick={() => deleteTrip(trip.id)}><Ico e="✕" size={13} /></button>
                    </div>
                  </div>

                  {expanded === trip.id && (
                    <div style={{ marginTop: 14, borderTop: `1px solid ${t.borderLight}`, paddingTop: 14 }}>
                      <div style={{ marginBottom: 12 }}>
                        <span style={{ fontSize: 12, color: t.navyLight, fontWeight: 600, marginRight: 8 }}>{tr('travel.changeStatus')}</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          {STATUSES.filter(st => st !== status).map(st => (
                            <button key={st} style={s.btnTiny} onClick={() => updateStatus(trip.id, st)}>{tr('tstatus.' + st)}</button>
                          ))}
                        </div>
                      </div>
                      {trip.offers.length > 0 ? (
                        trip.offers.map(offer => (
                          <div key={offer.id} style={{ ...s.lineRow, opacity: offer.selected ? 1 : 0.7 }}>
                            <span style={{ ...s.pill, ...badge.grey, marginRight: 4 }}>{offer.offerType}</span>
                            <span style={{ flex: 1, fontSize: 13, color: t.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{offer.title}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: t.navy, flexShrink: 0 }}>{fmt(offer.price)}</span>
                          </div>
                        ))
                      ) : (
                        <p style={s.muted}>{tr('travel.noOffers')}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </main>
    </PageShell>
  )
}

const s = {
  main:        { maxWidth: 960, width: '100%', margin: '0 auto' },
  titleRow:    { display: 'flex', justifyContent: 'space-between', marginBottom: 20 },
  title:       { fontSize: 24, fontWeight: 700, color: t.navy, margin: 0 },
  sectionLabel:{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '4px 11px', borderRadius: 8, display: 'inline-block', marginBottom: 10, marginTop: 6 },
  card:        { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, marginBottom: 12 },
  cardTitle:   { fontSize: 13, fontWeight: 600, color: t.navyLight, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' },
  label:       { display: 'block', fontSize: 12, color: t.navyLight, fontWeight: 500, marginBottom: 5 },
  input:       { width: '100%', padding: '9px 12px', border: `1.5px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.navy, background: '#fff', outline: 'none', boxSizing: 'border-box' },
  statCard:    { borderRadius: 12, padding: '12px 16px' },
  lineRow:     { display: 'flex', alignItems: 'center', gap: 7, padding: '8px 0', borderBottom: `1px solid ${t.borderLight}` },
  pill:        { fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, flexShrink: 0 },
  deleteBtn:   { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16 },
  btnTiny:     { padding: '4px 10px', border: `1px solid ${t.border}`, borderRadius: 6, background: '#fff', fontSize: 12, color: t.navyLight, cursor: 'pointer' },
  btnPrimary:  { padding: '9px 20px', background: t.navyMid, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:{ padding: '9px 16px', border: `1px solid ${t.border}`, borderRadius: 8, background: '#fff', fontSize: 14, color: t.navyLight, cursor: 'pointer' },
  muted:       { color: t.navyLight, fontSize: 13, margin: 0 },
  error:       { color: '#c0392b', fontSize: 14, marginBottom: 12 },
  empty:       { textAlign: 'center', padding: '56px 0', color: t.navyLight, fontSize: 15 },
}
