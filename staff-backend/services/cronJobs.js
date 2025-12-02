const cron = require('node-cron');
const { getUpcomingEvents } = require('./forecastingService');

let io = null;

/**
 * Initialize cron jobs with Socket.IO instance
 * @param {Object} socketIO - Socket.IO server instance
 */
const initializeCronJobs = (socketIO) => {
    io = socketIO;
    console.log('📅 Initializing cron jobs...');

    // Run every 15 minutes to check for upcoming events
    cron.schedule('*/15 * * * *', async () => {
        console.log('🔄 [CRON] Checking for upcoming events (12 hour window)...');
        try {
            const events = await getUpcomingEvents(12);

            const dischargeCount = events.discharges?.length || 0;
            const surgeryCount = events.surgeries?.length || 0;

            console.log(`✅ [CRON] Found ${dischargeCount} upcoming discharges, ${surgeryCount} upcoming surgeries`);

            // Emit to all connected clients
            io.emit('forecasting:updated', events);

        } catch (error) {
            console.error('❌ [CRON] Error fetching upcoming events:', error);
        }
    });

    // Also run immediately on startup
    (async () => {
        console.log('🔄 [CRON] Running initial check for upcoming events...');
        try {
            const events = await getUpcomingEvents(12);
            const dischargeCount = events.discharges?.length || 0;
            const surgeryCount = events.surgeries?.length || 0;

            console.log(`✅ [CRON] Initial check - ${dischargeCount} upcoming discharges, ${surgeryCount} upcoming surgeries`);
            io.emit('forecasting:updated', events);
        } catch (error) {
            console.error('❌ [CRON] Error in initial check:', error);
        }
    })();

    console.log('✅ Cron jobs initialized - checking for events every 15 minutes');
};

module.exports = { initializeCronJobs };
