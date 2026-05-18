-- Create jurisdictions
CREATE (j1:Jurisdiction {code: 'JFSA', name: 'Japan FSA'})
CREATE (j2:Jurisdiction {code: 'MAS', name: 'Monetary Authority Singapore'})
CREATE (j3:Jurisdiction {code: 'ASIC', name: 'Australian Securities'})

-- Create fields
CREATE (f1:Field {internalName: 'TRADE_ID', businessName: 'Trade ID', jurisdictionCode: 'JFSA'})
CREATE (f2:Field {internalName: 'TRADE_TIMESTAMP', businessName: 'Trade Time', jurisdictionCode: 'JFSA'})

-- Create XSLT variables
CREATE (v1:XsltVariable {name: 'v_trade_id', fileName: 'trade_mapping.xsl'})
CREATE (v2:XsltVariable {name: 'v_trade_timestamp', fileName: 'trade_mapping.xsl'})

-- Create XPaths
CREATE (x1:XPath {path: '/trade/tradeId'})
CREATE (x2:XPath {path: '/trade/timestamp'})

-- Create relationships
CREATE (f1)-[:PRODUCED_BY_VARIABLE]->(v1)
CREATE (f2)-[:PRODUCED_BY_VARIABLE]->(v2)
CREATE (v1)-[:VARIABLE_READS_XPATH]->(x1)
CREATE (v2)-[:VARIABLE_READS_XPATH]->(x2)

-- Create business concept
CREATE (bc:BusinessConcept {name: 'Trade Identifier'})
CREATE (f1)-[:IMPLEMENTS_CONCEPT]->(bc)
