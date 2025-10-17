# Database Setup Instructions

## Step 1: Check Existing Tables

Since you got the error "relation 'items' already exists", some tables may already exist. First, run the diagnostic script:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `check_existing_tables.sql`
4. Click "Run" to see what tables already exist

## Step 2: Fix and Complete Tables

After checking, run the fix script to complete the setup:

1. Copy and paste the contents of `database/fix_existing_tables.sql`
2. Click "Run" to execute the script

This script will:
- Check which tables already exist
- Add missing columns and triggers to existing tables
- Create missing tables
- Set up proper indexes and RLS policies
- Handle all the "already exists" errors gracefully

## Step 3: Verify Setup

After running the fix script, you should see:
- All tables properly configured
- Proper indexes created
- RLS policies in place
- Success messages in the console

## What This Fixes

- Tables that already exist won't cause errors
- Missing columns and triggers will be added
- Missing tables will be created
- All database relationships will be properly established

## Step 4: Test the App

Once the database is properly set up:
1. Restart your Expo app
2. The `ReferenceError: Property 'playerId' doesn't exist` should be resolved
3. All database errors should be gone
4. The item management system should work properly

## If You Still See Errors

Make sure:
1. Both SQL scripts executed successfully
2. You see success messages in the console
3. All tables are properly created with correct structure
4. You've restarted the Expo app

The app should now work with the complete item request and museum system!
