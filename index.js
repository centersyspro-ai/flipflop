'use strict';

const express = require("express");
const bodyParser = require("body-parser");
const catalyst = require("zcatalyst-sdk-node");


const app = express();
app.use(bodyParser.json());

// ============================================
// CLIQ API CONFIGURATION
// ============================================
const CLIQ_CONFIG = {
  ACCESS_TOKEN: "Your_Token",
  DOMAIN: "https://cliq.zoho.in",
  REFRESH_TOKEN: "Your_Token",
  CLIENT_ID: "Your_Token",
  CLIENT_SECRET: "Your_Token"
};

// ============================================
// CORS MIDDLEWARE - ENABLE CROSS-ORIGIN REQUESTS
// ============================================
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

app.get("/auth/check", async (req, res) => {
  try {
    console.log('🔐 Auth check requested');
    
    const catalystApp = catalyst.initialize(req);
    
    try {
      const userManagement = catalystApp.userManagement();
      const currentUser = await userManagement.getCurrentUser();
      
      if (currentUser && currentUser.user_id) {
        console.log('User authenticated:', currentUser.email_id);
        
        return res.json({
          success: true,
          authenticated: true,
          user: {
            id: currentUser.user_id,
            email: currentUser.email_id,
            name: currentUser.first_name + ' ' + currentUser.last_name
          }
        });
      }
    } catch (userError) {
      console.log('No authenticated user:', userError.message);
    }
    
    return res.json({
      success: true,
      authenticated: false,
      message: "User not authenticated"
    });
    
  } catch (err) {
    console.error("Error checking auth:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
});

app.get("/auth/logout", async (req, res) => {
  try {
    console.log('🚪 Logout requested');
    
    const catalystApp = catalyst.initialize(req);
    
    try {
      const userManagement = catalystApp.userManagement();
      await userManagement.logoutUser();
      console.log('User logged out from Catalyst');
    } catch (logoutError) {
      console.log('Note: Logout attempt:', logoutError.message);
    }
    
    res.redirect('/__catalyst/auth/login');
    
  } catch (err) {
    console.error("Error during logout:", err);
    res.redirect('/__catalyst/auth/login');
  }
});



// ============================================
// GET USER RATINGS ENDPOINT - FIXED WITH QUERY
// ============================================
app.get("/getUserRatings", async (req, res) => {
  try {
    console.log('Get user ratings requested');
    
    const catalystApp = catalyst.initialize(req);
    
    let currentUser;
    try {
      const userManagement = catalystApp.userManagement();
      currentUser = await userManagement.getCurrentUser();
      
      if (!currentUser || !currentUser.user_id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }
      
      console.log('Current user ID:', currentUser.user_id);
      console.log('Current user email:', currentUser.email_id);
      
    } catch (userError) {
      console.error('User auth error:', userError);
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }
    
    const datastore = catalystApp.datastore();
    const ratingsTable = datastore.table("Ratings");
    
    try {
      const currentUserId = String(currentUser.user_id);
      const userRatings = {};
      
      console.log('🔍 Querying ratings for user_id:', currentUserId);
      
      try {
        // USE ZCQL QUERY INSTEAD OF getAllRows()
        const zcql = catalystApp.zcql();
        const query = `SELECT * FROM Ratings WHERE user_id = '${currentUserId}'`;
        
        console.log('Executing query:', query);
        
        const result = await zcql.executeZCQLQuery(query);
        
        console.log('Query result:', JSON.stringify(result, null, 2));
        
        if (result && Array.isArray(result)) {
          console.log('Found', result.length, 'ratings for user');
          
          result.forEach(rating => {
            const chapterId = String(rating.Ratings.chapter_id);
            const ratingValue = Number(rating.Ratings.rating);
            
            if (chapterId && ratingValue > 0) {
              if (!userRatings[chapterId]) {
                userRatings[chapterId] = {
                  rating: ratingValue,
                  timestamp: rating.Ratings.CREATEDTIME
                };
                console.log('Added rating for chapter:', chapterId, 'rating:', ratingValue);
              } else {
                console.log('Duplicate found for chapter:', chapterId);
              }
            }
          });
        }
      } catch (queryError) {
        console.error('ZCQL query failed:', queryError);
        console.log('Falling back to getAllRows...');
        
        // FALLBACK: Use getAllRows if ZCQL fails
        const allRatings = await ratingsTable.getAllRows();
        console.log('Total ratings in DB (fallback):', allRatings.length);
        
        allRatings.forEach(rating => {
          const ratingUserId = String(rating.user_id || '');
          const ratingChapterId = String(rating.chapter_id || '');
          const ratingValue = rating.rating;
          
          if (ratingUserId === currentUserId && ratingChapterId) {
            if (!userRatings[ratingChapterId]) {
              userRatings[ratingChapterId] = {
                rating: Number(ratingValue),
                timestamp: rating.CREATEDTIME || new Date().toISOString()
              };
              console.log('Added rating for chapter:', ratingChapterId);
            }
          }
        });
      }
      
      console.log('Final count:', Object.keys(userRatings).length, 'unique chapters rated');
      console.log('Chapter IDs:', Object.keys(userRatings));
      
      return res.json({
        success: true,
        ratings: userRatings
      });
      
    } catch (err) {
      console.error('Error in getUserRatings:', err);
      return res.json({
        success: true,
        ratings: {}
      });
    }
    
  } catch (err) {
    console.error("❌ Fatal error fetching user ratings:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
});

// ============================================
// EMAIL SIGNUP ENDPOINT
// ============================================
app.post("/signup", async (req, res) => {
  try {
    console.log('📧 Signup request received:', req.body);
    
    let { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    email = email.trim().toLowerCase();
    // If you want only some spefic Email to signup
    // if (!email.endsWith('xyz.com')) {
    //   return res.status(400).json({ 
    //     success: false, 
    //     message: "Only xyz.com email addresses are allowed" 
    //   });
    // }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid email format" 
      });
    }

    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    const table = datastore.table("users");

    try {
      const existingRecords = await table.getAllRows();
      const emailExists = existingRecords.some(record => 
        record.userMailid && record.userMailid.toLowerCase() === email
      );

      if (emailExists) {
        console.log('Email already exists:', email);
        return res.status(409).json({ 
          success: false, 
          message: "This email is already in use" 
        });
      }
    } catch (err) {
      console.log("Note: Could not check for existing email, proceeding anyway:", err.message);
    }

    const insertedRow = await table.insertRow({
      userMailid: email
    });

    console.log('Email saved successfully:', email);

    return res.json({
      success: true,
      message: "Successfully Joined!",
      email: email,
      data: insertedRow
    });

  } catch (err) {
    console.error("Error saving email:", err);
    return res.status(500).json({
      success: false,
      message: "Error saving email. Please try again.",
      error: err.message,
    });
  }
});

// ============================================
// ADD RATING ENDPOINT 
// ============================================

app.post("/addRating", async (req, res) => {
  try {
    console.log('Rating request received:', req.body);
    
    let { chapterId, rating } = req.body;

    if (!chapterId || rating == null) {
      return res.status(400).json({ 
        success: false, 
        message: "chapterId and rating are required" 
      });
    }

    rating = Number(rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: "rating must be between 1 and 5" 
      });
    }

    const catalystApp = catalyst.initialize(req);
    
    let currentUser;
    try {
      const userManagement = catalystApp.userManagement();
      currentUser = await userManagement.getCurrentUser();
      
      if (!currentUser || !currentUser.user_id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }
      
      console.log('👤 User:', currentUser.email_id, '(ID:', currentUser.user_id, ') is rating chapter:', chapterId);
      
    } catch (userError) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }
    
    const datastore = catalystApp.datastore();
    const chaptersTable = datastore.table("Chapters");
    const ratingsTable = datastore.table("Ratings");

    // Check if user has already rated this chapter
    try {
      let allUserRatings = [];
      try {
        allUserRatings = await ratingsTable.getAllRows();
        console.log('Checking against', allUserRatings.length, 'total ratings in DB');
      } catch (tableErr) {
        console.log('Ratings table empty or new:', tableErr.message);
        allUserRatings = [];
      }
      
      const currentUserId = String(currentUser.user_id);
      const chapterIdStr = String(chapterId);
      
      // FIXED: Check for existing rating with proper string comparison
      const existingRating = allUserRatings.find(r => {
        const rUserId = String(r.user_id || '');
        const rChapterId = String(r.chapter_id || '');
        return rUserId === currentUserId && rChapterId === chapterIdStr;
      });
      
      if (existingRating) {
        console.log('DUPLICATE RATING BLOCKED');
        console.log('   User:', currentUserId);
        console.log('   Chapter:', chapterIdStr);
        console.log('   Existing rating:', existingRating.rating);
        
        let chapterRecord;
        try {
          chapterRecord = await chaptersTable.getRow(chapterIdStr);
        } catch (err) {
          console.log('Note: Could not fetch chapter record:', err.message);
        }
        
        return res.status(409).json({
          success: false,
          message: "You have already rated this chapter",
          alreadyRated: true,
          existingRating: existingRating.rating,
          averageRating: chapterRecord ? chapterRecord.avgRating : null,
          totalRatings: chapterRecord ? chapterRecord.totalNoOfRatings : null
        });
      }
      
      console.log('No existing rating found - proceeding');
      
    } catch (err) {
      console.error("Error checking for existing rating:", err);
      console.log('Proceeding with rating despite check error');
    }

    // Store user's rating with FIXED column names
    try {
      const ratingData = {
        user_id: String(currentUser.user_id),
        chapter_id: String(chapterId),
        rating: rating
      };
      
      console.log('Inserting rating:', JSON.stringify(ratingData, null, 2));
      
      const insertResult = await ratingsTable.insertRow(ratingData);
      
      console.log('Rating inserted successfully:', JSON.stringify(insertResult, null, 2));
      
    } catch (err) {
      console.error("Failed to store user rating:", err.message);
      console.error("Full error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to save rating: " + err.message
      });
    }

    // Get existing chapter record
    let record;
    try {
      record = await chaptersTable.getRow(String(chapterId));
      if (!record) {
        console.log('Chapter not found:', chapterId);
        return res.status(404).json({ 
          success: false, 
          message: "Chapter not found" 
        });
      }
    } catch (err) {
      console.error("Failed to fetch chapter:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch chapter data"
      });
    }

    // Calculate new average
    let totalRatings = Number(record.totalNoOfRatings) || 0;
    let avgRating = Number(record.avgRating) || 0;

    console.log('Current stats:', { totalRatings, avgRating });

    const newAvg = ((avgRating * totalRatings) + rating) / (totalRatings + 1);
    totalRatings += 1;

    console.log('New stats:', { totalRatings, newAvg: newAvg.toFixed(2) });

    // Update Chapters table
    const updated = await chaptersTable.updateRow({
      ROWID: String(chapterId),
      avgRating: parseFloat(newAvg.toFixed(2)),
      totalNoOfRatings: totalRatings
    });

    console.log('Chapter updated successfully');

    return res.json({
      success: true,
      message: "Rating saved successfully",
      chapterId,
      userRating: rating,
      averageRating: newAvg.toFixed(2),
      totalRatings,
      updated
    });

  } catch (err) {
    console.error("Error updating rating:", err);
    return res.status(500).json({
      success: false,
      message: "Error updating rating",
      error: err.message,
    });
  }
});

