import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Settings, User, Lock, Bell, Eye, Trash2, LogOut, Check } from 'lucide-react'

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  notifications_enabled: boolean
  email_notifications: boolean
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light',
    language: 'en',
    notifications_enabled: true,
    email_notifications: false,
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Mock user profile data
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () =>
      Promise.resolve({
        data: {
          username: 'puneet.sharma',
          email: 'puneet.sharma@example.com',
          role: 'LINEAGE_ADMIN',
          created_date: '2026-01-15',
          last_login: '2026-05-18T10:30:00Z',
          avatar_initials: 'PS',
        },
      }),
  })

  const user = profile?.data

  const handleSavePreferences = async () => {
    setIsSaving(true)
    setSaveStatus('idle')
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
  ]

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Settings size={20} color="var(--color-primary)" />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Settings</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
          Manage your account settings and preferences
        </p>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
        {/* Sidebar Navigation */}
        <div className="section-card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    border: 'none',
                    background: activeTab === tab.id ? 'var(--color-bg)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-muted)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: activeTab === tab.id ? 600 : 500,
                    transition: 'all 150ms',
                    borderLeft: activeTab === tab.id ? '3px solid var(--color-primary)' : '3px solid transparent',
                    paddingLeft: '11px',
                  }}
                  onMouseEnter={e => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = 'rgba(18,103,232,0.05)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="section-card">
              <div className="section-card-header">
                <span className="section-card-title">User Profile</span>
              </div>
              <div style={{ padding: 20 }}>
                {user && (
                  <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {user.avatar_initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                          Username
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
                          {user.username}
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                          Email
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--color-text)' }}>
                          {user.email}
                        </div>
                      </div>
                      <div style={{ marginBottom: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                          Role
                        </div>
                        <span className="badge badge-blue">{user.role}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                        Member Since
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-text)' }}>
                        {user ? new Date(user.created_date).toLocaleDateString() : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                        Last Login
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-text)' }}>
                        {user ? new Date(user.last_login).toLocaleString() : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary">
                    <Eye size={14} /> Edit Profile
                  </button>
                  <button className="btn btn-secondary">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="section-card">
              <div className="section-card-header">
                <span className="section-card-title">Appearance & Language</span>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
                    Theme
                  </label>
                  <select
                    className="input"
                    value={preferences.theme}
                    onChange={e => setPreferences({ ...preferences, theme: e.target.value as any })}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark (Coming Soon)</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                  <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 6 }}>
                    Choose your preferred color theme
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
                    Language
                  </label>
                  <select
                    className="input"
                    value={preferences.language}
                    onChange={e => setPreferences({ ...preferences, language: e.target.value })}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                  <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 6 }}>
                    Select your preferred language
                  </p>
                </div>

                <div style={{ paddingTop: 20, borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleSavePreferences}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                  {saveStatus === 'success' && (
                    <span style={{ fontSize: 13, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Check size={14} /> Saved successfully
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="section-card">
              <div className="section-card-header">
                <span className="section-card-title">Notification Settings</span>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                        In-App Notifications
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                        Get notified about important changes
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.notifications_enabled}
                      onChange={e => setPreferences({ ...preferences, notifications_enabled: e.target.checked })}
                      style={{ width: 20, height: 20, cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ borderBottom: '1px solid var(--color-border-light)' }} />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                        Email Notifications
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                        Receive email updates
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.email_notifications}
                      onChange={e => setPreferences({ ...preferences, email_notifications: e.target.checked })}
                      style={{ width: 20, height: 20, cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ borderBottom: '1px solid var(--color-border-light)' }} />
                </div>

                <div style={{ paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
                  <button className="btn btn-primary" onClick={handleSavePreferences} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="section-card">
              <div className="section-card-header">
                <span className="section-card-title">Security & Account</span>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>
                    Password
                  </div>
                  <button className="btn btn-secondary">
                    <Lock size={14} /> Change Password
                  </button>
                  <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 6 }}>
                    Update your password regularly for security
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20, marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>
                    Active Sessions
                  </div>
                  <div style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>
                      Current Session
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                      Chrome on macOS • Last active: now
                    </div>
                  </div>
                  <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                    <LogOut size={14} /> Sign Out All Other Sessions
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger)', marginBottom: 12 }}>
                    Danger Zone
                  </div>
                  <button
                    className="btn"
                    onClick={() => setShowDeleteModal(true)}
                    style={{
                      background: 'var(--color-danger)',
                      color: '#fff',
                      border: 'none',
                    }}
                  >
                    <Trash2 size={14} /> Delete Account
                  </button>
                  <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 6 }}>
                    Permanently delete your account and all associated data
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Account?</h2>
              <button className="close-btn" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ color: 'var(--color-text)', marginBottom: 16 }}>
                <p style={{ marginBottom: 12 }}>
                  Are you sure you want to delete your account? This action cannot be undone.
                </p>
                <ul style={{ marginLeft: 20, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <li>All your data will be permanently deleted</li>
                  <li>You will lose access to all lineage data</li>
                  <li>This cannot be reversed</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" style={{ background: 'var(--color-danger)' }}>
                Yes, Delete Account
              </button>
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
