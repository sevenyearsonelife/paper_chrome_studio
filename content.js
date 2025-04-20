// Announce that content script is loaded
console.log('AI Studio Helper content script loaded');

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "insertPrompt") {
    insertPromptAndRun(request.text);
    sendResponse({status: "ok", message: "Prompt inserted"});
    return true;
  } else if (request.action === "extractQuestions") {
    try {
      const questions = extractQuestionsFromResponse();
      sendResponse({ status: "ok", questions: questions });
    } catch (error) {
      console.error("Error extracting questions:", error);
      sendResponse({ status: "error", message: error.message });
    }
    return true; // Required for async sendResponse
  } else if (request.action === "ping") {
    // Respond to ping to confirm content script is loaded
    sendResponse({ status: "ok" });
    return true;
  }
});

// Function to insert the prompt text into the textarea and automatically click Run
function insertPromptAndRun(promptText) {
  try {
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
          console.log("Run button clicked successfully");
        } else {
          console.log('Run button is disabled or not found. Trying alternative approach...');
          
          // Try to find all run buttons (in case the class name changes)
          const allRunButtons = document.querySelectorAll('button[type="submit"]');
          for (let btn of allRunButtons) {
            // Look for a button with Run text
            if (btn.textContent.includes('Run') && !btn.disabled) {
              btn.click();
              console.log("Alternative run button clicked successfully");
              break;
            }
          }
        }
      }, 500); // 500ms delay to allow the UI to update
    } else {
      console.error('Textarea not found on the page');
      throw new Error('找不到输入框，请确保您在正确的页面上');
    }
  } catch (error) {
    console.error("Error in insertPromptAndRun:", error);
    throw error;
  }
}

// Function to extract questions from the AI Studio response
function extractQuestionsFromResponse() {
  const questions = [];
  
  try {
    console.log("Starting question extraction");
    
    // Detect if we're on a Google AI Studio page
    if (!document.querySelector('textarea')) {
      throw new Error("未检测到Google AI Studio的输入框，请确保在正确的页面上");
    }
    
    // Look for any ordered lists in the response
    const orderedLists = document.querySelectorAll('ol');
    console.log('Found ' + orderedLists.length + ' ordered lists');
    
    if (orderedLists.length === 0) {
      throw new Error("未找到包含问题的列表，请确保AI已经回答了包含10个问题的响应");
    }
    
    // Try to find the list that contains the 10 questions
    let foundQuestionList = false;
    
    for (let i = 0; i < orderedLists.length; i++) {
      const list = orderedLists[i];
      const listItems = list.querySelectorAll('li');
      console.log(`List ${i} has ${listItems.length} items`);
      
      // If we found a list with at least 8-10 items, it's likely our question list
      if (listItems.length >= 8) {
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
            
            // Format the question with the number and title
            if (questionTitle && fullQuestion.includes(questionTitle)) {
              // Replace the title in the full text to avoid duplication
              const questionText = fullQuestion.substring(fullQuestion.indexOf(questionTitle) + questionTitle.length).trim();
              questions.push(`<span class="question-number">${index + 1}.</span> <span class="question-title">${questionTitle}</span> ${questionText}`);
            } else {
              questions.push(`<span class="question-number">${index + 1}.</span> ${fullQuestion}`);
            }
          }
        });
        
        // If we found questions, mark that we found the list and break the loop
        if (questions.length > 0) {
          foundQuestionList = true;
          break;
        }
      }
    }
    
    // If we still don't have questions, try a more general approach
    if (!foundQuestionList) {
      console.log('Trying alternative question extraction method');
      // Look for any list items that might contain questions
      const allListItems = document.querySelectorAll('li');
      
      if (allListItems.length === 0) {
        throw new Error("页面上没有找到任何列表项，请确保AI已回复并显示了问题列表");
      }
      
      allListItems.forEach((item, index) => {
        if (index < 10) { // Limit to 10 questions
          const text = item.textContent.trim();
          if (text.length > 0) {
            questions.push(`<span class="question-number">${index + 1}.</span> ${text}`);
          }
        }
      });
    }
    
    if (questions.length === 0) {
      throw new Error("无法提取问题。请确保已经运行了Key Questions提示并收到了AI回复");
    }
    
    console.log('Successfully extracted questions: ', questions.length);
    return questions;
  } catch (error) {
    console.error('Error extracting questions:', error);
    throw error;
  }
} 