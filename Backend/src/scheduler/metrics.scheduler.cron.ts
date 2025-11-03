import cron from 'node-cron';
import { MetricsSchedulerJob } from './metrics.scheduler.job';

// Schedule job to run every day at 11:00 PM
// ┌───────────── minute (0 - 59)
// │ ┌───────────── hour (0 - 23)
// │ │ ┌───────────── day of month (1 - 31)
// │ │ │ ┌───────────── month (1 - 12)
// │ │ │ │ ┌───────────── day of week (0 - 6, Sunday=0)
// │ │ │ │ │
cron.schedule('0 23 * * *', async () => {
  console.log('🕚 Running daily metrics job at 11:00 PM...');
  try {
    await MetricsSchedulerJob.runAll();
    console.log('✅ Metrics computation completed for all periods.');
  } catch (error) {
    console.error('❌ Error running daily metrics job:', error);
  }
});
