// Listen for messages from the popup script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "insertPrompt") {
    insertPromptAndRun(request.text);
  } else if (request.action === "extractQuestions") {
    const questions = extractQuestionsFromResponse();
    sendResponse({ questions: questions });
    return true; // Required for async sendResponse
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

// Function to extract questions from the AI Studio response
function extractQuestionsFromResponse() {
  const questions = [];
  
  try {
    // Look for any ordered lists in the response
    const orderedLists = document.querySelectorAll('ol');
    console.log('Found ' + orderedLists.length + ' ordered lists');
    
    if (orderedLists.length > 0) {
      // Try to find the list that contains the 10 questions
      for (let i = 0; i < orderedLists.length; i++) {
        const list = orderedLists[i];
        const listItems = list.querySelectorAll('li');
        console.log(`List ${i} has ${listItems.length} items`);
        
        // If we found a list with at least 10 items, it's likely our question list
        if (listItems.length >= 10) {
          listItems.forEach((item, index) => {
            if (index < 10) { // Limit to 10 questions
              // Try to extract the title (usually in a <strong> tag)
              let questionTitle = '';
              const strongElement = item.querySelector('strong');
              
              if (strongElement) {
                questionTitle = strongElement.textContent.trim();
              }
              
              // Get the full text content
              let fullQuestion = item.textContent.trim();
              
              // Format the question
              if (questionTitle && fullQuestion.includes(questionTitle)) {
                // Replace the title in the full text to avoid duplication
                const questionText = fullQuestion.substring(fullQuestion.indexOf(questionTitle) + questionTitle.length).trim();
                questions.push(`<b>${questionTitle}</b>${questionText}`);
              } else {
                questions.push(fullQuestion);
              }
            }
          });
          
          // If we found questions, break the loop
          if (questions.length > 0) {
            break;
          }
        }
      }
    }
    
    // If we still don't have questions, try a more general approach
    if (questions.length === 0) {
      console.log('Trying alternative question extraction method');
      // Look for any list items that might contain questions
      const allListItems = document.querySelectorAll('li');
      
      allListItems.forEach((item, index) => {
        if (index < 10) { // Limit to 10 questions
          const text = item.textContent.trim();
          if (text.length > 0) {
            questions.push(text);
          }
        }
      });
    }
    
    console.log('Extracted questions: ', questions);
    return questions;
  } catch (error) {
    console.error('Error extracting questions:', error);
    return [];
  }
} 