// ============================================
// GET RATINGS ENDPOINT
// ============================================
app.get("/getRatings", async (req, res) => {
  try {
    const { chapterId } = req.query;

    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    const table = datastore.table("Chapters");

    if (chapterId) {
      console.log('Fetching rating for chapter:', chapterId);
      
      const record = await table.getRow(chapterId.toString());
      if (!record) {
        return res.status(404).json({ 
          success: false, 
          message: "Chapter not found" 
        });
      }

      return res.json({
        success: true,
        chapterId,
        avgRating: record.avgRating || 0,
        totalRatings: record.totalNoOfRatings || 0
      });
    } else {
      console.log('Fetching all ratings');
      
      const records = await table.getAllRows();
      
      const ratings = records.map(record => ({
        chapterId: record.ROWID,
        avgRating: record.avgRating || 0,
        totalRatings: record.totalNoOfRatings || 0
      }));

      return res.json({
        success: true,
        ratings
      });
    }

  } catch (err) {
    console.error("Error fetching ratings:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching ratings",
      error: err.message,
    });
  }
});

// Add these endpoints to your index.js (Catalyst backend)

// ============================================
// COMMENTS ENDPOINTS
// ============================================

// GET all comments for a chapter
app.get("/getComments", async (req, res) => {
  try {
    const { chapterId } = req.query;

    if (!chapterId) {
      return res.status(400).json({ 
        success: false, 
        message: "chapterId is required" 
      });
    }

    console.log('Fetching comments for chapter:', chapterId);
    
    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    const commentsTable = datastore.table("Comments");

    try {
      const allComments = await commentsTable.getAllRows();
      
      // Filter comments for this chapter
      const chapterComments = allComments
        .filter(comment => String(comment.chapter_id) === String(chapterId))
        .map(comment => ({
          id: comment.ROWID,
          chapterId: comment.chapter_id,
          userId: comment.user_id,
          userName: comment.user_name,
          userEmail: comment.user_email,
          comment: comment.comment_text,
          timestamp: comment.CREATEDTIME,
          replies: []
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      console.log('Found', chapterComments.length, 'comments for chapter', chapterId);

      return res.json({
        success: true,
        chapterId,
        comments: chapterComments,
        total: chapterComments.length
      });

    } catch (err) {
      console.log('ℹ️ Comments table empty or error:', err.message);
      return res.json({
        success: true,
        chapterId,
        comments: [],
        total: 0
      });
    }

  } catch (err) {
    console.error("Error fetching comments:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching comments",
      error: err.message
    });
  }
});

// POST a new comment
app.post("/addComment", async (req, res) => {
  try {
    console.log('Add comment request:', req.body);
    
    let { chapterId, comment } = req.body;

    if (!chapterId || !comment) {
      return res.status(400).json({ 
        success: false, 
        message: "chapterId and comment are required" 
      });
    }

    comment = comment.trim();
    if (comment.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Comment cannot be empty" 
      });
    }

    if (comment.length > 1000) {
      return res.status(400).json({ 
        success: false, 
        message: "Comment is too long (max 1000 characters)" 
      });
    }

    const catalystApp = catalyst.initialize(req);
    
    // Get current user
    let currentUser;
    try {
      const userManagement = catalystApp.userManagement();
      currentUser = await userManagement.getCurrentUser();
      
      if (!currentUser || !currentUser.user_id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }
      
      console.log('User:', currentUser.email_id, 'commenting on chapter:', chapterId);
      
    } catch (userError) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const datastore = catalystApp.datastore();
    const commentsTable = datastore.table("Comments");

    // Insert comment
    const commentData = {
      chapter_id: String(chapterId),
      user_id: String(currentUser.user_id),
      user_name: currentUser.first_name + ' ' + currentUser.last_name,
      user_email: currentUser.email_id,
      comment_text: comment
    };
    
    console.log('Inserting comment:', JSON.stringify(commentData, null, 2));
    
    const insertResult = await commentsTable.insertRow(commentData);
    
    console.log('Comment inserted successfully');

    return res.json({
      success: true,
      message: "Comment posted successfully",
      comment: {
        id: insertResult.ROWID,
        chapterId: commentData.chapter_id,
        userId: commentData.user_id,
        userName: commentData.user_name,
        userEmail: commentData.user_email,
        comment: commentData.comment_text,
        timestamp: insertResult.CREATEDTIME
      }
    });

  } catch (err) {
    console.error("Error posting comment:", err);
    return res.status(500).json({
      success: false,
      message: "Error posting comment",
      error: err.message
    });
  }
});

