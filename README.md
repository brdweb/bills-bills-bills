# Bills, Bills, Bills! Expense Tracker v0.1

A web-based application for tracking recurring monthly expenses, inspired by Chronicle on MacOS.

## Features

- **Bill Management**: Create, edit, and archive recurring bills with custom Material Design icons
- **Icon Selection**: Searchable dropdown with live preview for 44+ common Material Design icons
- **Payment Tracking**: Record payments with optional recurring bill creation
- **Payment History**: Click any bill to view historical payments
- **User Authentication**: Session-based login with admin user management
- **Responsive UI**: Clean three-column layout built with Bulma CSS
- **Database**: SQLite with automatic schema migrations
- **Docker Ready**: Containerized for easy production deployment

## Quick Start

### Using Docker (Recommended)

1. Build the Docker image:
```bash
docker build -t bills-app:v0.1 .
```

2. Run the container:
```bash
docker run -p 5000:5000 bills-app:v0.1
```

3. Open http://localhost:5000 in your browser

### Development Setup

1. Install Python dependencies:
```bash
cd server
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```

3. Open http://localhost:5000 in your browser

## Default Credentials

- **Username:** admin
- **Password:** password

## Production Deployment

Set the `FLASK_DEBUG=false` environment variable to disable debug mode. The app is served on port 5000 and listens on all interfaces (0.0.0.0).

```bash
docker run -e FLASK_DEBUG=false -p 5000:5000 bills-app:v0.1
```

## Data Persistence

SQLite database is created automatically in the app directory. For production, consider mounting a volume:

```bash
docker run -v /host/path/to/data:/app -p 5000:5000 bills-app:v0.1
```

## Architecture

- **Frontend:** Vanilla JavaScript + Bulma CSS + Axios HTTP client
- **Backend:** Flask Python web framework with session management
- **Database:** SQLite with automatic migrations
- **Icons:** Material Design Icons loaded from Google Fonts
- **Styling:** Mobile-first responsive design

## Database Schema

- `bills`: Active bills with recurring payment logic
- `payments`: Historical payment records
- `users`: User accounts with role-based access control

## API Endpoints

- `GET /`: Serve client application
- `POST /login`: User authentication
- `GET/POST/PUT/DELETE /bills`: Bill management
- `POST /bills/<id>/pay`: Record payments
- `GET /bills/<name>/payments`: Payment history
- `GET/POST/DELETE /users`: Admin user management

## Icons

Common Material Design icons are available, including:
- payment, credit_card, account_balance
- home, car, phone, wifi
- shopping_cart, restaurant, business
- And 35+ more...

## License

Open source - no external dependencies required.

## Version History

**v0.1** - Initial production release
- Complete bill and payment management
- User authentication system
- Icon customization
- Docker deployment ready
