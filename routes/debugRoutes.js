import express from 'express';
import debugFindFlatmate from '../debug-findflatemate.js';

const router = express.Router();

// Debug route for production troubleshooting
router.get('/debug/findflatemate', async (req, res) => {
  try {
    console.log('=== Find Flatmate Debug Route Called ===');
    
    // Capture console.log output
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => {
      const message = args.join(' ');
      logs.push(message);
      originalLog(...args);
    };
    
    // Run debug function
    await debugFindFlatmate();
    
    // Restore console.log
    console.log = originalLog;
    
    // Return debug info as JSON
    res.json({
      timestamp: new Date().toISOString(),
      status: 'completed',
      logs: logs
    });
    
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;