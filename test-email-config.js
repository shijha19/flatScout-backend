// Email Configuration Test Script
// Run this to verify your email setup

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const testEmailConfig = async () => {
  console.log('🔍 Testing Email Configuration...\n');

  // Check environment variables
  console.log('📧 Email Configuration:');
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Missing'}`);
  console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing'}\n`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('❌ Email configuration incomplete!');
    console.log('Please set EMAIL_USER and EMAIL_PASS in your .env file\n');
    console.log('📚 See QUICK_EMAIL_SETUP.md for detailed instructions');
    return;
  }

  // Test transporter creation
  try {
    console.log('🔧 Creating email transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log('✅ Transporter created successfully');

    // Verify connection
    console.log('🔍 Verifying connection...');
    await transporter.verify();
    console.log('✅ Email connection verified successfully!');
    
    console.log('\n🎉 Email configuration is working correctly!');
    console.log('Your email notifications should now work in the application.');
    
  } catch (error) {
    console.log('❌ Email configuration test failed:');
    console.log(`Error: ${error.message}\n`);
    
    if (error.message.includes('Invalid login')) {
      console.log('💡 Common fixes:');
      console.log('1. Make sure 2-Factor Authentication is enabled on Gmail');
      console.log('2. Use an App Password, not your regular Gmail password');
      console.log('3. Check that EMAIL_USER is your full Gmail address');
      console.log('4. Verify EMAIL_PASS is the 16-character app password');
    }
    
    console.log('\n📚 See QUICK_EMAIL_SETUP.md for detailed setup instructions');
  }
};

// Run the test
testEmailConfig().catch(console.error);
