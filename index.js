// Required dependencies
const axios = require('axios');
const express = require('express');
const cors = require("cors");
const nodemailer = require("nodemailer");
const app = express();
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; //Disable SSL/TLS certificate validation

// Apply CORS middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Function to fetch a random quote - this was missing
async function getQuote() {
  try {
    //Get request to quotable endpoint to get random quotes
    const response = await axios.get('https://api.quotable.io/random');
    const quote = response.data.content;
    const author = response.data.author;
    
    return { quote, author };
  } catch (error) {
    console.error("Error fetching quote:", error);
    return null;  // Return null in case of an error
  }
}

// Function to send an email with a quote using Gmail
async function sendEmailQuote(quote, author) {
  // Create a transporter using Gmail service
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // Use app password, not regular password
    },
  });

  // Email content
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.EMAIL_TO,
    subject: 'Daily Quote',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Your Daily Quote</h2>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 15px; font-style: italic;">
          "${quote}"
        </blockquote>
        <p style="text-align: right; font-weight: bold;">— ${author}</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

app.get("/", (req, res)=>{
    res.status(200).json({ 
        message: "Welcome to QUOTEX"
      });
})

// route to send quote via Gmail
app.get("/send-quote", async (req, res) => {
  const quoteData = await getQuote();
  if (quoteData) {
    const emailSent = await sendEmailQuote(quoteData.quote, quoteData.author);
    
    if (emailSent) {
      res.status(200).json({ 
        message: "Quote sent via email", 
        quote: quoteData 
      });
    } else {
      res.status(500).json({ error: "Failed to send email" });
    }
  } else {
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).send("Integration is working!");
});
 
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}...`);
});