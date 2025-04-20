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
    
    // 简化的提取方法 - 直接查找页面上的所有有序列表
    console.log("直接查找页面上的所有有序列表和编号文本");
    
    // ===== 方法1: 查找所有有序列表 =====
    const allOrderedLists = document.querySelectorAll('ol');
    console.log(`找到 ${allOrderedLists.length} 个有序列表`);
    
    let foundQuestions = false;
    
    // 处理找到的有序列表
    for (let i = 0; i < allOrderedLists.length; i++) {
      const list = allOrderedLists[i];
      const listItems = list.querySelectorAll('li');
      console.log(`列表 ${i} 有 ${listItems.length} 个项目`);
      
      // 如果列表有足够多的项目，可能是我们要找的问题列表
      if (listItems.length >= 5) {
        const tempQuestions = [];
        
        listItems.forEach((item, index) => {
          if (index < 10) { // 限制为10个问题
            // 尝试提取标题（通常在<strong>或<b>标签中）
            let questionTitle = '';
            const strongElement = item.querySelector('strong, b');
            
            if (strongElement) {
              questionTitle = strongElement.textContent.trim();
            }
            
            // 获取完整的文本内容
            let fullQuestion = item.textContent.trim();
            
            // 使用数字和标题格式化问题
            if (questionTitle && fullQuestion.includes(questionTitle)) {
              // 在完整文本中替换标题以避免重复
              const questionText = fullQuestion.substring(fullQuestion.indexOf(questionTitle) + questionTitle.length).trim();
              tempQuestions.push(`<span class="question-number">${index + 1}.</span> <span class="question-title">${questionTitle}</span> ${questionText}`);
            } else {
              tempQuestions.push(`<span class="question-number">${index + 1}.</span> ${fullQuestion}`);
            }
          }
        });
        
        // 如果我们找到了问题，记录并跳出循环
        if (tempQuestions.length >= 5) {
          questions.push(...tempQuestions);
          console.log(`从列表 ${i} 提取了 ${tempQuestions.length} 个问题`);
          foundQuestions = true;
          break;
        }
      }
    }
    
    // ===== 方法2: 查找所有可能包含问题的段落 =====
    if (!foundQuestions) {
      console.log("尝试从段落中提取问题");
      const allParagraphs = document.querySelectorAll('p');
      const numberedParagraphs = [];
      
      // 找出以数字开头的段落
      for (let i = 0; i < allParagraphs.length; i++) {
        const text = allParagraphs[i].textContent.trim();
        if (/^\d+[\.\)、]/.test(text) && text.length > 10) {
          numberedParagraphs.push(text);
        }
      }
      
      console.log(`找到 ${numberedParagraphs.length} 个编号段落`);
      
      // 如果有足够多的编号段落，很可能是我们要找的问题
      if (numberedParagraphs.length >= 5) {
        numberedParagraphs.forEach((text, index) => {
          if (index < 10) { // 限制为10个问题
            // 去掉开头的数字和标点
            const cleanText = text.replace(/^\d+[\.\)、]\s*/, '');
            questions.push(`<span class="question-number">${index + 1}.</span> ${cleanText}`);
          }
        });
        
        foundQuestions = true;
      }
    }
    
    // ===== 方法3: 使用TreeWalker查找文本节点 =====
    if (!foundQuestions) {
      console.log("尝试使用TreeWalker查找编号文本");
      const numberedTexts = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        // 寻找以数字+标点开头的文本，长度至少为10个字符
        if (/^\d+[\.\)、]/.test(text) && text.length > 10) {
          numberedTexts.push(text);
        }
      }
      
      console.log(`找到 ${numberedTexts.length} 个编号文本节点`);
      
      // 处理找到的编号文本
      if (numberedTexts.length >= 5) {
        // 对文本节点进行排序和去重
        const uniqueTexts = [...new Set(numberedTexts)];
        
        uniqueTexts.forEach((text, index) => {
          if (index < 10) { // 限制为10个问题
            // 去掉开头的数字和标点
            const cleanText = text.replace(/^\d+[\.\)、]\s*/, '');
            questions.push(`<span class="question-number">${index + 1}.</span> ${cleanText}`);
          }
        });
        
        foundQuestions = true;
      }
    }
    
    // ===== 方法4: 查找嵌套在各种元素中的列表项 =====
    if (!foundQuestions) {
      console.log("尝试查找所有列表项");
      const allListItems = document.querySelectorAll('li');
      console.log(`找到 ${allListItems.length} 个列表项`);
      
      if (allListItems.length >= 5) {
        allListItems.forEach((item, index) => {
          if (index < 10) { // 限制为10个问题
            const text = item.textContent.trim();
            if (text.length > 10) {
              questions.push(`<span class="question-number">${index + 1}.</span> ${text}`);
            }
          }
        });
        
        if (questions.length >= 5) {
          foundQuestions = true;
        } else {
          questions.length = 0; // 清空数组，因为这些可能不是问题
        }
      }
    }
    
    // 如果仍然没有找到问题，抛出错误
    if (questions.length === 0) {
      throw new Error("未找到问题列表。请确保AI已经回复了包含有序问题的响应。");
    }
    
    console.log('成功提取问题: ', questions.length, '个');
    return questions;
  } catch (error) {
    console.error('提取问题时出错:', error);
    throw error;
  }
}
