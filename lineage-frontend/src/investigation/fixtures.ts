import type {
  Field, FieldSummary, Evidence, DecisionNode, JourneyStage,
  Attributed, Feedback, ReviewEvent,
} from './types'

// A generic order-processing pipeline. No regulatory / project-specific concepts.
// Fields flow: Java domain model -> XSLT mapping -> XSD-validated XML -> downstream report.

const now = Date.parse('2026-07-13T09:00:00Z')
const iso = (msAgo: number) => new Date(now - msAgo).toISOString()
const DAY = 86_400_000
const HOUR = 3_600_000

function a(text: string, provenance: Attributed['provenance'], evidenceIds?: string[]): Attributed {
  return { text, provenance, evidenceIds }
}

// ---------------------------------------------------------------------------
// Flagship field: Effective Unit Price — rich conditional logic + fallbacks.
// ---------------------------------------------------------------------------

const epEvidence: Evidence[] = [
  {
    id: 'ev-ep-1', kind: 'java', module: 'pricing-core',
    file: 'src/main/java/com/acme/pricing/PriceResolver.java',
    symbol: 'PriceResolver.resolveEffectiveUnitPrice',
    lineStart: 42, lineEnd: 76, sourceHash: 'a1b2c3',
    language: 'java', caption: 'Effective unit price resolution with tier + promo logic',
    snippet: `public Money resolveEffectiveUnitPrice(LineItem item, Customer c) {
  Money base = item.getListPrice();                 // source
  if (c.tier() == Tier.PARTNER) {
    return applyPartnerContract(item, c);           // branch 1
  }
  Money price = base;
  if (item.hasActivePromotion()) {
    price = promoEngine.apply(base, item.promo());  // branch 2: promo
  } else if (c.tier() == Tier.PREMIUM) {
    price = base.multiply(0.90);                    // branch 3: 10% premium discount
  }
  if (price == null || price.isNegative()) {
    price = base;                                   // fallback: never below list
  }
  return price.round(RoundingMode.HALF_UP, 2);
}`,
  },
  {
    id: 'ev-ep-2', kind: 'java', module: 'pricing-core',
    file: 'src/main/java/com/acme/pricing/PromoEngine.java',
    symbol: 'PromoEngine.apply', lineStart: 18, lineEnd: 33, sourceHash: 'd4e5f6',
    language: 'java', caption: 'Promotion application (percentage or absolute)',
    snippet: `Money apply(Money base, Promotion p) {
  return switch (p.kind()) {
    case PERCENT -> base.multiply(1 - p.rate());
    case ABSOLUTE -> base.minus(p.amount());
    case NONE -> base;
  };
}`,
  },
  {
    id: 'ev-ep-3', kind: 'xslt', module: 'report-mapping',
    file: 'mappings/order-line.xsl', symbol: 'template match="line-item"',
    lineStart: 55, lineEnd: 71, sourceHash: '778899',
    language: 'xsl', caption: 'XSLT maps resolved price into report XML',
    snippet: `<xsl:template match="line-item">
  <UnitPrice currency="{@currency}">
    <xsl:variable name="p" select="effective-price" />
    <xsl:value-of select="format-number($p, '0.00')" />
  </UnitPrice>
</xsl:template>`,
  },
  {
    id: 'ev-ep-4', kind: 'xsd', module: 'report-schema',
    file: 'schema/order-report.xsd', symbol: 'UnitPrice',
    lineStart: 120, lineEnd: 126, sourceHash: 'aabbcc',
    language: 'xsd', caption: 'Schema constraint: non-negative decimal, 2 dp',
    snippet: `<xs:element name="UnitPrice">
  <xs:complexType>
    <xs:simpleContent>
      <xs:extension base="xs:decimal">
        <xs:attribute name="currency" type="xs:string" use="required"/>
      </xs:extension>
    </xs:simpleContent>
  </xs:complexType>
</xs:element>`,
  },
  {
    id: 'ev-ep-5', kind: 'graph', module: 'pricing-core',
    file: 'graph://field/effective_unit_price',
    language: 'json', caption: 'Graph trace linking source list price to output UnitPrice',
    snippet: `(ListPrice)-[:INPUT_TO]->(resolveEffectiveUnitPrice)
  -[:PRODUCES]->(effective-price)
  -[:MAPPED_BY]->(order-line.xsl#UnitPrice)
  -[:VALIDATED_BY]->(order-report.xsd#UnitPrice)`,
  },
]

