// Required dependencies
const axios = require('axios');
const express = require('express');
const app = express();
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; //Disable SSL/TLS certificate validation

// Function to fetch a random quote
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

// Function to send a Telex webhook message
async function sendTelexWebhook(eventName, message, status, username) {
    const url = process.env.TELEX_URL;
    const data = {
        event_name: eventName,
        message: message,
        status: status,
        username: username
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        });

        console.log("Telex webhook sent:", response.data);
    } catch (error) {
        console.error("Error sending Telex webhook:", error.message);
    }
}

// route to send a quote when "/send-quote" is hit
app.get("/send-quote", async (req, res) => {
    const quoteData = await getQuote();
    if (quoteData) {
        const message = `"${quoteData.quote}" — ${quoteData.author}`;
        await sendTelexWebhook("Daily Quote", message, "success", "Gbonjubola");
        res.status(200).json({ message: "Quote sent to Telex", quote: quoteData });
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
