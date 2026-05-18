import React from 'react'
import { ChevronRight } from 'lucide-react'

interface PipelineStage {
  type: 'field' | 'xslt' | 'java' | 'downstream'
  label: string
  count?: number
  items?: string[]
  color: string
  bgColor: string
  textColor: string
}

interface LineagePipelineProps {
  field: any
  xsltVariables?: string[]
  javaMethods?: string[]
  downstreamSystems?: string[]
}

const STAGE_COLORS = {
  field: { color: '#1267e8', bg: '#dbeafe', text: '#0c4a8c' },
  xslt: { color: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
  java: { color: '#8b5cf6', bg: '#ede9fe', text: '#5b21b6' },
  downstream: { color: '#06b6d4', bg: '#cffafe', text: '#164e63' },
}

export function LineagePipeline({
  field,
  xsltVariables = [],
  javaMethods = [],
  downstreamSystems = [],
}: LineagePipelineProps) {
  const stages: PipelineStage[] = [
    {
      type: 'field',
      label: field?.internal_field_name || 'Field',
      count: 1,
      color: STAGE_COLORS.field.color,
      bgColor: STAGE_COLORS.field.bg,
      textColor: STAGE_COLORS.field.text,
    },
    ...(xsltVariables && xsltVariables.length > 0
      ? [
          {
            type: 'xslt' as const,
            label: 'XSLT Variables',
            count: xsltVariables.length,
            items: xsltVariables,
            color: STAGE_COLORS.xslt.color,
            bgColor: STAGE_COLORS.xslt.bg,
            textColor: STAGE_COLORS.xslt.text,
          },
        ]
      : []),
    ...(javaMethods && javaMethods.length > 0
      ? [
          {
            type: 'java' as const,
            label: 'Java Methods',
            count: javaMethods.length,
            items: javaMethods,
            color: STAGE_COLORS.java.color,
            bgColor: STAGE_COLORS.java.bg,
            textColor: STAGE_COLORS.java.text,
          },
        ]
      : []),
    ...(downstreamSystems && downstreamSystems.length > 0
      ? [
          {
            type: 'downstream' as const,
            label: 'Downstream Systems',
            count: downstreamSystems.length,
            items: downstreamSystems,
            color: STAGE_COLORS.downstream.color,
            bgColor: STAGE_COLORS.downstream.bg,
            textColor: STAGE_COLORS.downstream.text,
          },
        ]
      : []),
  ]

  if (stages.length === 1) {
    return (
      <div
        style={{
          padding: '24px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          textAlign: 'center',
          color: 'var(--color-muted)',
          fontSize: '13px',
        }}
      >
        No transformations configured for this field
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '24px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          minWidth: 'min-content',
        }}
      >
        {stages.map((stage, idx) => (
          <React.Fragment key={`${stage.type}-${idx}`}>
            {/* Stage Box */}
            <div
              style={{
                flex: '0 0 auto',
                minWidth: '140px',
                background: stage.bgColor,
                border: `2px solid ${stage.color}`,
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: stage.color,
                }}
              >
                {stage.type === 'field' ? 'Source' : stage.label}
              </div>

              {stage.type === 'field' ? (
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: stage.textColor,
                    wordBreak: 'break-word',
                  }}
                >
                  {stage.label}
                </div>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: stage.textColor,
                    }}
                  >
                    {stage.count}
                  </div>
                  {stage.items && stage.items.length > 0 && (
                    <div
                      style={{
                        fontSize: '10px',
                        color: stage.textColor,
                        opacity: 0.7,
                      }}
                    >
                      {stage.items[0]}
                      {stage.items.length > 1 && (
                        <>
                          <br />
                          <em>+{stage.items.length - 1} more</em>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Arrow (between stages) */}
            {idx < stages.length - 1 && (
              <div
                style={{
                  flex: '0 0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '80px',
                  color: 'var(--color-border)',
                }}
              >
                <ChevronRight size={20} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Hover tooltip hint */}
      <div
        style={{
          marginTop: '12px',
          fontSize: '11px',
          color: 'var(--color-muted)',
          fontStyle: 'italic',
        }}
      >
        Hover over boxes to see details
      </div>
    </div>
  )
}