const epDecision: DecisionNode = {
  id: 'd0', condition: null, label: 'Resolve effective unit price', provenance: 'parsed',
  evidenceIds: ['ev-ep-1'],
  children: [
    {
      id: 'd1', condition: 'customer.tier == PARTNER',
      label: 'Partner customer', provenance: 'parsed', evidenceIds: ['ev-ep-1'],
      outcome: 'Price from negotiated partner contract',
    },
    {
      id: 'd2', condition: 'item.hasActivePromotion()',
      label: 'Active promotion present', provenance: 'parsed', evidenceIds: ['ev-ep-1', 'ev-ep-2'],
      children: [
        {
          id: 'd2a', condition: "promo.kind == PERCENT", label: 'Percentage promo',
          provenance: 'parsed', evidenceIds: ['ev-ep-2'], outcome: 'listPrice × (1 − rate)',
        },
        {
          id: 'd2b', condition: "promo.kind == ABSOLUTE", label: 'Absolute promo',
          provenance: 'parsed', evidenceIds: ['ev-ep-2'], outcome: 'listPrice − amount',
        },
      ],
    },
    {
      id: 'd3', condition: 'customer.tier == PREMIUM',
      label: 'Premium customer (no promo)', provenance: 'parsed', evidenceIds: ['ev-ep-1'],
      outcome: 'listPrice × 0.90',
    },
    {
      id: 'd4', condition: null, label: 'Otherwise', provenance: 'parsed', evidenceIds: ['ev-ep-1'],
      outcome: 'listPrice (unchanged)',
    },
  ],
}

const epJourney: JourneyStage[] = [
  {
    id: 'j1', kind: 'source', title: 'List price (source)',
    detail: a('Read from LineItem.listPrice on the inbound order.', 'parsed', ['ev-ep-1']),
    evidenceIds: ['ev-ep-1'],
  },
  {
    id: 'j2', kind: 'condition', title: 'Branch on customer tier & promotion',
    detail: a('Partner → contract; promo → promo engine; premium → 10% off; else unchanged.', 'parsed', ['ev-ep-1']),
    evidenceIds: ['ev-ep-1'],
  },
  {
    id: 'j3', kind: 'transform', title: 'Apply promotion',
    detail: a('PromoEngine applies percentage or absolute reduction.', 'parsed', ['ev-ep-2']),
    evidenceIds: ['ev-ep-2'],
  },
  {
    id: 'j4', kind: 'fallback', title: 'Guard against null / negative',
    detail: a('If computed price is null or negative, fall back to list price.', 'parsed', ['ev-ep-1']),
    evidenceIds: ['ev-ep-1'],
  },
  {
    id: 'j5', kind: 'intermediate', title: 'Round to 2 decimals',
    detail: a('Rounded HALF_UP to 2 decimal places before output.', 'parsed', ['ev-ep-1']),
    evidenceIds: ['ev-ep-1'],
  },
  {
    id: 'j6', kind: 'xslt', title: 'Map to report XML',
    detail: a('order-line.xsl writes the value into <UnitPrice> with currency attribute.', 'parsed', ['ev-ep-3']),
    evidenceIds: ['ev-ep-3'],
  },
  {
    id: 'j7', kind: 'output', title: 'Validated output: UnitPrice',
    detail: a('Constrained by order-report.xsd (decimal, currency required); emitted to Settlement Report.', 'derived', ['ev-ep-4', 'ev-ep-5']),
    evidenceIds: ['ev-ep-4', 'ev-ep-5'],
  },
]

