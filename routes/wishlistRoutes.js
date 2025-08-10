import express from 'express';
import WishlistService from '../services/wishlistService.js';
import User from '../models/user.models.js';

const router = express.Router();

// Helper function to get user ID from email
const getUserIdFromEmail = async (userEmail) => {
  if (!userEmail) throw new Error('User email is required');
  const user = await User.findOne({ email: userEmail });
  if (!user) throw new Error('User not found');
  return user._id;
};

// Add item to wishlist
router.post('/add', async (req, res) => {
  try {
    const { itemType, itemId, category, notes, tags, priority, userEmail } = req.body;
    
    // Validation
    if (!itemType || !itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item type and ID are required'
      });
    }
    
    if (!['flat', 'flatmate', 'pg'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item type'
      });
    }

    const userId = await getUserIdFromEmail(userEmail);
    
    const result = await WishlistService.addToWishlist(userId, {
      itemType,
      itemId,
      category,
      notes,
      tags,
      priority
    });
    
    res.status(result.isNew ? 201 : 200).json({
      success: true,
      message: result.isNew ? 'Item added to wishlist' : 'Item updated in wishlist',
      data: result.item
    });
    
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add item to wishlist'
    });
  }
});

// Remove item from wishlist
router.delete('/remove', async (req, res) => {
  try {
    const { itemId, itemType, userEmail } = req.body;
    
    if (!itemType || !itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item type and ID are required'
      });
    }

    const userId = await getUserIdFromEmail(userEmail);
    
    const removedItem = await WishlistService.removeFromWishlist(userId, itemId, itemType);
    
    res.json({
      success: true,
      message: 'Item removed from wishlist',
    });
    
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to remove item from wishlist'
    });
  }
});

router.put('/update/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const wishlistItemId = req.params.id;
    const updateData = req.body;
    
    const updatedItem = await WishlistService.updateWishlistItem(
      userId,
      wishlistItemId,
      updateData
    );
    
    res.json({
      success: true,
      message: 'Wishlist item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('Error updating wishlist item:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to update wishlist item'
    });
  }
});

// Get user's wishlist
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      itemType, 
      tags, 
      sortBy, 
      limit, 
      page,
      userEmail 
    } = req.query;

    const userId = await getUserIdFromEmail(userEmail);
    
    const filters = {
      category,
      itemType,
      tags: tags ? tags.split(',') : undefined,
      sortBy,
      limit: limit ? parseInt(limit) : undefined,
      page: page ? parseInt(page) : 1
    };
    
    const wishlist = await WishlistService.getUserWishlist(userId, filters);
    
    res.json({
      success: true,
      data: wishlist
    });
    
  } catch (error) {
    console.error('Error getting wishlist:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get wishlist'
    });
  }
});

// Get wishlist categories
router.get('/categories', async (req, res) => {
  try {
    const { userEmail } = req.query;
    const userId = await getUserIdFromEmail(userEmail);
    const categories = await WishlistService.getWishlistCategories(userId);
    
    res.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get categories'
    });
  }
});
router.get('/tags', async (req, res) => {
  try {
    let userId;

    if (req.user && req.user.id) {
      userId = req.user.id;
    } else if (req.query.userEmail) {
      userId = await getUserIdFromEmail(req.query.userEmail);
    } else {
      return res.status(400).json({
        success: false,
        message: 'User information is required'
      });
    }

    const tags = await WishlistService.getUserTags(userId);

    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get tags'
    });
  }
});

// Get user tags

router.get('/tags', async (req, res) => {
  try {
    const { userEmail } = req.query;
    const userId = await getUserIdFromEmail(userEmail);
    const tags = await WishlistService.getUserTags(userId);
    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get tags'
    });
  }
});
// Check if item is in wishlist
router.get('/check/:itemType/:itemId', async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const { userEmail } = req.query;

    const userId = await getUserIdFromEmail(userEmail);
    
    const status = await WishlistService.isInWishlist(userId, itemId, itemType);
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('Error checking wishlist status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check wishlist status'
    });
  }
});

// Bulk operations
router.post('/bulk/remove', async (req, res) => {
  try {
    const userId = req.user.id;
    const { wishlistItemIds } = req.body;
    
    if (!Array.isArray(wishlistItemIds) || wishlistItemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Wishlist item IDs array is required'
      });
    }
    
    const result = await WishlistService.bulkRemove(userId, wishlistItemIds);
    
    res.json({
      success: true,
      message: `${result.deletedCount} items removed from wishlist`,
      data: { deletedCount: result.deletedCount }
    });
    
  } catch (error) {
    console.error('Error in bulk remove:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove items'
    });
  }
});

router.post('/bulk/category', async (req, res) => {
  try {
    const userId = req.user.id;
    const { wishlistItemIds, category } = req.body;
    
    if (!Array.isArray(wishlistItemIds) || wishlistItemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Wishlist item IDs array is required'
      });
    }
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }
    
    const result = await WishlistService.bulkUpdateCategory(userId, wishlistItemIds, category);
    
    res.json({
      success: true,
      message: `${result.modifiedCount} items updated`,
      data: { modifiedCount: result.modifiedCount }
    });
    
  } catch (error) {
    console.error('Error in bulk category update:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update items'
    });
  }
});

// Set reminder
router.post('/reminder/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const wishlistItemId = req.params.id;
    const { reminderDate } = req.body;
    
    if (!reminderDate) {
      return res.status(400).json({
        success: false,
        message: 'Reminder date is required'
      });
    }
    
    const reminderDateTime = new Date(reminderDate);
    if (reminderDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reminder date must be in the future'
      });
    }
    
    const updatedItem = await WishlistService.setReminder(
      userId,
      wishlistItemId,
      reminderDateTime
    );
    
    res.json({
      success: true,
      message: 'Reminder set successfully',
      data: updatedItem
    });
    
  } catch (error) {
    console.error('Error setting reminder:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to set reminder'
    });
  }
});

// Get recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit } = req.query;
    
    const recommendations = await WishlistService.getSimilarItems(
      userId,
      limit ? parseInt(limit) : 10
    );
    
    res.json({
      success: true,
      data: recommendations
    });
    
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get recommendations'
    });
  }
});

// Refresh snapshots
router.post('/refresh-snapshots', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await WishlistService.refreshSnapshots(userId);
    
    res.json({
      success: true,
      message: `${result.updated} items updated`,
      data: result
    });
    
  } catch (error) {
    console.error('Error refreshing snapshots:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to refresh snapshots'
    });
  }
});

export default router;
