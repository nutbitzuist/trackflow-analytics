# TrackFlow Analytics 📊

A self-hosted, privacy-first analytics platform inspired by [DataFast](https://datafa.st). Track all your websites from a single beautiful dashboard.

![Dashboard Preview](https://via.placeholder.com/800x400?text=TrackFlow+Analytics+Dashboard)

## ✨ Features

- **📈 Beautiful Dashboard** - Modern, glassmorphic UI with real-time updates
- **🌐 Multi-site Support** - Track up to 10+ websites from one dashboard  
- **⚡ Lightweight Script** - Only ~4KB tracking script that won't slow down your site
- **🔒 Privacy-First** - No cookies by default, GDPR compliant
- **📱 Device Analytics** - Track desktop, mobile, tablet visitors
- **🔍 Traffic Sources** - See where your visitors come from (Google, Twitter, etc.)
- **📄 Top Pages** - Know which pages perform best
- **🌍 Geography** - Visitor country/city breakdown
- **⏱️ Real-time** - See who's on your site right now
- **💰 Revenue Attribution** - Track which sources drive paying customers
- **🎯 Funnels** - Visualize user journeys and conversions

## 🚀 Quick Start

### Option 1: Run Locally

```bash
# Clone or download the project
cd analytics-dashboard

# Install dependencies
npm install

# Start the server
npm start

# Open http://localhost:3000 in your browser
```

### Option 2: Deploy to Production

#### Deploy to Railway/Render/Fly.io

1. Push the code to a GitHub repository
2. Connect to Railway/Render/Fly.io
3. Set environment variables if needed
4. Deploy!

#### Deploy with Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📦 Project Structure

```
analytics-dashboard/
├── index.html           # Dashboard UI (React + TailwindCSS)
├── tracking-script.js   # Lightweight tracking script for websites
├── server.js            # Backend API (Express + SQLite)
├── package.json         # Dependencies
└── README.md           # This file
```

## 🔧 Installation on Your Websites

Once you have the server running, add this script to your website's `<head>` tag:

```html
<!-- TrackFlow Analytics -->
<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s);
    j.async=true;
    j.src='https://YOUR-SERVER-URL/t.js';
    j.setAttribute('data-site','YOUR-SITE-ID');
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','tf','TF-YOUR-SITE-ID');
</script>
```

Replace:
- `YOUR-SERVER-URL` with your server's URL (e.g., `analytics.yourcompany.com`)
- `YOUR-SITE-ID` with the site ID from your dashboard

### Script Options

```html
<script 
  src="https://your-server/t.js"
  data-site="your-site-id"
  data-track-outbound="true"    <!-- Track outbound link clicks -->
  data-track-downloads="true"   <!-- Track file downloads -->
  data-hash-mode="false"        <!-- Enable for SPAs using hash routing -->
  data-debug="false"            <!-- Enable console logging -->
></script>
```

## 📊 API Endpoints

### Sites

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sites` | GET | List all sites |
| `/api/sites` | POST | Create a new site |
| `/api/sites/:id` | GET | Get site details |
| `/api/sites/:id` | DELETE | Delete a site |

### Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sites/:id/stats` | GET | Overview statistics |
| `/api/sites/:id/timeseries` | GET | Time series data |
| `/api/sites/:id/pages` | GET | Top pages |
| `/api/sites/:id/sources` | GET | Traffic sources |
| `/api/sites/:id/devices` | GET | Device breakdown |
| `/api/sites/:id/realtime` | GET | Real-time visitors |
| `/api/sites/:id/revenue` | GET | Revenue stats |

### Query Parameters

Most endpoints support these query parameters:

- `period`: `7d`, `30d`, or `90d` (default: `30d`)
- `limit`: Number of results (default: `10`)

### Example: Get Stats

```bash
curl "http://localhost:3000/api/sites/your-site-id/stats?period=30d"
```

Response:
```json
{
  "unique_visitors": 45230,
  "total_pageviews": 128450,
  "total_sessions": 52100,
  "changes": {
    "visitors": 12.5,
    "pageviews": 8.2,
    "sessions": 15.3
  }
}
```

## 🎯 Track Custom Events

Use the JavaScript API to track custom events:

```javascript
// Track a custom event
TrackFlow.track('button_click', { button: 'signup' });

// Track a goal/conversion
TrackFlow.trackGoal('signup_complete');

// Track revenue
TrackFlow.revenue(99.00, 'USD', { plan: 'premium' });

// Identify a user
TrackFlow.identify('user_123', { email: 'user@example.com' });
```

## 💰 Revenue Attribution

To track which traffic sources drive revenue, integrate with your payment processor:

### Stripe Webhook Example

```javascript
// In your webhook handler
app.post('/webhook/stripe', async (req, res) => {
  const event = req.body;
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Get visitor ID from metadata (pass it during checkout)
    const visitorId = session.metadata.visitor_id;
    
    // Record the revenue
    await fetch('http://your-analytics-server/api/sites/YOUR_SITE_ID/revenue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitor_id: visitorId,
        amount: session.amount_total / 100,
        currency: session.currency.toUpperCase(),
        customer_email: session.customer_email
      })
    });
  }
  
  res.json({ received: true });
});
```

## 🔒 Privacy & GDPR

TrackFlow is designed to be privacy-first:

- **No cookies** by default (uses localStorage for visitor ID)
- **Respects Do Not Track** (DNT) browser settings
- **No personal data collection** - only anonymous analytics
- **Self-hosted** - you own your data
- **GDPR compliant** - no third-party data sharing

### Cookie Consent

If you need cookie consent for your region:

```javascript
// Only start tracking after consent
if (userHasConsented) {
  TrackFlow.config({ enabled: true });
}
```

## 🛠️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_PATH` | SQLite database path | `./analytics.db` |

### Database

The default setup uses SQLite for simplicity. For production with high traffic, consider:

- **PostgreSQL** - Better for concurrent writes
- **ClickHouse** - Excellent for analytics queries
- **TimescaleDB** - PostgreSQL extension optimized for time-series

## 📈 Scaling

For high-traffic sites (100k+ events/day):

1. **Use a proper database** (PostgreSQL/ClickHouse)
2. **Add Redis** for real-time data caching
3. **Use a queue** (RabbitMQ/Redis) for event ingestion
4. **Enable CDN** for the tracking script
5. **Add geographic distribution** with multiple servers

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this for any purpose.

## 🙏 Credits

Inspired by [DataFast](https://datafa.st) by Marc Lou.

---

Built with ❤️ for indie hackers who want to own their analytics data.