const effectiveUnitPrice: Field = {
  id: 'effective_unit_price',
  name: 'Effective Unit Price',
  internalName: 'effectiveUnitPrice',
  externalName: 'UnitPrice',
  module: 'pricing-core',
  group: 'Pricing',
  dataType: 'Money (decimal, 2dp)',
  criticality: 'CRITICAL',
  reviewStatus: 'IN_REVIEW',
  hasConditions: true,
  hasFallback: true,
  transformationCount: 3,
  tracedAt: iso(2 * HOUR),
  sourceChangedAt: iso(5 * DAY),
  outputDestination: 'Settlement Report › UnitPrice',
  description: a('The per-unit price actually charged for a line item after tier rules and promotions are applied.', 'ai', ['ev-ep-1']),
  business: a('Customers pay list price unless a rule reduces it: partners get their negotiated contract price, active promotions apply a percentage or fixed reduction, and premium customers without a promotion get 10% off. The price is never allowed to fall below zero.', 'ai', ['ev-ep-1', 'ev-ep-2']),
  technical: a('resolveEffectiveUnitPrice branches on Customer.tier and LineItem.hasActivePromotion(). PromoEngine.apply handles PERCENT/ABSOLUTE/NONE. A null-or-negative guard falls back to list price, then the result is rounded HALF_UP to 2 dp and mapped by order-line.xsl into the schema-validated UnitPrice element.', 'ai', ['ev-ep-1', 'ev-ep-2', 'ev-ep-3']),
  layman: a('The system starts from the sticker price, then checks who the customer is and whether a deal applies, picks the right discount, makes sure the price never goes negative, and reports the final number.', 'ai', ['ev-ep-1']),
  conditions: [
    a('customer.tier == PARTNER', 'parsed', ['ev-ep-1']),
    a('item.hasActivePromotion()', 'parsed', ['ev-ep-1']),
    a('customer.tier == PREMIUM', 'parsed', ['ev-ep-1']),
  ],
  transformations: [
    a('Percentage promotion: listPrice × (1 − rate)', 'parsed', ['ev-ep-2']),
    a('Absolute promotion: listPrice − amount', 'parsed', ['ev-ep-2']),
    a('Premium discount: listPrice × 0.90', 'parsed', ['ev-ep-1']),
  ],
  fallbacks: [
    a('If computed price is null or negative → use list price', 'parsed', ['ev-ep-1']),
  ],
  output: a('Emitted as <UnitPrice currency="…"> in the Settlement Report, validated by order-report.xsd.', 'derived', ['ev-ep-3', 'ev-ep-4']),
  decisionTree: epDecision,
  journey: epJourney,
  evidence: epEvidence,
  relatedFieldIds: ['list_price', 'line_total', 'order_grand_total', 'promo_code'],
  suggestedQuestions: [
    'What happens when a partner customer also has an active promotion?',
    'Can the effective unit price ever be higher than the list price?',
    'Which downstream reports consume this field?',
    'How is the value rounded before output?',
  ],
  canonical: {
    fieldId: 'effective_unit_price',
    source: { type: 'java', symbol: 'PriceResolver.resolveEffectiveUnitPrice' },
    output: { element: 'UnitPrice', schema: 'order-report.xsd' },
    branches: 4, fallbacks: 1, transformations: 3,
    provenance: { conditions: 'parsed', explanations: 'ai' },
  },
  generatedWith: { promptId: 'field.summary', promptVersion: '1.3.0', model: 'mock-llm-1', at: iso(2 * HOUR) },
}

// ---------------------------------------------------------------------------
// Supporting fields — complete but lighter.
// ---------------------------------------------------------------------------

