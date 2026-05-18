// e2e/fixtures/seed-data.ts

export const API_BASE = 'http://localhost:8000/api'

export const USERS = {
  admin: 'puneet.sharma',
  developer: 'alice.developer',
}

export const JURISDICTIONS = {
  JFSA: { code: 'JFSA', name: 'Japan Financial Services Agency', region: 'Asia' },
  MAS: { code: 'MAS', name: 'Monetary Authority of Singapore', region: 'Asia' },
  ASIC: { code: 'ASIC', name: 'Australian Securities and Investments Commission', region: 'APAC' },
}

export const FIELDS = {
  TRADE_ID: { field_id: 1, field_name: 'TRADE_ID', data_type: 'STRING', criticality: 'HIGH', jurisdiction: 'JFSA' },
  TRADE_TIMESTAMP: { field_id: 2, field_name: 'TRADE_TIMESTAMP', data_type: 'TIMESTAMP', criticality: 'HIGH', jurisdiction: 'JFSA' },
}

export const XSLT_VARIABLES = {
  v_trade_id: { name: 'v_trade_id', xslt_file: 'trade_mapping.xsl' },
  v_trade_timestamp: { name: 'v_trade_timestamp', xslt_file: 'trade_mapping.xsl' },
}

export const XPATH_NODES = {
  trade_id: '/trade/tradeId',
  timestamp: '/trade/timestamp',
}

export const AUTH_HEADER = { 'X-User': USERS.admin }
