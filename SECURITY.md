# Security Policy

## Overview

This document outlines security best practices, vulnerability reporting, and security hardening measures for the Data Lineage Platform.

## Security Headers

The application enforces the following security headers:

### Content Security Policy (CSP)
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' http://localhost:8000;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

### HSTS (HTTP Strict Transport Security)
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Other Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Authentication & Authorization

### Session Management
- Session timeout: 30 minutes (1800 seconds)
- Secure cookie flags: `Secure`, `HttpOnly`, `SameSite=Strict`
- CSRF protection enabled on all state-changing requests

### API Security
- All API endpoints require authentication via `X-User` header
- Rate limiting: 100 requests per minute per IP
- CORS policy: Only allow requests from same origin in production

## Data Security

### Encryption
- **In Transit**: TLS 1.2+ (HTTPS)
- **At Rest**: Database encryption enabled
- **Secrets**: Stored in environment variables (never in code)

### Database Security
- SQL injection prevention: Parameterized queries
- ORM protection: SQLAlchemy with bound parameters
- Least privilege: Database user with minimal required permissions

## Dependency Management

### Vulnerability Scanning
```bash
# Frontend
npm audit

# Backend
pip install safety && safety check
```

### Dependency Updates
- Security patches applied immediately
- Minor/major updates tested in staging before production
- Dependency audit run on all CI/CD pipelines

## Code Security

### Common Vulnerability Prevention

#### XSS (Cross-Site Scripting)
- ✅ React escapes values by default
- ✅ No `dangerouslySetInnerHTML` usage
- ✅ Content Security Policy headers enforced

#### CSRF (Cross-Site Request Forgery)
- ✅ Same-site cookies
- ✅ CSRF tokens on all state-changing requests
- ✅ SameSite cookie attribute set to "Strict"

#### SQL Injection
- ✅ Parameterized queries only
- ✅ ORM usage prevents raw SQL
- ✅ Input validation on all user inputs

#### SSRF (Server-Side Request Forgery)
- ✅ API requests whitelist allowed hosts
- ✅ No user-controlled URLs in requests
- ✅ Internal services isolated from external access

## Container Security

### Docker Best Practices
- ✅ Non-root user in containers
- ✅ Read-only filesystem where possible
- ✅ Resource limits enforced
- ✅ Security scanning enabled

### Image Hardening
```dockerfile
# Use minimal base images
FROM node:18-alpine

# Run as non-root
USER node

# Set security context
RUN chmod -R 755 /app
```

## Network Security

### Firewall Rules
```
Inbound:
  - Port 80 (HTTP) -> Reverse Proxy
  - Port 443 (HTTPS) -> Reverse Proxy
  - Port 8000 (Backend) -> Internal only
  - Port 3000 (Frontend) -> Internal only
  - Port 1433 (MSSQL) -> Internal only
  - Port 7687 (Neo4j) -> Internal only

Outbound:
  - DNS (Port 53)
  - HTTP/HTTPS (Ports 80, 443)
  - NTP (Port 123)
```

### API Rate Limiting
```
Default: 100 requests/minute per IP
Authentication endpoints: 10 requests/minute per IP
File upload: 50 MB max file size
```

## Logging & Monitoring

### Audit Logging
- All authentication attempts logged
- API requests logged with timestamp, user, endpoint, status
- Database access logged
- Failed security checks logged

### Alert Triggers
- Failed login attempts (>5 in 5 minutes)
- Unauthorized API calls
- Unusual traffic patterns
- Failed health checks

### Log Retention
- Logs retained for 90 days
- Archive to secure storage after 30 days
- Access controlled to authorized personnel only

## Access Control

### Role-Based Access Control (RBAC)
- **LINEAGE_ADMIN**: Full access to all features
- **LINEAGE_USER**: Read access to fields and lineage
- **LINEAGE_ANALYST**: Read + comparison/impact analysis
- **LINEAGE_AUDITOR**: Read-only access

### Least Privilege Principle
- Users have minimum required permissions
- Service accounts scoped to specific operations
- Regular access reviews (quarterly)

## Incident Response

### Reporting Vulnerabilities
**Please report security vulnerabilities responsibly:**

1. **Do not** open public GitHub issues for security vulnerabilities
2. Email: security@example.com with:
   - Vulnerability description
   - Steps to reproduce
   - Potential impact
   - Your contact information

3. Expected response time: 24-48 hours
4. Patch timeline: Critical (24h), High (7d), Medium (30d)

### Incident Handling
1. Vulnerability confirmed and triaged
2. Patch developed and tested
3. Release deployed to production
4. Notification sent to affected users
5. Post-incident review conducted

## Compliance

### Standards
- OWASP Top 10 protections
- GDPR-compliant data handling
- SOC 2 controls implemented
- PCI DSS compliance for payment data (if applicable)

### Privacy
- Data minimization principle followed
- User data encrypted
- Retention policies enforced
- Right to deletion implemented

## Deployment Security Checklist

- [ ] HTTPS enabled (SSL/TLS certificate valid)
- [ ] Environment variables configured (no secrets in code)
- [ ] Database credentials rotated
- [ ] Security headers verified
- [ ] CORS policy enforced
- [ ] Rate limiting enabled
- [ ] Audit logging active
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Fire drill completed

## Security Updates

### Patching Schedule
- **Critical**: Deployed immediately
- **High**: Within 7 days
- **Medium**: Within 30 days
- **Low**: Next regular release

### Version Support
- Latest version: Actively supported
- Previous major: Security patches only
- Older versions: No support

## Contact & Support

- **Security Issues**: security@example.com
- **Bug Bounty**: N/A (currently)
- **Questions**: security@example.com

---

Last Updated: 2026-05-18
