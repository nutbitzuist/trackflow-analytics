/**
 * TrackFlow Analytics - Backend API
 * 
 * This is a simple Express.js server that:
 * 1. Collects analytics events from the tracking script
 * 2. Stores data in SQLite (can be replaced with PostgreSQL, ClickHouse, etc.)
 * 3. Serves the dashboard and API endpoints
 * 
 * To run:
 * 1. npm install express cors better-sqlite3 uuid
 * 2. node server.js
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// app.use(express.static('public'));

// Initialize SQLite database
const db = new Database('analytics.db');

// Create tables
db.exec(`
    -- Websites/Sites table
    CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        domain TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT
    );

    -- Events table (main analytics data)
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT NOT NULL,
        visitor_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        
        -- Page info
        url TEXT,
        path TEXT,
        hostname TEXT,
        title TEXT,
        
        -- Referrer info
        source TEXT,
        medium TEXT,
        referrer TEXT,
        
        -- UTM params
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_term TEXT,
        utm_content TEXT,
        ref TEXT,
        
        -- Device info
        device_type TEXT,
        browser TEXT,
        os TEXT,
        screen_width INTEGER,
        screen_height INTEGER,
        language TEXT,
        timezone TEXT,
        
        -- Country (from IP geolocation)
        country TEXT,
        city TEXT,
        
        -- Custom event data
        event_name TEXT,
        event_data TEXT,
        
        -- Revenue tracking
        revenue REAL,
        currency TEXT,
        
        FOREIGN KEY (site_id) REFERENCES sites(id)
    );

    -- Create indexes for faster queries
    CREATE INDEX IF NOT EXISTS idx_events_site_id ON events(site_id);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON events(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_path ON events(path);
    CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);

    -- Goals/Conversions table
    CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        target TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES sites(id)
    );

    -- Revenue/Payments table
    CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        visitor_id TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        customer_email TEXT,
        product_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES sites(id)
    );
`);

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// EVENT COLLECTION
// ============================================

// Collect events from tracking script
app.post('/collect', (req, res) => {
    try {
        const event = req.body;
        
        const stmt = db.prepare(`
            INSERT INTO events (
                site_id, visitor_id, session_id, event_type, timestamp,
                url, path, hostname, title,
                source, medium, referrer,
                utm_source, utm_medium, utm_campaign, utm_term, utm_content, ref,
                device_type, browser, os, screen_width, screen_height, language, timezone,
                event_name, event_data, revenue, currency
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?
            )
        `);
        
        stmt.run(
            event.site_id,
            event.visitor_id,
            event.session_id,
            event.event_type,
            event.timestamp,
            event.url,
            event.path,
            event.hostname,
            event.title,
            event.source,
            event.medium,
            event.referrer,
            event.utm_source,
            event.utm_medium,
            event.utm_campaign,
            event.utm_term,
            event.utm_content,
            event.ref,
            event.deviceType,
            event.browser,
            event.os,
            event.screenWidth,
            event.screenHeight,
            event.language,
            event.timezone,
            event.event_name,
            JSON.stringify(event),
            event.amount || event.revenue,
            event.currency
        );
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error collecting event:', error);
        res.status(500).json({ error: 'Failed to collect event' });
    }
});

// ============================================
// SITES MANAGEMENT
// ============================================

// List all sites
app.get('/api/sites', (req, res) => {
    try {
        const sites = db.prepare(`
            SELECT 
                s.*,
                COUNT(DISTINCT e.visitor_id) as total_visitors,
                COUNT(e.id) as total_events
            FROM sites s
            LEFT JOIN events e ON s.id = e.site_id
            GROUP BY s.id
            ORDER BY s.created_at DESC
        `).all();
        
        res.json(sites);
    } catch (error) {
        console.error('Error fetching sites:', error);
        res.status(500).json({ error: 'Failed to fetch sites' });
    }
});

// Create a new site
app.post('/api/sites', (req, res) => {
    try {
        const { name, domain } = req.body;
        const id = uuidv4();
        
        db.prepare(`
            INSERT INTO sites (id, name, domain) VALUES (?, ?, ?)
        `).run(id, name, domain);
        
        res.json({ id, name, domain, created_at: new Date().toISOString() });
    } catch (error) {
        console.error('Error creating site:', error);
        res.status(500).json({ error: 'Failed to create site' });
    }
});

// Get site details
app.get('/api/sites/:siteId', (req, res) => {
    try {
        const site = db.prepare(`
            SELECT * FROM sites WHERE id = ?
        `).get(req.params.siteId);
        
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }
        
        res.json(site);
    } catch (error) {
        console.error('Error fetching site:', error);
        res.status(500).json({ error: 'Failed to fetch site' });
    }
});

// Delete a site
app.delete('/api/sites/:siteId', (req, res) => {
    try {
        db.prepare('DELETE FROM events WHERE site_id = ?').run(req.params.siteId);
        db.prepare('DELETE FROM sites WHERE id = ?').run(req.params.siteId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting site:', error);
        res.status(500).json({ error: 'Failed to delete site' });
    }
});

// ============================================
// ANALYTICS QUERIES
// ============================================

// Get overview stats
app.get('/api/sites/:siteId/stats', (req, res) => {
    try {
        const { siteId } = req.params;
        const { period = '30d' } = req.query;
        
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const stats = db.prepare(`
            SELECT
                COUNT(DISTINCT visitor_id) as unique_visitors,
                COUNT(*) as total_pageviews,
                COUNT(DISTINCT session_id) as total_sessions,
                COUNT(DISTINCT DATE(timestamp)) as active_days
            FROM events
            WHERE site_id = ? 
            AND event_type = 'pageview'
            AND timestamp >= ?
        `).get(siteId, startDate.toISOString());
        
        // Previous period for comparison
        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - days);
        
        const prevStats = db.prepare(`
            SELECT
                COUNT(DISTINCT visitor_id) as unique_visitors,
                COUNT(*) as total_pageviews,
                COUNT(DISTINCT session_id) as total_sessions
            FROM events
            WHERE site_id = ? 
            AND event_type = 'pageview'
            AND timestamp >= ?
            AND timestamp < ?
        `).get(siteId, prevStartDate.toISOString(), startDate.toISOString());
        
        const calcChange = (current, previous) => {
            if (!previous || previous === 0) return 0;
            return Math.round(((current - previous) / previous) * 100 * 10) / 10;
        };
        
        res.json({
            ...stats,
            changes: {
                visitors: calcChange(stats.unique_visitors, prevStats.unique_visitors),
                pageviews: calcChange(stats.total_pageviews, prevStats.total_pageviews),
                sessions: calcChange(stats.total_sessions, prevStats.total_sessions)
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get time series data
app.get('/api/sites/:siteId/timeseries', (req, res) => {
    try {
        const { siteId } = req.params;
        const { period = '30d' } = req.query;
        
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const data = db.prepare(`
            SELECT
                DATE(timestamp) as date,
                COUNT(DISTINCT visitor_id) as visitors,
                COUNT(*) as pageviews,
                COUNT(DISTINCT session_id) as sessions
            FROM events
            WHERE site_id = ? 
            AND event_type = 'pageview'
            AND timestamp >= ?
            GROUP BY DATE(timestamp)
            ORDER BY date ASC
        `).all(siteId, startDate.toISOString());
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching timeseries:', error);
        res.status(500).json({ error: 'Failed to fetch timeseries' });
    }
});

// Get top pages
app.get('/api/sites/:siteId/pages', (req, res) => {
    try {
        const { siteId } = req.params;
        const { period = '30d', limit = 10 } = req.query;
        
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const pages = db.prepare(`
            SELECT
                path,
                title,
                COUNT(*) as views,
                COUNT(DISTINCT visitor_id) as unique_visitors
            FROM events
            WHERE site_id = ? 
            AND event_type = 'pageview'
            AND timestamp >= ?
            GROUP BY path
            ORDER BY views DESC
            LIMIT ?
        `).all(siteId, startDate.toISOString(), parseInt(limit));
        
        res.json(pages);
    } catch (error) {
        console.error('Error fetching pages:', error);
        res.status(500).json({ error: 'Failed to fetch pages' });
    }
});

// Get traffic sources
app.get('/api/sites/:siteId/sources', (req, res) => {
    try {
        const { siteId } = req.params;
        const { period = '30d', limit = 10 } = req.query;
        
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const sources = db.prepare(`
            SELECT
                source,
                medium,
                COUNT(DISTINCT visitor_id) as visitors,
                COUNT(*) as pageviews
            FROM events
            WHERE site_id = ? 
            AND event_type = 'pageview'
            AND timestamp >= ?
            GROUP BY source, medium
            ORDER BY visitors DESC
            LIMIT ?
        `).all(siteId, startDate.toISOString(), parseInt(limit));
        
        res.json(sources);
    } catch (error) {
        console.error('Error fetching sources:', error);
        res.status(500).json({ error: 'Failed to fetch sources' });
    }
});

// Get device breakdown
app.get('/api/sites/:siteId/devices', (req, res) => {
    try {
        const { siteId } = req.params;
        const { period = '30d' } = req.query;
        
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const devices = db.prepare(`
            SELECT
                device_type,
                COUNT(DISTINCT visitor_id) as visitors
            FROM events
            WHERE site_id = ? 
            AND event_type = 'pageview'
            AND timestamp >= ?
            GROUP BY device_type
            ORDER BY visitors DESC
        `).all(siteId, startDate.toISOString());
        
        const browsers = db.prepare(`
            SELECT
                browser,
                COUNT(DISTINCT visitor_id) as visitors
            FROM events
            WHERE site_id = ? 
            AND event_type = 'pageview'
            AND timestamp >= ?
            GROUP BY browser
            ORDER BY visitors DESC
        `).all(siteId, startDate.toISOString());
        
        res.json({ devices, browsers });
    } catch (error) {
        console.error('Error fetching devices:', error);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// Get real-time visitors (last 5 minutes)
app.get('/api/sites/:siteId/realtime', (req, res) => {
    try {
        const { siteId } = req.params;
        
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        
        const visitors = db.prepare(`
            SELECT
                visitor_id,
                path,
                title,
                device_type,
                browser,
                country,
                source,
                MAX(timestamp) as last_seen
            FROM events
            WHERE site_id = ? 
            AND timestamp >= ?
            GROUP BY visitor_id
            ORDER BY last_seen DESC
            LIMIT 20
        `).all(siteId, fiveMinutesAgo.toISOString());
        
        const count = db.prepare(`
            SELECT COUNT(DISTINCT visitor_id) as count
            FROM events
            WHERE site_id = ? 
            AND timestamp >= ?
        `).get(siteId, fiveMinutesAgo.toISOString());
        
        res.json({
            count: count.count,
            visitors
        });
    } catch (error) {
        console.error('Error fetching realtime:', error);
        res.status(500).json({ error: 'Failed to fetch realtime data' });
    }
});

// ============================================
// REVENUE TRACKING
// ============================================

// Record a payment/revenue event
app.post('/api/sites/:siteId/revenue', (req, res) => {
    try {
        const { siteId } = req.params;
        const { visitor_id, amount, currency = 'USD', customer_email, product_name } = req.body;
        const id = uuidv4();
        
        db.prepare(`
            INSERT INTO payments (id, site_id, visitor_id, amount, currency, customer_email, product_name)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, siteId, visitor_id, amount, currency, customer_email, product_name);
        
        res.json({ success: true, id });
    } catch (error) {
        console.error('Error recording revenue:', error);
        res.status(500).json({ error: 'Failed to record revenue' });
    }
});

// Get revenue stats
app.get('/api/sites/:siteId/revenue', (req, res) => {
    try {
        const { siteId } = req.params;
        const { period = '30d' } = req.query;
        
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const stats = db.prepare(`
            SELECT
                SUM(amount) as total_revenue,
                COUNT(*) as total_payments,
                AVG(amount) as avg_payment,
                currency
            FROM payments
            WHERE site_id = ?
            AND created_at >= ?
            GROUP BY currency
        `).all(siteId, startDate.toISOString());
        
        const bySource = db.prepare(`
            SELECT
                e.source,
                SUM(p.amount) as revenue,
                COUNT(p.id) as payments
            FROM payments p
            LEFT JOIN events e ON p.visitor_id = e.visitor_id AND p.site_id = e.site_id
            WHERE p.site_id = ?
            AND p.created_at >= ?
            GROUP BY e.source
            ORDER BY revenue DESC
        `).all(siteId, startDate.toISOString());
        
        res.json({ stats, bySource });
    } catch (error) {
        console.error('Error fetching revenue:', error);
        res.status(500).json({ error: 'Failed to fetch revenue' });
    }
});

// ============================================
// TRACKING SCRIPT ENDPOINT
// ============================================

// Serve the tracking script
app.get('/t.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(__dirname, 'tracking-script.js'));
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 TrackFlow Analytics Server Running                   ║
║                                                           ║
║   Dashboard: http://localhost:${PORT}                       ║
║   API:       http://localhost:${PORT}/api                   ║
║   Collect:   http://localhost:${PORT}/collect               ║
║   Script:    http://localhost:${PORT}/t.js                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
