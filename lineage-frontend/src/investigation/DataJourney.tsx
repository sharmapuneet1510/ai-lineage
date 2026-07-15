import type { JourneyStage } from './types'
import { TrustLabel, EvidenceCite } from './ui'
import {
  Database, GitBranch, Wand2, LifeBuoy, Layers, Repeat, CheckCircle2,
} from 'lucide-react'

const ICON = {
  source: Database, condition: GitBranch, transform: Wand2, fallback: LifeBuoy,
  intermediate: Layers, xslt: Repeat, output: CheckCircle2,
} as const

export function DataJourney({ stages, onCite }: { stages: JourneyStage[]; onCite: (id: string) => void }) {
  return (
    <div className="journey">
      {stages.map((s) => {
        const Icon = ICON[s.kind]
        return (
          <div key={s.id} className={`jstage kind-${s.kind}`}>
            <div className="jstage__rail">
              <div className="jstage__dot"><Icon size={16} /></div>
              <div className="jstage__line" />
            </div>
            <div className="jstage__body">
              <div className="jstage__title">
                {s.title}
                <span className="eyebrow">{s.kind}</span>
                <TrustLabel p={s.detail.provenance} short />
              </div>
              <div className="jstage__detail">
                {s.detail.text}
                <EvidenceCite ids={s.evidenceIds} onOpen={onCite} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
