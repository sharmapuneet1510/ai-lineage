# Deployment Guide

## Prerequisites

- Docker & Docker Compose (v20.0+)
- Node.js 18+ (for local development)
- Git

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/ai-lineage.git
cd ai-lineage
```

### 2. Configure Environment Variables
Create `.env` file in the project root:
```bash
# Database
DATABASE_URL=mssql://sa:YourPassword123@mssql:1433/lineage_db
MSSQL_PASSWORD=YourPassword123

# Neo4j
NEO4J_USER=neo4j
NEO4J_PASSWORD=YourPassword123

# API
API_BASE_URL=http://localhost:8000

# Environment
ENVIRONMENT=development
```

### 3. Create Environment Files
```bash
# Frontend
cp lineage-frontend/.env.production lineage-frontend/.env

# Backend
cp lineage-backend/.env.example lineage-backend/.env
```

## Local Development

### Docker Compose (Recommended)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Neo4j Browser: http://localhost:7474
- MSSQL: localhost:1433

### Manual Start (Local)
```bash
# Terminal 1 - Backend
cd lineage-backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd lineage-frontend
npm install
npm run dev
```

## Production Deployment

### Build Docker Images
```bash
docker-compose -f docker-compose.yml build
```

### Push to Registry
```bash
docker tag lineage-frontend:latest ghcr.io/your-org/lineage-frontend:latest
docker push ghcr.io/your-org/lineage-frontend:latest
```

### Deploy to Kubernetes
1. Create namespace: `kubectl create namespace lineage`
2. Apply secrets: `kubectl apply -f k8s/secrets.yaml`
3. Deploy: `kubectl apply -f k8s/deployment.yaml`

### Verify Deployment
```bash
# Check container health
docker-compose ps

# Check logs
docker-compose logs frontend backend

# Run tests
docker-compose exec frontend npm run playwright:test:ui
```

## Security Checklist

- [ ] Use strong passwords for MSSQL and Neo4j (32+ characters)
- [ ] Enable HTTPS in production (use reverse proxy)
- [ ] Set `NODE_ENV=production`
- [ ] Enable security headers (CSP, HSTS, X-Frame-Options)
- [ ] Rotate API keys and secrets regularly
- [ ] Enable database encryption at rest
- [ ] Set up firewall rules (only allow necessary ports)
- [ ] Enable container scanning (if using registry)
- [ ] Set resource limits on containers
- [ ] Enable audit logging
- [ ] Use private container registry
- [ ] Implement rate limiting on API

## Database Initialization

### MSSQL
```bash
docker-compose exec mssql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourPassword123 -i /sql/lineage_db_schema.sql
docker-compose exec mssql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourPassword123 -i /sql/lineage_db_seed_data.sql
```

### Neo4j
Access Neo4j Browser at `http://localhost:7474` and run:
```cypher
MATCH (n) DETACH DELETE n;
// Import initial data as needed
```

## Scaling

### Horizontal Scaling
```bash
# Scale frontend services
docker-compose up -d --scale frontend=3

# Use load balancer (nginx/HAProxy) to distribute traffic
```

### Vertical Scaling
Increase container resource limits in docker-compose.yml:
```yaml
services:
  frontend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
```

## Monitoring

### Health Checks
- Frontend: GET /
- Backend: GET /health

### Logging
```bash
# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
```

### Metrics
Enable Prometheus monitoring by updating docker-compose.yml with monitoring stack.

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Container Won't Start
```bash
# Check logs
docker-compose logs <service-name>

# Validate docker-compose file
docker-compose config
```

### Database Connection Issues
```bash
# Test MSSQL connection
docker-compose exec mssql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P password

# Test Neo4j connection
docker-compose exec neo4j cypher-shell -a bolt://localhost:7687 "RETURN 1"
```

## Backup and Recovery

### Backup Database
```bash
# MSSQL backup
docker-compose exec mssql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P password -Q "BACKUP DATABASE lineage_db TO DISK='/var/opt/mssql/backup/lineage_db.bak'"

# Neo4j backup
docker-compose exec neo4j bin/neo4j-admin dump --database=neo4j --to=/data/backup.dump
```

### Restore Database
```bash
# MSSQL restore
docker-compose exec mssql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P password -Q "RESTORE DATABASE lineage_db FROM DISK='/var/opt/mssql/backup/lineage_db.bak'"
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review DEPLOYMENT.md
3. Check health endpoints
4. Open GitHub issue with logs

## Release Notes

- **v1.0.0**: Initial release with all 7 screens, Docker support, and CI/CD pipeline