let seq = 0
function makeField(partial: Partial<Field> & Pick<Field, 'id' | 'name' | 'internalName' | 'group' | 'module'>): Field {
  seq++
  const evId = `ev-${partial.id}-1`
  const evidence: Evidence[] = partial.evidence ?? [{
    id: evId, kind: 'java', module: partial.module,
    file: `src/main/java/com/acme/${partial.module}/${partial.name.replace(/\s+/g, '')}.java`,
    symbol: `${partial.name.replace(/\s+/g, '')}.compute`, lineStart: 10, lineEnd: 24,
    language: 'java', caption: `Computation of ${partial.name}`,
    snippet: `Money compute(Order o) {\n  return o.lineItems().stream()\n    .map(LineItem::${partial.internalName})\n    .reduce(Money.ZERO, Money::plus);\n}`,
  }]
  const base: Field = {
    id: partial.id, name: partial.name, internalName: partial.internalName,
    externalName: partial.externalName ?? partial.name.replace(/\s+/g, ''),
    module: partial.module, group: partial.group,
    dataType: partial.dataType ?? 'Money (decimal, 2dp)',
    criticality: partial.criticality ?? (seq % 3 === 0 ? 'HIGH' : 'MEDIUM'),
    reviewStatus: partial.reviewStatus ?? (seq % 4 === 0 ? 'REVIEWED' : 'UNREVIEWED'),
    hasConditions: partial.hasConditions ?? seq % 2 === 0,
    hasFallback: partial.hasFallback ?? seq % 3 === 0,
    transformationCount: partial.transformationCount ?? (seq % 4),
    tracedAt: partial.tracedAt ?? iso((seq + 1) * HOUR),
    sourceChangedAt: partial.sourceChangedAt ?? iso((seq + 2) * DAY),
    outputDestination: partial.outputDestination ?? 'Settlement Report',
    description: partial.description ?? a(`${partial.name} computed from order line items.`, 'ai', [evId]),
    business: partial.business ?? a(`${partial.name} represents an aggregate used in settlement.`, 'ai', [evId]),
    technical: partial.technical ?? a(`Reduces line item values into ${partial.name}.`, 'ai', [evId]),
    layman: partial.layman ?? a(`Adds up the parts to get ${partial.name}.`, 'ai', [evId]),
    conditions: partial.conditions ?? [],
    transformations: partial.transformations ?? [a('Sum of line items', 'parsed', [evId])],
    fallbacks: partial.fallbacks ?? [],
    output: partial.output ?? a(`Emitted to ${partial.outputDestination ?? 'Settlement Report'}.`, 'derived', [evId]),
    decisionTree: partial.decisionTree ?? {
      id: `${partial.id}-d0`, condition: null, label: `Compute ${partial.name}`,
      provenance: 'parsed', evidenceIds: [evId],
      outcome: 'Sum of line item values',
    },
    journey: partial.journey ?? [
      { id: `${partial.id}-j1`, kind: 'source', title: 'Line items', detail: a('Read order line items.', 'parsed', [evId]), evidenceIds: [evId] },
      { id: `${partial.id}-j2`, kind: 'transform', title: 'Aggregate', detail: a('Reduce to a single value.', 'parsed', [evId]), evidenceIds: [evId] },
      { id: `${partial.id}-j3`, kind: 'output', title: 'Output', detail: a(`Written to ${partial.outputDestination ?? 'Settlement Report'}.`, 'derived', [evId]), evidenceIds: [evId] },
    ],
    evidence,
    relatedFieldIds: partial.relatedFieldIds ?? ['effective_unit_price'],
    suggestedQuestions: partial.suggestedQuestions ?? [
      `How is ${partial.name} calculated?`,
      `Which fields feed into ${partial.name}?`,
      `Where is ${partial.name} reported?`,
    ],
    canonical: partial.canonical ?? { fieldId: partial.id, source: { type: 'java' } },
    generatedWith: { promptId: 'field.summary', promptVersion: '1.3.0', model: 'mock-llm-1', at: iso((seq + 1) * HOUR) },
  }
  return base
}

const supporting: Field[] = [
  makeField({ id: 'list_price', name: 'List Price', internalName: 'listPrice', group: 'Pricing', module: 'pricing-core', criticality: 'HIGH', transformationCount: 0, hasConditions: false }),
  makeField({ id: 'line_total', name: 'Line Total', internalName: 'lineTotal', group: 'Pricing', module: 'pricing-core', criticality: 'HIGH', transformationCount: 1 }),
  makeField({ id: 'order_grand_total', name: 'Order Grand Total', internalName: 'orderGrandTotal', group: 'Totals', module: 'orders-core', criticality: 'CRITICAL', reviewStatus: 'REVIEWED', transformationCount: 2, hasConditions: true, hasFallback: true, outputDestination: 'Settlement Report › GrandTotal' }),
  makeField({ id: 'tax_amount', name: 'Tax Amount', internalName: 'taxAmount', group: 'Tax', module: 'tax-engine', criticality: 'HIGH', hasConditions: true, transformationCount: 2 }),
  makeField({ id: 'shipping_fee', name: 'Shipping Fee', internalName: 'shippingFee', group: 'Fulfilment', module: 'fulfilment', criticality: 'MEDIUM', hasConditions: true, hasFallback: true }),
  makeField({ id: 'discount_total', name: 'Discount Total', internalName: 'discountTotal', group: 'Pricing', module: 'pricing-core', criticality: 'MEDIUM', transformationCount: 1 }),
  makeField({ id: 'promo_code', name: 'Promo Code', internalName: 'promoCode', group: 'Pricing', module: 'pricing-core', dataType: 'String', criticality: 'LOW', transformationCount: 0 }),
  makeField({ id: 'currency_code', name: 'Currency Code', internalName: 'currencyCode', group: 'Reference', module: 'orders-core', dataType: 'String (ISO 4217)', criticality: 'MEDIUM', transformationCount: 0, reviewStatus: 'FLAGGED' }),
  makeField({ id: 'customer_tier', name: 'Customer Tier', internalName: 'customerTier', group: 'Customer', module: 'customer', dataType: 'Enum', criticality: 'MEDIUM', transformationCount: 0 }),
  makeField({ id: 'settlement_date', name: 'Settlement Date', internalName: 'settlementDate', group: 'Totals', module: 'orders-core', dataType: 'Date', criticality: 'HIGH', hasConditions: true, hasFallback: true, outputDestination: 'Settlement Report › SettlementDate' }),
  makeField({ id: 'net_payable', name: 'Net Payable', internalName: 'netPayable', group: 'Totals', module: 'orders-core', criticality: 'CRITICAL', reviewStatus: 'IN_REVIEW', transformationCount: 3, hasConditions: true, hasFallback: true, outputDestination: 'Settlement Report › NetPayable' }),
]

