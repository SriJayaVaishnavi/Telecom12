# Audio Transcription Service

This service provides real-time audio transcription using Faster-Whisper.

## Prerequisites

1. Python 3.8 or higher
2. Node.js 16 or higher

## Setup Instructions

1. **Install Python Dependencies**
   ```bash
   cd server
   pip install -r requirements.txt
   ```

2. **Install Node.js Dependencies**
   ```bash
   cd ../client
   npm install
   ```

3. **Environment Variables**
   Create a `.env` file in the project root with the following variables:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   PORT=5000
   ```

## Running the Service

1. **Start the Backend Server**
   ```bash
   cd server
   node server.js
   ```

2. **Start the Frontend**
   ```bash
   cd client
   npm start
   ```

## Troubleshooting

- **Python Module Not Found**: Ensure you've installed the Python dependencies from requirements.txt
- **WebSocket Connection Issues**: Check if the backend server is running on the correct port
- **Audio File Not Found**: Verify that audio files exist in the `server/src/data` directory

## Notes

- The service uses Faster-Whisper for transcription, which requires a CUDA-compatible GPU for optimal performance.
- For CPU-only systems, the first transcription may take longer as it downloads the model.
