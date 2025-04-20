// Listen for messages from the popup script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "insertPrompt") {
    insertPromptIntoTextarea(request.text);
  }
});

// Function to insert the prompt text into the textarea
function insertPromptIntoTextarea(promptText) {
  // Find the textarea element where users type their prompts
  // The selector might need to be adjusted based on the actual page structure
  const textarea = document.querySelector('textarea');
  
  if (textarea) {
    // Set the value of the textarea to our prompt
    textarea.value = promptText;
    
    // Create and dispatch an input event to trigger any listeners
    const inputEvent = new Event('input', { bubbles: true });
    textarea.dispatchEvent(inputEvent);
    
    // Focus the textarea
    textarea.focus();
    
    // Optionally, submit the prompt automatically
    // This requires finding the send button and clicking it
    // const sendButton = document.querySelector('button[aria-label="Send message"]');
    // if (sendButton) {
    //   sendButton.click();
    // }
  } else {
    console.error('Textarea not found on the page');
  }
} 