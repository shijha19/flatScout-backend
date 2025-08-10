import Wishlist from '../models/wishlist.models.js';
import NotificationService from './notificationService.js';

class WishlistService {
  
  // Add item to wishlist
  static async addToWishlist(userId, itemData) {
    try {
      const { itemType, itemId, category = 'favorites', notes, tags, priority } = itemData;
      
      // Check if item already exists in wishlist
      const existingItem = await Wishlist.findOne({
        user: userId,
        itemId,
        itemType
      });
      
      if (existingItem) {
        // Update existing item instead of creating duplicate
        existingItem.category = category;
        if (notes) existingItem.notes = notes;
        if (tags) existingItem.tags = tags;
        if (priority) existingItem.priority = priority;
        
        await existingItem.updateSnapshot();
        return { item: existingItem, isNew: false };
      }
      
      // Create new wishlist item
      const wishlistItem = new Wishlist({
        user: userId,
        itemType,
        itemId,
        itemModel: this.getModelName(itemType),
        category,
        notes,
        tags,
        priority
      });
      
      await wishlistItem.save();
      await wishlistItem.updateSnapshot();
      
      // Send notification for successful addition
      await NotificationService.createNotification({
        userId,
        type: 'wishlist_added',
        title: 'Item Added to Wishlist',
        message: `${wishlistItem.itemSnapshot.title} has been added to your ${category} list`,
        metadata: {
          itemType,
          itemId,
          category
        }
      });
      
      return { item: wishlistItem, isNew: true };
      
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw new Error(`Failed to add item to wishlist: ${error.message}`);
    }
  }
  
  // Remove item from wishlist
  static async removeFromWishlist(userId, itemId, itemType) {
    try {
      const wishlistItem = await Wishlist.findOneAndDelete({
        user: userId,
        itemId,
        itemType
      });
      
      if (!wishlistItem) {
        throw new Error('Item not found in wishlist');
      }
      
      return wishlistItem;
      
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw new Error(`Failed to remove item from wishlist: ${error.message}`);
    }
  }
  
  // Update wishlist item
  static async updateWishlistItem(userId, wishlistItemId, updateData) {
    try {
      const { category, notes, tags, priority, reminderDate } = updateData;
      
      const wishlistItem = await Wishlist.findOne({
        _id: wishlistItemId,
        user: userId
      });
      
      if (!wishlistItem) {
        throw new Error('Wishlist item not found');
      }
      
      // Update fields
      if (category) wishlistItem.category = category;
      if (notes !== undefined) wishlistItem.notes = notes;
      if (tags) wishlistItem.tags = tags;
      if (priority) wishlistItem.priority = priority;
      if (reminderDate) wishlistItem.reminderDate = reminderDate;
      
      await wishlistItem.save();
      await wishlistItem.updateSnapshot();
      
      return wishlistItem;
      
    } catch (error) {
      console.error('Error updating wishlist item:', error);
      throw new Error(`Failed to update wishlist item: ${error.message}`);
    }
  }
  
