# Self-Hosted Installation Guide

BillManager can be self-hosted using Docker. This guide covers the setup process for running your own instance.

## Quick Start

### 1. Create docker-compose.yml

```yaml
services:
  billmanager:
    image: ghcr.io/brdweb/billmanager:latest
    ports:
      - "5000:5000"
    environment:
      - DEPLOYMENT_MODE=self-hosted
      - DATABASE_URL=postgresql://billsuser:your-db-password@db:5432/billmanager
      - FLASK_SECRET_KEY=your-secret-key-here
      - JWT_SECRET_KEY=your-jwt-secret-here
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=billsuser
      - POSTGRES_PASSWORD=your-db-password
      - POSTGRES_DB=billmanager
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### 2. Generate Secure Keys

Generate secure random keys for your installation:

```bash
# Generate FLASK_SECRET_KEY
openssl rand -hex 32

# Generate JWT_SECRET_KEY
openssl rand -hex 32

# Generate database password
openssl rand -hex 16
```

Replace the placeholder values in docker-compose.yml with your generated keys.

### 3. Start the Application

```bash
docker-compose up -d
```

### 4. Access BillManager

Open your browser and navigate to `http://localhost:5000`

The default admin credentials are:
- Username: `admin`
- Password: `password`

**Important:** Change the admin password immediately after first login!

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `FLASK_SECRET_KEY` | Flask session encryption key | `openssl rand -hex 32` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `DEPLOYMENT_MODE` | Deployment mode | `self-hosted` |
| `JWT_SECRET_KEY` | JWT signing key | Falls back to FLASK_SECRET_KEY |
| `ENABLE_REGISTRATION` | Allow public registration | `false` |
| `REQUIRE_EMAIL_VERIFICATION` | Require email verification | `false` |
| `RESEND_API_KEY` | Resend API key for emails | None |
| `FROM_EMAIL` | Email sender address | None |
| `APP_URL` | Application URL for email links | `http://localhost:5000` |

## Enabling Public Registration

By default, registration is disabled in self-hosted mode. To enable public registration:

```yaml
environment:
  - DEPLOYMENT_MODE=self-hosted
  - ENABLE_REGISTRATION=true
```

## Enabling Email Verification

If you want email verification for new registrations:

1. Get an API key from [Resend](https://resend.com)
2. Add the following environment variables:

```yaml
environment:
  - DEPLOYMENT_MODE=self-hosted
  - ENABLE_REGISTRATION=true
  - REQUIRE_EMAIL_VERIFICATION=true
  - RESEND_API_KEY=re_your_api_key
  - FROM_EMAIL=noreply@yourdomain.com
  - APP_URL=https://bills.yourdomain.com
```

## Using a Reverse Proxy

For production deployments, use a reverse proxy like Traefik or Nginx:

### With Traefik

```yaml
services:
  billmanager:
    image: ghcr.io/brdweb/billmanager:latest
    environment:
      - DEPLOYMENT_MODE=self-hosted
      - DATABASE_URL=postgresql://billsuser:password@db:5432/billmanager
      - FLASK_SECRET_KEY=your-secret-key
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.billmanager.rule=Host(`bills.yourdomain.com`)"
      - "traefik.http.routers.billmanager.entrypoints=websecure"
      - "traefik.http.routers.billmanager.tls.certresolver=letsencrypt"
      - "traefik.http.services.billmanager.loadbalancer.server.port=5000"
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=billsuser
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=billmanager
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### With Nginx

```nginx
server {
    listen 80;
    server_name bills.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bills.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Creating Additional Users

In self-hosted mode with registration disabled, create users via the admin panel:

1. Log in as admin
2. Click the "Admin" button in the header
3. Navigate to "Users" tab
4. Click "Add User"

New users will be prompted to change their password on first login.

## Backup and Restore

### Backup Database

```bash
docker exec -t billmanager-db-1 pg_dump -U billsuser billmanager > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker exec -i billmanager-db-1 psql -U billsuser billmanager
```

## Upgrading

To upgrade to a new version:

```bash
# Pull the latest image
docker-compose pull

# Restart with the new image
docker-compose up -d
```

## Troubleshooting

### Container won't start

Check the logs:
```bash
docker-compose logs billmanager
```

### Database connection errors

Ensure the database is healthy:
```bash
docker-compose logs db
```

### Reset admin password

If you've lost the admin password, connect to the database and update it:

```bash
docker exec -it billmanager-db-1 psql -U billsuser billmanager
```

```sql
UPDATE users SET password_hash = 'pbkdf2:sha256:600000$...' WHERE username = 'admin';
```

Or delete and recreate the admin user by removing the container volumes and restarting.

## Support

For issues and feature requests, please visit:
https://github.com/brdweb/billmanager/issues
