import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function removeReportIdIndex() {
  try {
    // Connect to MongoDB Atlas using the same URI as the main app
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // Get the reports collection
    const db = mongoose.connection.db;
    const collection = db.collection('reports');

    // Check if collection exists and list indexes
    try {
      const indexes = await collection.indexes();
      console.log('Current indexes on reports collection:');
      indexes.forEach(index => {
        console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
      });

      // Try to drop the reportId index if it exists
      const reportIdIndex = indexes.find(index => index.name === 'reportId_1');
      if (reportIdIndex) {
        console.log('Found reportId_1 index, attempting to drop it...');
        await collection.dropIndex('reportId_1');
        console.log('✅ Successfully dropped reportId_1 index');
        
        // Verify it's been removed
        const indexesAfter = await collection.indexes();
        console.log('Remaining indexes:', indexesAfter.map(i => i.name));
      } else {
        console.log('❌ reportId_1 index does not exist');
      }

    } catch (error) {
      if (error.code === 26) {
        console.log('Reports collection does not exist yet');
      } else {
        console.error('Error working with collection:', error);
      }
    }

    // List all collections to see what exists
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    // Also check if there are any documents with null reportId that we need to clean up
    try {
      const nullReportIdDocs = await collection.find({ reportId: null }).toArray();
      console.log(`Found ${nullReportIdDocs.length} documents with null reportId`);
      
      if (nullReportIdDocs.length > 0) {
        // Remove the reportId field from all documents (since it's not in your schema)
        const result = await collection.updateMany(
          {},
          { $unset: { reportId: "" } }
        );
        console.log(`✅ Removed reportId field from ${result.modifiedCount} documents`);
      }
    } catch (error) {
      console.error('Error cleaning up documents:', error);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

removeReportIdIndex();