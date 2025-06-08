# WhatsApp Financial Bot

A sophisticated WhatsApp bot that tracks income and expenses using Google's Gemini AI for natural language processing and image analysis, with Google Sheets for data storage.

## Features

- 📱 **WhatsApp Integration**: Send messages directly through WhatsApp
- 🤖 **AI-Powered**: Uses Gemini AI to extract financial data from text and images
- 📊 **Google Sheets Storage**: Automatically saves transactions to Google Sheets
- 🖼️ **Receipt Processing**: Upload photos of receipts for automatic data extraction
- 💬 **Multi-line Processing**: Handle multiple transactions in a single message
- 🕐 **Time Understanding**: Recognizes various date formats and relative dates
- 📈 **Financial Summary**: Get totals, breakdowns by category, and transaction history
- 🗑️ **Transaction Management**: Delete transactions with simple commands
- 🔐 **Multi-Number Authorization**: Configure bot to respond only to specific phone numbers

## Project Structure

```
├── src/
│   ├── config/
│   │   └── prompts.js          # Gemini AI system prompts
│   ├── services/
│   │   ├── geminiService.js    # Gemini AI integration
│   │   ├── sheetsService.js    # Google Sheets integration
│   │   └── whatsappService.js  # WhatsApp bot logic
│   ├── utils/
│   │   └── dateUtils.js        # Date parsing utilities
│   └── index.js                # Main application entry point
├── .env                        # Environment variables
├── .env.example               # Environment variables template
├── credentials.json           # Google service account credentials
├── package.json
└── README.md
```

## Setup Instructions

### 1. Prerequisites

- Node.js (v16 or higher)
- A Google account with Google Sheets access
- A Gemini AI API key
- WhatsApp account

### 2. Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

### 3. Google Sheets Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Sheets API
4. Create a service account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Give it a name and description
   - Skip role assignment (click "Continue")
   - Click "Done"
5. Generate credentials:
   - Click on the service account email
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Save the file as `credentials.json` in the project root

### 4. Google Spreadsheet Setup

1. Create a new Google Spreadsheet
2. Share it with your service account email (found in credentials.json)
3. Give it "Editor" permissions
4. Copy the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

### 5. Gemini AI Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key for Gemini
3. Copy the API key

### 6. Environment Configuration

**Option A: Interactive Setup (Recommended)**
```bash
npm run setup
```

**Option B: Manual Setup**
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your credentials in `.env`:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   GOOGLE_SHEETS_CREDENTIALS=./credentials.json
   SPREADSHEET_ID=your_actual_spreadsheet_id
   USER_ID=your_unique_user_id
   AUTHORIZED_NUMBERS=6281234567890,6289876543210
   ```

### 7. Phone Number Authorization (Optional)

The bot can be configured to respond only to specific phone numbers:

- **Leave `AUTHORIZED_NUMBERS` empty**: Bot responds to all messages
- **Set specific numbers**: Bot only responds to those numbers

**Phone Number Format:**
- Use international format without `+` sign
- Example: `6281234567890` (for +62 81234567890)
- Multiple numbers: `6281234567890,6289876543210,1234567890`

**How to find your WhatsApp number:**
1. Send a message to the bot
2. Check the console logs for your number format
3. Add that exact format to `AUTHORIZED_NUMBERS`

### 8. Testing the Setup

Before running the bot, test your configuration:
```bash
npm run health
```

### 9. Running the Bot

1. Start the bot:
   ```bash
   npm start
   ```

2. Scan the QR code with WhatsApp on your phone

3. Start sending messages!

## Usage Examples

### Text Messages

```
"I spent $25 on lunch today"
"Received salary $3000 yesterday" 
"Bought groceries for $45 and gas for $30"
"Coffee $5, parking $10"
"Dinner at restaurant $67.50 last Friday"
```

### Commands

- `/help` - Show help information
- `/total` - Show financial summary
- `/list` - Show recent transactions
- `/delete 5` - Delete transaction #5

### Image Processing

Send photos of:
- Restaurant receipts
- Shopping receipts  
- Bills
- Invoices

The bot will automatically extract amounts, dates, and categorize the expenses.

## Spreadsheet Structure

The bot creates the following columns in your Google Sheet:

| Date | Amount | Category | Description | User ID | Timestamp |
|------|--------|----------|-------------|---------|-----------|
| 2024-01-15 | -25.00 | Food | Lunch at cafe | user123 | 2024-01-15 14:30:00 |
| 2024-01-15 | 3000.00 | Salary | Monthly salary | user123 | 2024-01-15 09:00:00 |

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses nodemon for automatic restarts on file changes.

### Available Scripts

- `npm start` - Start the bot in production mode
- `npm run dev` - Start the bot in development mode with auto-restart
- `npm run setup` - Interactive setup wizard for environment variables
- `npm run health` - Run health checks to verify configuration

### Customizing AI Prompts

Edit the prompts in `src/config/prompts.js` to customize how the AI processes your messages:

- `FINANCIAL_TEXT_PROMPT`: For processing text messages
- `FINANCIAL_IMAGE_PROMPT`: For processing receipt images
- `HELP_PROMPT`: For generating help responses

## Troubleshooting

### Common Issues

1. **"Missing required environment variable"**
   - Make sure all variables in `.env` are set correctly

2. **"Error initializing Google Sheets"**
   - Verify `credentials.json` is in the correct location
   - Check that the service account has access to your spreadsheet

3. **"QR code not appearing"**
   - Make sure you have a stable internet connection
   - Try restarting the bot

4. **"Gemini API error"**
   - Verify your Gemini API key is correct
   - Check your API quota limits

### Getting Help

If you encounter issues:

1. Check the console logs for error messages
2. Verify all credentials are correct
3. Make sure the spreadsheet is shared with the service account
4. Ensure WhatsApp Web is not open in another browser

## License

MIT License - feel free to modify and use for your own projects.

## Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests. 