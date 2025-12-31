/**
 * TrackFlow Analytics - Lightweight Tracking Script
 * Version: 1.0.0
 * Size: ~4KB minified
 * 
 * Privacy-first analytics tracking
 * - No cookies by default
 * - GDPR compliant
 * - Respects Do Not Track
 */

(function(window, document) {
    'use strict';

    // Configuration
    const config = {
        endpoint: 'https://api.trackflow.io/collect', // Replace with your API endpoint
        siteId: null,
        trackPageviews: true,
        trackOutboundLinks: true,
        trackDownloads: true,
        trackSearchQueries: true,
        respectDNT: true,
        hashMode: false, // For SPAs using hash routing
        debug: false
    };

    // Utility functions
    const log = (...args) => config.debug && console.log('[TrackFlow]', ...args);
    
    const generateId = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    };

    // Session management (using sessionStorage, not cookies)
    const getSessionId = () => {
        let sessionId = sessionStorage.getItem('tf_session');
        if (!sessionId) {
            sessionId = generateId();
            sessionStorage.setItem('tf_session', sessionId);
        }
        return sessionId;
    };

    // Visitor ID (fingerprint-free, privacy-respecting)
    const getVisitorId = () => {
        let visitorId = localStorage.getItem('tf_visitor');
        if (!visitorId) {
            visitorId = generateId();
            localStorage.setItem('tf_visitor', visitorId);
        }
        return visitorId;
    };

    // Check if tracking should be disabled
    const shouldTrack = () => {
        // Respect Do Not Track
        if (config.respectDNT && (navigator.doNotTrack === '1' || window.doNotTrack === '1')) {
            log('Do Not Track enabled, skipping');
            return false;
        }
        
        // Don't track bots
        if (/bot|crawler|spider|crawling/i.test(navigator.userAgent)) {
            log('Bot detected, skipping');
            return false;
        }
        
        // Don't track localhost by default
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            log('Localhost detected, skipping');
            return false;
        }
        
        return true;
    };

    // Get referrer info
    const getReferrer = () => {
        const ref = document.referrer;
        if (!ref) return { source: 'direct', medium: 'none', referrer: null };
        
        try {
            const url = new URL(ref);
            const hostname = url.hostname.replace('www.', '');
            
            // Social media
            if (/facebook\.com|fb\.com/i.test(hostname)) return { source: 'facebook', medium: 'social', referrer: ref };
            if (/twitter\.com|x\.com|t\.co/i.test(hostname)) return { source: 'twitter', medium: 'social', referrer: ref };
            if (/linkedin\.com/i.test(hostname)) return { source: 'linkedin', medium: 'social', referrer: ref };
            if (/instagram\.com/i.test(hostname)) return { source: 'instagram', medium: 'social', referrer: ref };
            if (/reddit\.com/i.test(hostname)) return { source: 'reddit', medium: 'social', referrer: ref };
            if (/youtube\.com/i.test(hostname)) return { source: 'youtube', medium: 'social', referrer: ref };
            if (/tiktok\.com/i.test(hostname)) return { source: 'tiktok', medium: 'social', referrer: ref };
            
            // Search engines
            if (/google\./i.test(hostname)) return { source: 'google', medium: 'organic', referrer: ref };
            if (/bing\.com/i.test(hostname)) return { source: 'bing', medium: 'organic', referrer: ref };
            if (/duckduckgo\.com/i.test(hostname)) return { source: 'duckduckgo', medium: 'organic', referrer: ref };
            if (/yahoo\./i.test(hostname)) return { source: 'yahoo', medium: 'organic', referrer: ref };
            if (/baidu\.com/i.test(hostname)) return { source: 'baidu', medium: 'organic', referrer: ref };
            
            // Product launches
            if (/producthunt\.com/i.test(hostname)) return { source: 'producthunt', medium: 'referral', referrer: ref };
            if (/hackernews|news\.ycombinator/i.test(hostname)) return { source: 'hackernews', medium: 'referral', referrer: ref };
            
            // Default referral
            return { source: hostname, medium: 'referral', referrer: ref };
        } catch (e) {
            return { source: 'unknown', medium: 'unknown', referrer: ref };
        }
    };

    // Get UTM parameters
    const getUTMParams = () => {
        const params = new URLSearchParams(location.search);
        return {
            utm_source: params.get('utm_source'),
            utm_medium: params.get('utm_medium'),
            utm_campaign: params.get('utm_campaign'),
            utm_term: params.get('utm_term'),
            utm_content: params.get('utm_content'),
            ref: params.get('ref') || params.get('via')
        };
    };

    // Get device info
    const getDeviceInfo = () => {
        const ua = navigator.userAgent;
        
        // Device type
        let deviceType = 'desktop';
        if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
            deviceType = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
        }
        
        // Browser
        let browser = 'unknown';
        if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) browser = 'chrome';
        else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'safari';
        else if (/Firefox/i.test(ua)) browser = 'firefox';
        else if (/Edge|Edg/i.test(ua)) browser = 'edge';
        else if (/MSIE|Trident/i.test(ua)) browser = 'ie';
        else if (/Opera|OPR/i.test(ua)) browser = 'opera';
        
        // OS
        let os = 'unknown';
        if (/Windows/i.test(ua)) os = 'windows';
        else if (/Mac OS/i.test(ua)) os = 'macos';
        else if (/Linux/i.test(ua)) os = 'linux';
        else if (/Android/i.test(ua)) os = 'android';
        else if (/iOS|iPhone|iPad|iPod/i.test(ua)) os = 'ios';
        
        return {
            deviceType,
            browser,
            os,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            language: navigator.language || navigator.userLanguage,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    };

    // Send event to server
    const sendEvent = (eventType, eventData = {}) => {
        if (!shouldTrack()) return;
        if (!config.siteId) {
            log('No site ID configured');
            return;
        }

        const referrer = getReferrer();
        const utm = getUTMParams();
        const device = getDeviceInfo();

        const payload = {
            site_id: config.siteId,
            visitor_id: getVisitorId(),
            session_id: getSessionId(),
            event_type: eventType,
            timestamp: new Date().toISOString(),
            
            // Page info
            url: location.href,
            path: location.pathname,
            hostname: location.hostname,
            title: document.title,
            
            // Referrer & UTM
            ...referrer,
            ...utm,
            
            // Device info
            ...device,
            
            // Custom event data
            ...eventData
        };

        log('Sending event:', eventType, payload);

        // Use sendBeacon for reliability (fires even on page unload)
        if (navigator.sendBeacon) {
            navigator.sendBeacon(config.endpoint, JSON.stringify(payload));
        } else {
            // Fallback to fetch
            fetch(config.endpoint, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
                keepalive: true
            }).catch(err => log('Error sending event:', err));
        }
    };

    // Track pageview
    const trackPageview = () => {
        if (!config.trackPageviews) return;
        sendEvent('pageview');
    };

    // Track custom event
    const trackEvent = (name, properties = {}) => {
        sendEvent('event', { event_name: name, ...properties });
    };

    // Track goal/conversion
    const trackGoal = (goalId, revenue = null) => {
        sendEvent('goal', { goal_id: goalId, revenue });
    };

    // Track outbound link clicks
    const trackOutboundLinks = () => {
        if (!config.trackOutboundLinks) return;
        
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            
            const href = link.href;
            if (!href) return;
            
            try {
                const url = new URL(href);
                if (url.hostname !== location.hostname) {
                    sendEvent('outbound_click', {
                        outbound_url: href,
                        outbound_host: url.hostname
                    });
                }
            } catch (e) {}
        });
    };

    // Track file downloads
    const trackDownloads = () => {
        if (!config.trackDownloads) return;
        
        const downloadExtensions = /\.(pdf|zip|rar|7z|tar|gz|exe|dmg|pkg|deb|rpm|doc|docx|xls|xlsx|ppt|pptx|csv|mp3|mp4|avi|mov|wav)$/i;
        
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            
            const href = link.href;
            if (href && downloadExtensions.test(href)) {
                sendEvent('download', {
                    file_url: href,
                    file_name: href.split('/').pop()
                });
            }
        });
    };

    // Track search queries (from URL params)
    const trackSearchQueries = () => {
        if (!config.trackSearchQueries) return;
        
        const params = new URLSearchParams(location.search);
        const searchParams = ['q', 'query', 'search', 's', 'keyword', 'keywords'];
        
        for (const param of searchParams) {
            const value = params.get(param);
            if (value) {
                sendEvent('search', { search_query: value });
                break;
            }
        }
    };

    // Handle SPA navigation
    const setupSPATracking = () => {
        // Track history changes (pushState/replaceState)
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(...args) {
            originalPushState.apply(this, args);
            trackPageview();
        };
        
        history.replaceState = function(...args) {
            originalReplaceState.apply(this, args);
            trackPageview();
        };
        
        // Track popstate (back/forward buttons)
        window.addEventListener('popstate', trackPageview);
        
        // Track hash changes if in hash mode
        if (config.hashMode) {
            window.addEventListener('hashchange', trackPageview);
        }
    };

    // Track time on page
    let pageStartTime = Date.now();
    const trackTimeOnPage = () => {
        const duration = Math.round((Date.now() - pageStartTime) / 1000);
        if (duration > 0) {
            sendEvent('engagement', { duration_seconds: duration });
        }
    };

    // Track on page unload
    window.addEventListener('beforeunload', trackTimeOnPage);
    window.addEventListener('pagehide', trackTimeOnPage);

    // Track visibility changes (tab switching)
    let hiddenTime = 0;
    let hiddenStart = 0;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            hiddenStart = Date.now();
        } else if (hiddenStart) {
            hiddenTime += Date.now() - hiddenStart;
            hiddenStart = 0;
        }
    });

    // Initialize
    const init = () => {
        // Get site ID from script tag
        const script = document.currentScript || document.querySelector('script[data-site]');
        if (script) {
            config.siteId = script.getAttribute('data-site');
            
            // Optional config from attributes
            if (script.getAttribute('data-track-outbound') === 'false') config.trackOutboundLinks = false;
            if (script.getAttribute('data-track-downloads') === 'false') config.trackDownloads = false;
            if (script.getAttribute('data-hash-mode') === 'true') config.hashMode = true;
            if (script.getAttribute('data-debug') === 'true') config.debug = true;
            if (script.getAttribute('data-endpoint')) config.endpoint = script.getAttribute('data-endpoint');
        }

        log('Initializing with config:', config);

        // Setup tracking
        trackPageview();
        trackOutboundLinks();
        trackDownloads();
        trackSearchQueries();
        setupSPATracking();
    };

    // Expose public API
    window.TrackFlow = {
        track: trackEvent,
        trackEvent,
        trackGoal,
        trackPageview,
        config: (options) => Object.assign(config, options),
        identify: (userId, traits = {}) => {
            sendEvent('identify', { user_id: userId, ...traits });
        },
        revenue: (amount, currency = 'USD', metadata = {}) => {
            sendEvent('revenue', { amount, currency, ...metadata });
        }
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window, document);
