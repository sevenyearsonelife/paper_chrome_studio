document.addEventListener('DOMContentLoaded', function() {
  // Define the prompt texts
  const paperAnalysisPrompt = `首先给出论文标题与链接，按照 > 格式，然后对论文进行详细分析，并在分析报告中包括以下关键方面： 研究背景与动机：请描述该论文主要解决的问题是什么，明确指出研究的背景、研究动机以及研究问题的具体表述。 论文核心方法和步骤：详细阐述论文中提出的核心方法和步骤，包括任何创新的技术、理论模型或实验设计，以及如何实施这些方法以解决问题，需要结合公式进行说明。 实验结果与结论：总结论文的实验结果和结论，讨论作者如何解释他们的发现以及这些发现对相关领域的意义。请以逻辑清晰、条理化的方式组织你的分析，确保对每一要点进行充分讨论。格式要求：## 研究背景与动机 ## 论文核心方法和步骤 ## 实验结果与结论，不要有二级以外的其他级标题，其余标题采用加粗，公式要用latex。`;
  
  const keyQuestionsPrompt = `我正在使用AI辅助阅读这篇学术论文。为了帮助我更深入地理解论文的核心思想、方法和贡献，请列举出10个最关键的问题，这些问题应当能引导我全面把握论文的内容和意义。`;

  // Add click event listeners to the buttons
  document.getElementById('paperAnalysisBtn').addEventListener('click', function() {
    copyToClipboard(paperAnalysisPrompt);
    ensureContentScriptLoaded().then(() => {
      sendPromptToTab(paperAnalysisPrompt);
    }).catch(error => {
      alert(`无法连接到 Google AI Studio: ${error.message}`);
    });
  });

  document.getElementById('keyQuestionsBtn').addEventListener('click', function() {
    copyToClipboard(keyQuestionsPrompt);
    ensureContentScriptLoaded().then(() => {
      sendPromptToTab(keyQuestionsPrompt);
    }).catch(error => {
      alert(`无法连接到 Google AI Studio: ${error.message}`);
    });
  });
  
  // Add click event listener for the Extract Questions button
  document.getElementById('extractQuestionsBtn').addEventListener('click', function() {
    extractQuestions();
  });

  // Function to ensure content script is loaded before proceeding
  function ensureContentScriptLoaded() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs || tabs.length === 0) {
          reject(new Error("无法访问当前标签页"));
          return;
        }
        
        const currentTab = tabs[0];
        
        // Check if the current tab is a Google AI Studio page
        if (!currentTab.url.includes('aistudio.google.com')) {
          reject(new Error("请在 Google AI Studio 页面上使用此扩展"));
          return;
        }

        // Try to ping the content script first to check if it's loaded
        chrome.tabs.sendMessage(currentTab.id, {action: "ping"}, function(response) {
          // If we get a response, the content script is already loaded
          if (response && response.status === "ok") {
            resolve(currentTab);
            return;
          }
          
          // If no response or error, inject the content script programmatically
          if (chrome.runtime.lastError) {
            console.log("Content script not yet loaded, injecting:", chrome.runtime.lastError);
            
            // Inject the content script
            chrome.scripting.executeScript({
              target: {tabId: currentTab.id},
              files: ["content.js"]
            }).then(() => {
              console.log("Content script injected successfully");
              // Give it a moment to initialize
              setTimeout(() => resolve(currentTab), 200);
            }).catch(error => {
              console.error("Failed to inject content script:", error);
              reject(new Error("无法注入所需脚本"));
            });
          }
        });
      });
    });
  }

  // Function to extract questions from the AI Studio response
  function extractQuestions() {
    // Show extraction status
    const questionsList = document.getElementById('questionsList');
    questionsList.innerHTML = '<li><span class="question-content">正在提取问题，请稍候...</span></li>';
    document.getElementById('extractedQuestions').style.display = 'block';
    
    // First ensure the content script is loaded
    ensureContentScriptLoaded().then(tab => {
      // Now try to extract questions
      chrome.tabs.sendMessage(tab.id, {action: "extractQuestions"}, function(response) {
        // Check for error from Chrome runtime
        if (chrome.runtime.lastError) {
          console.error("Chrome runtime error:", chrome.runtime.lastError);
          showExtractionError("通信错误: " + chrome.runtime.lastError.message);
          return;
        }
        
        // Check for valid response
        if (response && response.questions && response.questions.length > 0) {
          // Display the extracted questions
          questionsList.innerHTML = ''; // Clear previous questions
          
          // Store the plain text questions for use with click events
          const plainTextQuestions = [];
          
          response.questions.forEach((question, index) => {
            // Create the list item for the question
            const li = document.createElement('li');
            li.innerHTML = question;
            li.className = 'formatted-question clickable-question';
            questionsList.appendChild(li);
            
            // Extract plain text for this question (without HTML tags)
            const plainText = question.replace(/<[^>]*>/g, '');
            plainTextQuestions.push(plainText);
            
            // Add click event to send this question to the AI Studio
            li.addEventListener('click', function() {
              const questionToSend = `${plainText}`;
              copyToClipboard(questionToSend);
              
              ensureContentScriptLoaded().then(tab => {
                sendPromptToTab(questionToSend);
              }).catch(error => {
                alert(`无法连接到 Google AI Studio: ${error.message}`);
              });
            });
          });
          
          // Add a note that questions are clickable
          const note = document.createElement('p');
          note.className = 'clickable-note';
          note.textContent = '点击任意问题可将其发送到AI Studio';
          questionsList.parentNode.insertBefore(note, document.querySelector('.copy-note'));
          
          // Copy all questions to clipboard as plain text
          const allQuestionsText = plainTextQuestions.join('\n\n');
          copyToClipboard(allQuestionsText);
        } else {
          showExtractionError("未找到问题。请确保您已运行了'Key Questions'提示并收到了包含10个问题的响应。");
        }
      });
    }).catch(error => {
      showExtractionError(`连接错误: ${error.message}`);
    });
  }
  
  // Function to show extraction error
  function showExtractionError(message) {
    const questionsList = document.getElementById('questionsList');
    questionsList.innerHTML = `<li class="formatted-question" style="color: red;"><span class="question-content">${message}</span></li>`;
    document.getElementById('extractedQuestions').style.display = 'block';
  }

  // Function to copy text to clipboard
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(
      function() {
        console.log('Prompt copied to clipboard successfully');
      },
      function(err) {
        console.error('Could not copy prompt to clipboard: ', err);
      }
    );
  }

  // Function to send the prompt to the active tab
  function sendPromptToTab(promptText) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) return;
      
      chrome.tabs.sendMessage(tabs[0].id, {action: "insertPrompt", text: promptText}, function(response) {
        if (chrome.runtime.lastError) {
          console.error("Error sending prompt:", chrome.runtime.lastError);
        }
        window.close(); // Close the popup after sending the prompt
      });
    });
  }
}); 