// DELETE a comment (user can only delete their own)
app.delete("/deleteComment", async (req, res) => {
  try {
    const { commentId } = req.body;

    if (!commentId) {
      return res.status(400).json({ 
        success: false, 
        message: "commentId is required" 
      });
    }

    const catalystApp = catalyst.initialize(req);
    
    // Get current user
    let currentUser;
    try {
      const userManagement = catalystApp.userManagement();
      currentUser = await userManagement.getCurrentUser();
      
      if (!currentUser || !currentUser.user_id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }
    } catch (userError) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const datastore = catalystApp.datastore();
    const commentsTable = datastore.table("Comments");

    // Get the comment to verify ownership
    const comment = await commentsTable.getRow(String(commentId));
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    // Verify user owns this comment
    if (String(comment.user_id) !== String(currentUser.user_id)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comments"
      });
    }

    // Delete the comment
    await commentsTable.deleteRow(String(commentId));

    console.log('Comment deleted:', commentId);

    return res.json({
      success: true,
      message: "Comment deleted successfully"
    });

  } catch (err) {
    console.error("Error deleting comment:", err);
    return res.status(500).json({
      success: false,
      message: "Error deleting comment",
      error: err.message
    });
  }
});

// Update the health check to include comments endpoints
// Add to the existing /health endpoint's endpoints object:
/*
  comments: {
    getComments: "GET /getComments?chapterId={id}",
    addComment: "POST /addComment",
    deleteComment: "DELETE /deleteComment"
  }
*/