  // Get user's wishlist with filters
  static async getUserWishlist(userId, filters = {}) {
    try {
      const { category, itemType, tags, sortBy, limit, page = 1 } = filters;
      
      const options = {
        category,
        itemType,
        tags,
        sortBy,
        limit: limit || 20
      };
      
      const skip = (page - 1) * (limit || 20);
      
      const items = await Wishlist.findByUser(userId, options)
        .skip(skip)
        .lean();
      
      const totalCount = await Wishlist.countDocuments({
        user: userId,
        ...(category && { category }),
        ...(itemType && { itemType }),
        ...(tags && tags.length > 0 && { tags: { $in: tags } })
      });
      
      return {
        items,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / (limit || 20)),
        hasNextPage: page < Math.ceil(totalCount / (limit || 20))
      };
      
    } catch (error) {
      console.error('Error getting user wishlist:', error);
      throw new Error(`Failed to get wishlist: ${error.message}`);
    }
  }
  
  // Get wishlist categories with counts
  static async getWishlistCategories(userId) {
    try {
      const categories = await Wishlist.getCategories(userId);
      
      // Add default categories if they don't exist
      const defaultCategories = ['favorites', 'maybe', 'contacted', 'visited', 'applied'];
      const existingCategories = categories.map(cat => cat._id);
      
      defaultCategories.forEach(category => {
        if (!existingCategories.includes(category)) {
          categories.push({
            _id: category,
            count: 0,
            lastAdded: null
          });
        }
      });
      
      return categories.sort((a, b) => {
        const order = { favorites: 0, maybe: 1, contacted: 2, visited: 3, applied: 4 };
        return (order[a._id] || 999) - (order[b._id] || 999);
      });
      
    } catch (error) {
      console.error('Error getting wishlist categories:', error);
      throw new Error(`Failed to get categories: ${error.message}`);
    }
  }
  
  // Get user's tags
  static async getUserTags(userId) {
    try {
      return await Wishlist.getUserTags(userId);
    } catch (error) {
      console.error('Error getting user tags:', error);
      throw new Error(`Failed to get tags: ${error.message}`);
    }
  }
  
  // Check if item is in wishlist
  static async isInWishlist(userId, itemId, itemType) {
    try {
      const item = await Wishlist.findOne({
        user: userId,
        itemId,
        itemType
      }).lean();
      
      return {
        isInWishlist: !!item,
        category: item?.category,
        wishlistId: item?._id
      };
      
    } catch (error) {
      console.error('Error checking wishlist status:', error);
      return { isInWishlist: false };
    }
  }
  
  // Bulk operations
  static async bulkRemove(userId, wishlistItemIds) {
    try {
      const result = await Wishlist.deleteMany({
        _id: { $in: wishlistItemIds },
        user: userId
      });
      
      return result;
      
    } catch (error) {
      console.error('Error in bulk remove:', error);
      throw new Error(`Failed to remove items: ${error.message}`);
    }
  }
  
  static async bulkUpdateCategory(userId, wishlistItemIds, newCategory) {
    try {
      const result = await Wishlist.updateMany(
        {
          _id: { $in: wishlistItemIds },
          user: userId
        },
        { category: newCategory }
      );
      
      return result;
      
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw new Error(`Failed to update items: ${error.message}`);
    }
  }
  
  // Refresh snapshots for all user items
  static async refreshSnapshots(userId) {
    try {
      const items = await Wishlist.find({ user: userId });
      
      for (const item of items) {
        await item.updateSnapshot();
      }
      
      return { updated: items.length };
      
    } catch (error) {
      console.error('Error refreshing snapshots:', error);
      throw new Error(`Failed to refresh snapshots: ${error.message}`);
    }
  }
  
  // Get similar items based on user's wishlist
  static async getSimilarItems(userId, limit = 10) {
    try {
      // This is a simplified implementation
      // In production, you might use ML algorithms or more sophisticated matching
      const userItems = await Wishlist.find({ user: userId })
        .populate('item')
        .limit(50);
      
      if (userItems.length === 0) {
        return [];
      }
      
      // Extract common characteristics
      const characteristics = {
        locations: [],
        priceRanges: [],
        types: []
      };
      
      userItems.forEach(item => {
        if (item.itemSnapshot) {
          if (item.itemSnapshot.location) {
            characteristics.locations.push(item.itemSnapshot.location);
          }
          if (item.itemSnapshot.price) {
            characteristics.priceRanges.push(item.itemSnapshot.price);
          }
          characteristics.types.push(item.itemType);
        }
      });
      
      return {
        characteristics,
        recommendedSearchTerms: [...new Set(characteristics.locations)].slice(0, 5)
      };
      
    } catch (error) {
      console.error('Error getting similar items:', error);
      throw new Error(`Failed to get recommendations: ${error.message}`);
    }
  }
  
  // Helper method to get model name from item type
  static getModelName(itemType) {
    const modelMap = {
      'flat': 'FlatListing',
      'flatmate': 'FlatmateProfile',
      'pg': 'PG'
    };
    return modelMap[itemType] || 'FlatListing';
  }
  
  // Set reminder for wishlist item
  static async setReminder(userId, wishlistItemId, reminderDate) {
    try {
      const wishlistItem = await Wishlist.findOne({
        _id: wishlistItemId,
        user: userId
      });
      
      if (!wishlistItem) {
        throw new Error('Wishlist item not found');
      }
      
      wishlistItem.reminderDate = reminderDate;
      wishlistItem.reminderSent = false;
      await wishlistItem.save();
      
      // Schedule notification (this would typically use a job queue in production)
      await NotificationService.createNotification({
        userId,
        type: 'reminder',
        title: 'Wishlist Reminder',
        message: `Don't forget to check: ${wishlistItem.itemSnapshot.title}`,
        scheduledFor: reminderDate,
        metadata: {
          wishlistItemId,
          itemType: wishlistItem.itemType,
          itemId: wishlistItem.itemId
        }
      });
      
      return wishlistItem;
      
    } catch (error) {
      console.error('Error setting reminder:', error);
      throw new Error(`Failed to set reminder: ${error.message}`);
    }
  }
}

export default WishlistService;
