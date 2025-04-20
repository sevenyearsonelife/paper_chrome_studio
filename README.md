# AI Studio Helper Chrome Extension

A Chrome extension that provides pre-defined paper analysis prompts for Google AI Studio.

## Features

- Works specifically on https://aistudio.google.com/app/prompts/new_chat
- Provides two built-in prompts:
  1. Paper Analysis: A comprehensive prompt for analyzing academic papers
  2. Key Questions: A prompt to generate 10 key questions about an academic paper

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the folder containing this extension
5. The extension icon should now appear in your browser toolbar

## Usage

1. Navigate to https://aistudio.google.com/app/prompts/new_chat
2. Click the extension icon in your browser toolbar
3. Select one of the two prompts by clicking its button
4. The prompt will be inserted into the Google AI Studio chat input field

## Files

- `manifest.json`: Extension configuration
- `popup.html`: The popup UI
- `popup.css`: Styles for the popup
- `popup.js`: JavaScript for the popup functionality
- `content.js`: Content script that interacts with the Google AI Studio page
- `images/`: Directory containing extension icons 