console.log('Comments API endpoints initialized');

// ============================================
// AUTO-REFRESH ACCESS TOKEN
// ============================================
async function refreshAccessToken() {
  try {
    const https = require('https');
    const querystring = require('querystring');
    
    const postData = querystring.stringify({
      refresh_token: CLIQ_CONFIG.REFRESH_TOKEN,
      client_id: CLIQ_CONFIG.CLIENT_ID,
      client_secret: CLIQ_CONFIG.CLIENT_SECRET,
      grant_type: 'refresh_token'
    });
    
    const options = {
      hostname: 'accounts.zoho.in',
      port: 443,
      path: '/oauth/v2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    
    
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.access_token) {
              console.log('Access token refreshed!');
              CLIQ_CONFIG.ACCESS_TOKEN = response.access_token; // Update in memory
              resolve(response.access_token);
            } else {
              console.error('Token refresh failed:', data);
              reject(new Error('No access token in response'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
    
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

// Auto-refresh token every 50 minutes
setInterval(async () => {
  try {
    console.log('Auto-refreshing access token...');
    await refreshAccessToken();
  } catch (error) {
    console.error('Auto-refresh failed:', error);
  }
}, 50 * 60 * 1000); // 50 minutes

// ============================================
// HELPER: Get Cliq User ID from Email
// ============================================
async function getCliqUserIdByEmail(email) {
  try {
    const https = require('https');
    
    const options = {
      hostname: 'cliq.zoho.in',
      port: 443,
      path: `/api/v2/users/${encodeURIComponent(email)}`,
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${CLIQ_CONFIG.ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.id) {
              console.log('Found Cliq user:', email, '→', response.id);
              resolve(response.id);
            } else {
              console.warn('User not found:', email);
              resolve(null);
            }
          } catch (error) {
            resolve(null);
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('Request error:', error);
        resolve(null);
      });
      
      req.end();
    });
    
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// ============================================
// 💬 HELPER: Send DM to Cliq User
// ============================================
async function sendCliqDM(userId, message) {
  try {
    const https = require('https');
    
    const payload = { text: message };
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'cliq.zoho.in',
      port: 443,
      path: `/api/v2/chats/${userId}/message`,
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${CLIQ_CONFIG.ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('DM sent successfully');
            resolve({ success: true });
          } else {
            console.error('Failed:', res.statusCode, data);
            reject(new Error(`Status ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
    
  } catch (error) {
    throw error;
  }
}

// ============================================
// SEND DM NOTIFICATIONS USING ZUID
// ============================================
app.post('/sendCliqNotification', async (req, res) => {
  try {
    console.log('Notification request received');
    
    const catalystApp = catalyst.initialize(req);
    
    // Verify admin
    let currentUser;
    try {
      const userManagement = catalystApp.userManagement();
      currentUser = await userManagement.getCurrentUser();
      
      if (!currentUser || !currentUser.user_id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }
    } catch (userError) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
    
    const ADMIN_EMAIL = "admin@mail.com";
    if (currentUser.email_id !== ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const { chapterNumber } = req.body;
    
    if (!chapterNumber) {
      return res.status(400).json({
        success: false,
        message: 'Chapter number required'
      });
    }
    
    console.log('Notifying Chapter:', chapterNumber);
    
    // GET ALL USERS WITH THEIR ZUID FROM CATALYST
    let allUsers = [];
    try {
      const userManagement = catalystApp.userManagement();
      const usersResponse = await userManagement.getAllUsers();
      
      console.log('Found', usersResponse.length, 'users in Catalyst');
      
      // Extract ZUID (zoid) from each user
      allUsers = usersResponse.map(user => ({
        email: user.email_id,
        name: user.first_name + ' ' + user.last_name,
        zuid: user.zoid || user.user_id // Use zoid as ZUID
      })).filter(u => u.zuid);
      
      console.log('📧 Users with ZUID:', allUsers);
      
    } catch (err) {
      console.error('Failed to fetch users:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users: ' + err.message
      });
    }
    
    if (allUsers.length === 0) {
      return res.json({
        success: true,
        message: 'No users to notify',
        sent: 0
      });
    }
    
    // Create message
    const message = `*New Chapter Alert!*\n\nChapter ${chapterNumber} is now live! 🎉\n\nRead it now at: Site_link`;
    
    // Send to each user
    let successCount = 0;
    let failCount = 0;
    const results = [];
    
    for (const user of allUsers) {
      const { email, naam, zuid } = user;
      
      if (!zuid) {
        console.warn('No ZUID for:', email);
        failCount++;
        results.push({ email, status: 'failed', reason: 'No ZUID' });
        continue;
      }
      
      try {
        console.log('Sending to:', email, '(ZUID:', zuid, ')');
        
        // Send directly to ZUID
        await sendCliqDM(zuid, message);
        
        console.log('Sent to:', email);
        successCount++;
        results.push({ email, zuid, status: 'success' });
        
        // Delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('Failed for:', email, error.message);
        failCount++;
        results.push({ email, zuid, status: 'failed', reason: error.message });
      }
    }
    
    console.log('Results - Sent:', successCount, 'Failed:', failCount);
    
    return res.json({
      success: true,
      message: 'Notifications sent',
      sent: successCount,
      failed: failCount,
      total: allUsers.length,
      details: results
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send notifications',
      error: error.message
    });
  }
});


// ============================================
// TEST: Get Your ZUID
// ============================================
app.get('/testGetMyZUID', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    
    const userManagement = catalystApp.userManagement();
    const currentUser = await userManagement.getCurrentUser();
    
    console.log('👤 Current user object:', JSON.stringify(currentUser, null, 2));
    
    return res.json({
      success: true,
      user: {
        email: currentUser.email_id,
        user_id: currentUser.user_id,
        zoid: currentUser.zoid,
        zuid: currentUser.zoid || currentUser.user_id,
        full_data: currentUser
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get("/health", (req, res) => {
  console.log('Health check');
  res.json({ 
    status: "OK", 
    message: "Novel November API is running",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        check: "GET /auth/check",
        logout: "GET /auth/logout"
      },
      user: {
        getRatings: "GET /getUserRatings"
      },
      chapters: {
        addRating: "POST /addRating",
        getRatings: "GET /getRatings"
      },
      email: {
        signup: "POST /signup"
      },
      system: {
        health: "GET /health"
      }
    }
  });
});

// ============================================
// ROOT ENDPOINT
// ============================================
app.get("/", (req, res) => {
  res.json({
    message: "Novel November API",
    version: "2.2.0",
    features: "FIXED: Column names match database (user_id, chapter_id)",
    endpoints: {
      auth: "GET /auth/check, GET /auth/logout",
      user: "GET /getUserRatings",
      signup: "POST /signup - Subscribe with @xyz.com email",
      addRating: "POST /addRating - Submit chapter rating (one per user per chapter)",
      getRatings: "GET /getRatings - Get chapter ratings",
      health: "GET /health - Health check"
    },
    requiredTables: {
      Ratings: ["user_id (Text)", "chapter_id (Text)", "rating (Number)"],
      Chapters: ["ROWID", "avgRating (Number)", "totalNoOfRatings (Number)"],
      users: ["userMailid (Text)"]
    }
  });
});

console.log('API v2.2.0 initialized');
console.log('Features: Auth + Fixed column names (user_id, chapter_id)');

module.exports = app;