export const FIELDS: Field[] = [effectiveUnitPrice, ...supporting]

export const FIELD_SUMMARIES: FieldSummary[] = FIELDS.map((f) => ({
  id: f.id, name: f.name, internalName: f.internalName, module: f.module, group: f.group,
  dataType: f.dataType, criticality: f.criticality, reviewStatus: f.reviewStatus,
  hasConditions: f.hasConditions, hasFallback: f.hasFallback,
  transformationCount: f.transformationCount, tracedAt: f.tracedAt,
  sourceChangedAt: f.sourceChangedAt, outputDestination: f.outputDestination,
}))

export const FEEDBACK: Feedback[] = [
  { id: 'fb1', fieldId: 'effective_unit_price', target: 'business', author: 'a.morgan', createdAt: iso(6 * HOUR), status: 'UNDER_REVIEW', body: 'Premium discount is actually 12% since the April pricing change, not 10%.', conflictsWithCode: true },
  { id: 'fb2', fieldId: 'effective_unit_price', target: 'description', author: 'r.patel', createdAt: iso(2 * DAY), status: 'VERIFIED', body: 'Clarify that partner contract prices are negotiated per SKU.', resolution: 'Accepted — added to description.' },
  { id: 'fb3', fieldId: 'order_grand_total', target: 'missing', author: 'j.chen', createdAt: iso(3 * DAY), status: 'SUBMITTED', body: 'Gift-card redemption is not reflected in the trace.' },
  { id: 'fb4', fieldId: 'tax_amount', target: 'technical', author: 'a.morgan', createdAt: iso(4 * DAY), status: 'PARTIALLY_ACCEPTED', body: 'Rounding happens per-line, not on the total.', resolution: 'Partially accepted — verified for standard tax; compound tax still under review.' },
]

export const ACTIVITY: ReviewEvent[] = [
  { id: 'a1', fieldId: 'effective_unit_price', actor: 'system', at: iso(2 * HOUR), kind: 'generation', summary: 'AI explanations regenerated', detail: 'prompt field.summary v1.3.0 · model mock-llm-1' },
  { id: 'a2', fieldId: 'effective_unit_price', actor: 'a.morgan', at: iso(6 * HOUR), kind: 'feedback', summary: 'Feedback submitted on business logic', detail: 'Premium discount rate' },
  { id: 'a3', fieldId: 'effective_unit_price', actor: 'system', at: iso(5 * DAY), kind: 'parse', summary: 'Source re-parsed', detail: 'PriceResolver.java changed (hash a1b2c3)' },
  { id: 'a4', fieldId: 'effective_unit_price', actor: 'r.patel', at: iso(2 * DAY), kind: 'status', summary: 'Moved to In Review' },
  { id: 'a5', fieldId: 'effective_unit_price', actor: 'r.patel', at: iso(2 * DAY), kind: 'note', summary: 'Review note added', detail: 'Confirm rounding mode against finance policy.' },
]

export const CHECKLIST_TEMPLATE = [
  { id: 'c1', label: 'Source mapping verified against code', done: true },
  { id: 'c2', label: 'All branches reviewed for completeness', done: true },
  { id: 'c3', label: 'Fallback behaviour confirmed', done: false },
  { id: 'c4', label: 'Output schema constraints checked', done: false },
  { id: 'c5', label: 'Business explanation approved', done: false },
]
