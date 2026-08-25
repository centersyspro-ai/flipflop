# 🛠️ Novel November - Complete Setup Guide

This guide will walk you through setting up the Novel November project from scratch.

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js (v14 or higher)
- ✅ npm or yarn package manager
- ✅ Zoho Catalyst account
- ✅ Catalyst CLI installed globally
- ✅ Git installed
- ✅ Modern web browser (Chrome, Firefox, Safari, Edge)

## Step 1: Install Catalyst CLI

```bash
npm install -g zcatalyst-cli
```

Verify installation:
```bash
catalyst --version
```

## Step 2: Download the files do not clone
This Project is not yet clone friendly - feel free to get in touch to make.

Have the index.html, mobile.html, main.css, main.js, mobile.css, config.js and bookContent.js in same folder

```bash
#cd into the directory
# Install dependencies
npm install
```

## Step 3: Catalyst Project Setup

### 3.1 Initialize Catalyst Project

```bash
catalyst login
catalyst init
```

Follow the prompts:
- Project Name: `<proj name>`
- Project Type: `Full Stack Application`
- Choose your data center

Now you can expect some new folders poped-up
cd into function/<projectname>
now replace the index.js file there or copy paste it.

### 3.2 Create Required Tables

Create these tables in Catalyst Console (Datastore):

#### **Chapters Table**
```
Table Name: Chapters
Columns:
- ROWID (Auto-generated, Primary Key)
- avgRating (Number, Default: 0)
- totalNoOfRatings (Number, Default: 0)
```

#### **Ratings Table**
```
Table Name: Ratings
Columns:
- ROWID (Auto-generated, Primary Key)
- user_id (Text, Required)
- chapter_id (Text, Required)
- rating (Number, Required, Min: 1, Max: 5)
- CREATEDTIME (Auto-generated timestamp)
```

#### **Comments Table**
```
Table Name: Comments
Columns:
- ROWID (Auto-generated, Primary Key)
- chapter_id (Text, Required)
- user_id (Text, Required)
- user_name (Text, Required)
- user_email (Text, Required)
- comment_text (Text, Required, Max: 1000)
- CREATEDTIME (Auto-generated timestamp)
```

#### **Users Table**
```
Table Name: users
Columns:
- ROWID (Auto-generated, Primary Key)
- userMailid (Email, Required, Unique)
- CREATEDTIME (Auto-generated timestamp)
```

### 3.3 Populate Chapter Data

You need to pre-populate the Chapters table with 30 chapter IDs:

```javascript
// Chapter IDs to insert:
21862000000016002  // Chapter 1
21862000000015040  // Chapter 2
21862000000015064  // Chapter 3
// ... (add all 30 chapter IDs)
```

Insert via Catalyst Console or using a script:
```javascript
const chapters = [
  { ROWID: "21862000000016002", avgRating: 0, totalNoOfRatings: 0 },
  { ROWID: "21862000000015040", avgRating: 0, totalNoOfRatings: 0 },
  // ... add all chapters
];
```

## Step 4: Configure Authentication

### 4.1 Enable Catalyst Authentication

