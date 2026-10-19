import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import type { PendingProfileChange } from '../../../types'

const fieldLabels: Record<string, string> = {
  phoneNumber: 'Primary Contact Number',
  altPhoneNumber: 'Alternative Contact Number',
  maritalStatus: 'Marital Status',
  email: 'Email Address',
  workBranch: 'Work Branch / Station',
  jobTitle: 'Job Role / Department',
  county: 'County',
  subCounty: 'Sub-County',
  location: 'Location / Town',
  bankName: 'Primary Bank Name',
  bankBranch: 'Primary Bank Branch',
  bankAccountName: 'Primary Bank Account Name',
  bankAccountNumber: 'Primary Bank Account Number',
  bankTwoName: 'Second Bank Name',
  bankTwoBranch: 'Second Bank Branch',
  bankTwoAccountName: 'Second Bank Account Name',
  bankTwoAccountNumber: 'Second Bank Account Number',
  nextKinName: 'Next of Kin Full Name',
  nextKinRelationship: 'Next of Kin Relationship',
  nextKinPhone: 'Next of Kin Phone Number',
}

interface AdminAuthorizationsViewProps {
  onRefresh: () => Promise<void>
}

export function AdminAuthorizationsView({ onRefresh }: AdminAuthorizationsViewProps) {
  const [changes, setChanges] = useState<PendingProfileChange[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadChanges() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/profile-changes')
      if (res.ok) {
        const data = await res.json() as { changes: PendingProfileChange[] }
        setChanges(data.changes ?? [])
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadChanges()
  }, [])

  function toggleExpandCard(id: number) {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleApprove(id: number) {
    setWorkingId(id)
    setMessage('')
    setError('')
    try {
      const res = await fetch(`/api/admin/profile-changes/${id}/approve`, { method: 'POST' })
      const data = await res.json() as { message?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to authorize profile change.')
      setMessage(data.message ?? 'Profile change authorized and applied successfully.')
      await loadChanges()
      await onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to authorize changes.')
    } finally {
      setWorkingId(null)
    }
  }

  async function handleReject(id: number) {
    setWorkingId(id)
    setMessage('')
    setError('')
    try {
      const res = await fetch(`/api/admin/profile-changes/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: rejectNote }),
      })
      const data = await res.json() as { message?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to decline profile change.')
      setMessage(data.message ?? 'Profile change request declined.')
      setRejectingId(null)
      setRejectNote('')
      await loadChanges()
      await onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to decline changes.')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div className="admin-view-panel admin-authorizations-panel">
      <div className="view-intro-header">
        <div>
          <h1 className="view-page-title">
            <ShieldAlert size={24} className="title-icon-accent" />
            Profile Change Authorizations
          </h1>
          <p className="view-page-desc">
            Review and authorize member requests to update banking details, contact numbers, marital status, workplace station, and next of kin.
          </p>
        </div>
        <div className="view-intro-meta">
          <button
            type="button"
            className="table-btn-primary"
            onClick={() => void loadChanges()}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
          <span className="count-pill">
            Awaiting Review: <strong>{changes.length}</strong>
          </span>
        </div>
      </div>

      {message && (
        <div className="admin-banner-alert alert-success" role="status">
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="admin-banner-alert alert-error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="admin-card">
          <p className="admin-empty">Loading pending authorization requests…</p>
        </div>
      ) : changes.length === 0 ? (
        <div className="admin-card authorization-empty-card">
          <div className="auth-empty-icon-circle">
            <ShieldCheck size={36} />
          </div>
          <h2>All Profile Changes Are Up to Date</h2>
          <p>
            There are currently no member account updates awaiting admin authorization.
            When members submit changes to their banking or contact details, they will appear here for your approval.
          </p>
        </div>
      ) : (
        <div className="authorizations-list">
          {changes.map((change) => {
            const diffEntries = Object.entries(change.changes).map(([key, newVal]) => {
              const oldVal = (change.current?.[key] ?? '').trim()
              const val = (newVal ?? '').trim()
              const isChanged = oldVal !== val
              const label = fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
              return { key, label, oldVal, val, isChanged }
            })

            const changedFields = diffEntries.filter((d) => d.isChanged)
            const unchangedFields = diffEntries.filter((d) => !d.isChanged && d.val)
            const isExpanded = Boolean(expandedCards[change.id])

            return (
              <article key={change.id} className="authorization-card">
                <header className="authorization-card-header">
                  <div className="auth-member-info">
                    <div className="auth-avatar">
                      <User size={18} />
                    </div>
                    <div>
                      <h3 className="auth-member-name">{change.memberName}</h3>
                      <div className="auth-meta-row">
                        <span className="badge-id">{change.saccoNumber || 'No SACCO #'}</span>
                        <span className="auth-timestamp">
                          <Clock size={13} />
                          Submitted: {new Date(change.submittedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="auth-header-badges">
                    <span className="auth-changed-badge">
                      <Sparkles size={13} />
                      {changedFields.length} field{changedFields.length === 1 ? '' : 's'} updated
                    </span>
                    <span className="auth-status-pill">
                      Pending Authorization
                    </span>
                  </div>
                </header>

                {/* Specific Changes Section with Before & After Comparison */}
                <div className="auth-specific-changes-container">
                  <div className="auth-diff-summary-bar">
                    <span className="auth-diff-summary-title">
                      <Sparkles size={14} className="accent-icon" /> Specifically Modified Fields
                    </span>
                    <span className="auth-diff-summary-hint">
                      {changedFields.length > 0
                        ? 'Comparison of previous value vs newly submitted value:'
                        : 'No profile fields were altered from current values.'}
                    </span>
                  </div>

                  {changedFields.length > 0 ? (
                    <div className="auth-diff-comparison-list">
                      {changedFields.map(({ key, label, oldVal, val }) => (
                        <div key={key} className="auth-diff-compare-card">
                          <div className="auth-diff-compare-header">
                            <strong className="auth-diff-field-name">{label}</strong>
                            <span className={`auth-diff-type-badge ${oldVal ? 'is-modified' : 'is-new'}`}>
                              {oldVal ? 'MODIFIED' : 'NEW VALUE'}
                            </span>
                          </div>
                          <div className="auth-comparison-row">
                            <div className="auth-val-box is-old">
                              <span className="val-caption">CURRENT (PREVIOUS)</span>
                              <strong className="val-text">{oldVal || '(Not set / Empty)'}</strong>
                            </div>
                            <div className="auth-diff-arrow-wrap" aria-hidden="true">
                              <ArrowRight size={17} className="auth-diff-arrow" />
                            </div>
                            <div className="auth-val-box is-new">
                              <span className="val-caption">SUBMITTED (NEW)</span>
                              <strong className="val-text">{val || '(Cleared)'}</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="auth-no-diffs-note">
                      The member submitted their form without altering any values from their existing profile.
                    </p>
                  )}
                </div>

                {/* Unchanged / Retained Details Toggle */}
                {unchangedFields.length > 0 && (
                  <div className="auth-unchanged-section">
                    <button
                      type="button"
                      className="auth-unchanged-toggle-btn"
                      onClick={() => toggleExpandCard(change.id)}
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      <span>
                        {isExpanded ? 'Hide' : 'View'} retained / unchanged details ({unchangedFields.length})
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="auth-diff-grid is-unchanged-grid">
                        {unchangedFields.map(({ key, label, val }) => (
                          <div key={key} className="auth-diff-item is-retained">
                            <span className="auth-diff-label">{label}</span>
                            <span className="auth-diff-value">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <footer className="authorization-card-footer">
                  {rejectingId === change.id ? (
                    <div className="auth-decline-form">
                      <input
                        type="text"
                        placeholder="Reason for declining this update (optional)"
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        className="auth-decline-input"
                      />
                      <button
                        type="button"
                        className="pending-action-btn is-reject"
                        disabled={workingId === change.id}
                        onClick={() => void handleReject(change.id)}
                      >
                        {workingId === change.id ? 'Declining…' : 'Confirm Decline'}
                      </button>
                      <button
                        type="button"
                        className="pending-action-btn"
                        onClick={() => {
                          setRejectingId(null)
                          setRejectNote('')
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="auth-action-buttons">
                      <button
                        type="button"
                        className="pending-action-btn is-approve auth-btn-lg"
                        disabled={workingId === change.id}
                        onClick={() => void handleApprove(change.id)}
                      >
                        <Check size={16} />
                        <span>{workingId === change.id ? 'Authorizing & Updating…' : 'Authorize & Apply Changes'}</span>
                      </button>
                      <button
                        type="button"
                        className="pending-action-btn is-reject"
                        disabled={workingId === change.id}
                        onClick={() => setRejectingId(change.id)}
                      >
                        <X size={15} />
                        <span>Decline</span>
                      </button>
                    </div>
                  )}
                </footer>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
