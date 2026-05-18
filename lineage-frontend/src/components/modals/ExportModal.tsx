import { useState } from 'react'
import axios from 'axios'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  exportType: 'fields' | 'comparison' | 'impact-analysis'
  title?: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL

const formatOptions = {
  fields: ['csv', 'excel', 'json', 'pdf'],
  comparison: ['excel', 'csv', 'json'],
  'impact-analysis': ['csv', 'excel', 'json', 'pdf'],
}

export default function ExportModal({
  isOpen,
  onClose,
  exportType,
  title = `Export ${exportType}`,
}: ExportModalProps) {
  const [format, setFormat] = useState(formatOptions[exportType]?.[0] || 'csv')
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      const response = await axios.post(
        `${API_BASE}/export/${exportType}`,
        { format },
        { params: { format } }
      )

      if (response.data.success && response.data.data?.export_url) {
        // Trigger file download
        const link = document.createElement('a')
        link.href = response.data.data.export_url
        link.download = `export.${format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        onClose()
      } else {
        setError('Export failed: Invalid response from server')
      }
    } catch (err: any) {
      console.error('Export error:', err)
      setError(err.response?.data?.message || 'Failed to export. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  const availableFormats = formatOptions[exportType] || ['csv', 'excel', 'json']

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="format-select">Export Format</label>
            <select
              id="format-select"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              disabled={isExporting}
            >
              {availableFormats.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt.toUpperCase()}
                </option>
              ))}
            </select>
            <p className="help-text">
              {format === 'csv' && 'CSV format is suitable for spreadsheet applications.'}
              {format === 'excel' && 'Excel format includes formatting and multiple sheets.'}
              {format === 'json' && 'JSON format is suitable for programmatic access.'}
              {format === 'pdf' && 'PDF format is suitable for printing and archiving.'}
            </p>
          </div>

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn-primary"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