In Catalyst Console:
1. Go to **Authentication** section
2. Enable **Email/Password** authentication
3. Set allowed email domains: `@zxyz.com` [Optinal if you don't want just comment out the block]
4. Configure redirect URLs:
   - Success: `/app/index.html`
   - Failure: `/app/index.html`

### 4.2 Set Up User Roles

1. Create default user role with permissions:
   - Read access to Datastore tables
   - Execute functions
   - Access authentication endpoints

## Step 5: Configure Your Application

### 5.1 Update config.js

Edit `app/config.js`:

```javascript
// For development
const BASE_URL = 'https://YOUR-PROJECT-ID-60044720209.development.catalystserverless.in';

// For production
const BASE_URL = 'https://YOUR-PROJECT-ID-60044720209.catalystserverless.in';

window.APP_CONFIG = {
    BACKEND_URL: BASE_URL + '/server/<foldername/projectname>',
    AUTH_LOGIN_URL: BASE_URL + '/__catalyst/auth/login',
    AUTH_SIGNUP_URL: BASE_URL + '/__catalyst/auth/signup',
    AUTH_LOGOUT_URL: BASE_URL + '/__catalyst/auth/logout',
};
```

Replace `YOUR-PROJECT-ID` with your actual Catalyst project ID.

### 5.2 Configure Cliq Integration (Optional)

If using Cliq notifications, update in `functions/<foldername/projectname>/index.js`:

```javascript
const CLIQ_CONFIG = {
  ACCESS_TOKEN: "YOUR_ACCESS_TOKEN",
  DOMAIN: "https://cliq.zoho.in",
  REFRESH_TOKEN: "YOUR_REFRESH_TOKEN",
  CLIENT_ID: "YOUR_CLIENT_ID",
  CLIENT_SECRET: "YOUR_CLIENT_SECRET"
};
```

Get these from Zoho Cliq API Console.

## Step 6: Deploy to Catalyst

### 6.1 Deploy Functions

```bash
catalyst deploy --type functions
```

### 6.2 Deploy Static Files

```bash
catalyst deploy --type client
```

### 6.3 Full Deployment

```bash
catalyst deploy
```

## Step 7: Test Your Application

### 7.1 Test Authentication

1. Visit: `https://your-url.catalystserverless.in/app/index.html`
2. Click on signup/login
3. Create account with @xyz.com email [Optional]
4. Verify email and login

### 7.2 Test Rating System

1. Navigate to any chapter
2. Scroll to rating widget
3. Click stars to rate (1-5)
4. Verify rating is saved
5. Refresh page - rating should persist

### 7.3 Test Comments

1. Navigate to a chapter
2. Click discussion button
3. Post a comment
4. Verify it appears in the list
5. Try deleting your own comment

### 7.4 Test Mobile Interface

1. Visit on mobile device or use Chrome DevTools
2. Should auto-redirect to mobile.html
3. Test touch navigation
4. Verify all features work

## Step 8: Configure Image Hosting

Your can host your images on Zoho Catalyst under Stratus in Datastore:
```
https://imgs-development.zohostratus.in/
```

To use your own hosting:

1. Upload images to your preferred CDN
2. Update image URLs in `bookContent.js`
3. Or configure Catalyst File Store

## Troubleshooting

### Issue: Authentication Not Working

**Solution:**
1. Check `config.js` has correct URLs
2. Verify Catalyst auth is enabled
3. Check browser console for errors
4. Clear cookies and try again

### Issue: Ratings Not Saving

**Solution:**
1. Verify Ratings table exists with correct columns
2. Check user is authenticated
3. Inspect network tab for API errors
4. Check backend logs in Catalyst Console

### Issue: Images Not Loading

**Solution:**
1. Check image URLs are accessible
2. Verify CORS headers if using external CDN
3. Check browser console for 404 errors
4. Ensure image paths match in bookContent.js

### Issue: Comments Not Appearing

**Solution:**
1. Verify Comments table exists
2. Check user is authenticated
3. Verify character limit (max 1000)
4. Check backend function logs

### Issue: Mobile Redirect Not Working

**Solution:**
1. Check user agent detection in index.html
2. Clear browser cache
3. Verify mobile.html exists and is deployed
4. Test with actual mobile device

## Performance Optimization

### 1. Image Optimization
```bash
# Compress images before uploading
npm install -g imagemin-cli
imagemin images/* --out-dir=images/optimized
```

### 2. Code Minification
```bash
# Minify JavaScript
npm install -g uglify-js
uglifyjs main.js -o main.min.js

# Minify CSS
npm install -g clean-css-cli
cleancss main.css -o main.min.css
```

### 3. Caching Strategy
Add in your HTML:
```html
<meta http-equiv="Cache-Control" content="public, max-age=31536000">
```

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Validate all inputs** - Both frontend and backend
3. **Use HTTPS only** - Catalyst provides this by default
4. **Implement rate limiting** - Protect API endpoints
5. **Sanitize user content** - Prevent XSS attacks
6. **Keep dependencies updated** - Run `npm audit` regularly

## Monitoring & Logs

### View Function Logs
```bash
catalyst logs:function --name novelnovemberfunction
```

### Monitor Database
- Check Catalyst Console > Datastore
- View table records and stats
- Monitor API call counts

### User Analytics
- Check Catalyst Console > Analytics
- Monitor active users
- Track feature usage

## Next Steps

1. ✅ Test all features thoroughly
2. ✅ Configure custom domain (optional)
3. ✅ Set up SSL certificate (if custom domain)
4. ✅ Configure backup strategy
5. ✅ Set up monitoring alerts
6. ✅ Create admin panel (optional)
7. ✅ Implement analytics (optional)

## Support

If you need help:
- 📧 Email: aathithyanvl@gmail.com
- 🐛 GitHub Issues: Create an issue
- 📚 Catalyst Docs: https://catalyst.zoho.com/help
- 💬 Community: Zoho Developer Community
- <i class="fa-brands fa-discord"></i> Discord: Nobodycod4#8440
