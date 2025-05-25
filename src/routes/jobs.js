const express = require('express');
const router = express.Router();
const Queue = require('bull');
const { JobNotFoundError } = require('../middleware/errorHandler');

// Initialize Redis queue (if Redis is available)
let jobQueue = null;
if (process.env.REDIS_URL) {
  jobQueue = new Queue('document-processing', process.env.REDIS_URL, {
    defaultJobOptions: {
      attempts: parseInt(process.env.JOB_ATTEMPTS) || 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: false,
      removeOnFail: false
    }
  });

  // Process jobs
  jobQueue.process('convert', async (job) => {
    const { type, file, options } = job.data;
    console.log(`Processing job ${job.id}: ${type} conversion`);
    
    // TODO: Implement actual conversion processing
    // This would call the appropriate service based on type
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      result: `Processed ${type} conversion for ${file.originalname}`
    };
  });

  // Log job events
  jobQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed:`, result);
  });

  jobQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err);
  });
}

// Get job status
router.get('/:jobId/status', async (req, res, next) => {
  try {
    if (!jobQueue) {
      return res.status(503).json({
        error: 'Job queue not available',
        message: 'Async processing requires Redis connection'
      });
    }

    const { jobId } = req.params;
    const job = await jobQueue.getJob(jobId);

    if (!job) {
      throw new JobNotFoundError(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const progress = job.progress();

    const response = {
      jobId: job.id,
      state: state,
      progress: progress,
      createdAt: new Date(job.timestamp).toISOString(),
      processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
    };

    if (state === 'completed') {
      response.result = job.returnvalue;
    } else if (state === 'failed') {
      response.error = job.failedReason;
      response.attemptsMade = job.attemptsMade;
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Download job result
router.get('/:jobId/download', async (req, res, next) => {
  try {
    if (!jobQueue) {
      return res.status(503).json({
        error: 'Job queue not available',
        message: 'Async processing requires Redis connection'
      });
    }

    const { jobId } = req.params;
    const job = await jobQueue.getJob(jobId);

    if (!job) {
      throw new JobNotFoundError(`Job ${jobId} not found`);
    }

    const state = await job.getState();

    if (state !== 'completed') {
      return res.status(400).json({
        error: 'Job not ready',
        message: `Job is in ${state} state`,
        jobId: jobId
      });
    }

    // TODO: Retrieve actual file from storage
    // For now, return a placeholder response
    const result = job.returnvalue;

    res.json({
      jobId: jobId,
      message: 'File download endpoint - to be implemented',
      result: result
    });
  } catch (error) {
    next(error);
  }
});

// Cancel a job
router.delete('/:jobId', async (req, res, next) => {
  try {
    if (!jobQueue) {
      return res.status(503).json({
        error: 'Job queue not available',
        message: 'Async processing requires Redis connection'
      });
    }

    const { jobId } = req.params;
    const job = await jobQueue.getJob(jobId);

    if (!job) {
      throw new JobNotFoundError(`Job ${jobId} not found`);
    }

    const state = await job.getState();

    if (state === 'completed' || state === 'failed') {
      return res.status(400).json({
        error: 'Cannot cancel job',
        message: `Job already ${state}`
      });
    }

    await job.remove();

    res.json({
      success: true,
      message: `Job ${jobId} cancelled`,
      jobId: jobId
    });
  } catch (error) {
    next(error);
  }
});

// List all jobs (admin endpoint)
router.get('/', async (req, res, next) => {
  try {
    if (!jobQueue) {
      return res.status(503).json({
        error: 'Job queue not available',
        message: 'Async processing requires Redis connection'
      });
    }

    const { state = 'all', limit = 20, offset = 0 } = req.query;

    let jobs = [];
    if (state === 'all') {
      const states = ['waiting', 'active', 'completed', 'failed', 'delayed'];
      for (const s of states) {
        const stateJobs = await jobQueue.getJobs([s], offset, offset + limit - 1);
        jobs = jobs.concat(stateJobs);
      }
    } else {
      jobs = await jobQueue.getJobs([state], offset, offset + limit - 1);
    }

    const jobList = await Promise.all(jobs.map(async (job) => {
      const state = await job.getState();
      return {
        jobId: job.id,
        state: state,
        progress: job.progress(),
        createdAt: new Date(job.timestamp).toISOString(),
        data: {
          type: job.data.type,
          filename: job.data.file?.originalname
        }
      };
    }));

    res.json({
      jobs: jobList,
      total: jobs.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
