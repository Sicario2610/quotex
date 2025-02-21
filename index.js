// Required dependencies
const axios = require("axios");
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Disable SSL/TLS certificate validation

const app = express();

// Apply CORS middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware to parse JSON
app.use(express.json());

// Initialize reusable Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Function to fetch a random quote
async function getQuote() {
  try {
    const response = await axios.get("https://api.quotable.io/random");
    return {
      quote: response.data.content,
      author: response.data.author,
    };
  } catch (error) {
    console.error(
      "Error fetching quote:",
      error.response?.status || error.message
    );
    return { quote: "Keep pushing forward!", author: "Unknown" }; // Fallback quote
  }
}

// Function to send an email
async function sendEmailQuote(recipientEmail, quote, author) {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: recipientEmail,
    subject: "Daily Quote",
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
    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
}

// Home route
app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to QUOTEX" });
});

// Route to send a quote via email using the new payload format
app.post("/send-quote", async (req, res) => {
  const payload = req.body;

  if (!payload || !payload.settings) {
    return res.status(400).json({ error: "Invalid payload: settings missing" });
  }

  const userEmailSetting = payload.settings.find(
    (setting) => setting.label.toLowerCase() === "user email"
  );

  if (!userEmailSetting || !userEmailSetting.default) {
    return res
      .status(400)
      .json({ error: "User Email not provided in settings" });
  }

  const userEmail = userEmailSetting.default;

  console.log(`Sending quote to: ${userEmail}`);

  const quoteData = await getQuote();
  const emailSent = await sendEmailQuote(
    userEmail,
    quoteData.quote,
    quoteData.author
  );

  if (emailSent) {
    res.status(200).json({
      message: "Quote sent via email",
      quote: quoteData,
    });
  } else {
    res.status(500).json({ error: "Failed to send email" });
  }
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).send("Integration is working!");
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}...`);
});
