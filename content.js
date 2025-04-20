// Listen for messages from the popup script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "insertPrompt") {
    insertPromptAndRun(request.text);
  }
});

// Function to insert the prompt text into the textarea and automatically click Run
function insertPromptAndRun(promptText) {
  // Find the textarea element where users type their prompts
  const textarea = document.querySelector('textarea');
  
  if (textarea) {
    // Set the value of the textarea to our prompt
    textarea.value = promptText;
    
    // Create and dispatch an input event to trigger any listeners and enable the Run button
    const inputEvent = new Event('input', { bubbles: true });
    textarea.dispatchEvent(inputEvent);
    
    // Also dispatch change and focus events to ensure the UI updates properly
    const changeEvent = new Event('change', { bubbles: true });
    textarea.dispatchEvent(changeEvent);
    
    // Focus the textarea
    textarea.focus();
    
    // Wait a moment for the UI to update and the Run button to become enabled
    setTimeout(() => {
      // Find the Run button and click it if it's not disabled
      const runButton = document.querySelector('button.run-button');
      if (runButton && !runButton.disabled) {
        runButton.click();
      } else {
        console.log('Run button is still disabled or not found. Trying alternative approach...');
        
        // Try to find all run buttons (in case the class name changes)
        const allRunButtons = document.querySelectorAll('button[type="submit"]');
        for (let btn of allRunButtons) {
          // Look for a button with Run text
          if (btn.textContent.includes('Run') && !btn.disabled) {
            btn.click();
            break;
          }
        }
      }
    }, 500); // 500ms delay to allow the UI to update
  } else {
    console.error('Textarea not found on the page');
  }
} 