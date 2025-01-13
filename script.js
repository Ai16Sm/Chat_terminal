// Add this at the top of script.js
const HF_KEY = atob("aGZfelphdndTSEJMaUxoaVRaYW1JSmFwSlN6b0V5b0VCS2pGUQ=="); 
// Wrap HF initialization in a function to ensure it's loaded
async function initHuggingFace() {
  try {
    // Test the connection
    const response = await fetch("https://api-inference.huggingface.co/models/01-ai/Yi-1.5-34B-Chat", {
      method: "POST",
      mode: 'cors',
      headers: {
        "Authorization": `Bearer ${HF_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: {
          past_user_inputs: [],
          generated_responses: [],
          text: "Hi"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log("Hugging Face connection test successful");
    return true;
  } catch (error) {
    console.error("Error initializing Hugging Face connection:", error);
    return false;
  }
}

// Wait for both DOM and HF script to load
window.addEventListener('load', () => {
  initializeSnowAnimation();
  initializeChatTerminal();
});

// Separate snow animation into its own function
function initializeSnowAnimation() {
  console.log("Snowdrop animation initialized.");

  const snowContainer = document.createElement('div');
  snowContainer.classList.add('snow');
  document.body.appendChild(snowContainer);

  function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.classList.add('snowflake');

    // Randomize snowflake properties
    const size = Math.random() * 4 + 2;
    const startingLeft = Math.random() * 100;
    const animationDuration = Math.random() * 8 + 4;
    const animationDelay = Math.random() * -20; // Negative delay for smoother initial appearance

    snowflake.style.width = `${size}px`;
    snowflake.style.height = `${size}px`;
    snowflake.style.left = `${startingLeft}vw`;
    snowflake.style.animationDuration = `${animationDuration}s`;
    snowflake.style.animationDelay = `${animationDelay}s`;

    snowContainer.appendChild(snowflake);

    // Remove snowflake after animation
    snowflake.addEventListener('animationend', () => {
      snowflake.remove();
    });
  }

  // Create more initial snowflakes for a fuller effect
  for (let i = 0; i < 30; i++) {
    createSnowflake();
  }

  // Create new snowflakes more frequently
  setInterval(createSnowflake, 200);  // Reduced from 1000ms to 200ms
}

// Separate chat terminal logic into its own function
function initializeChatTerminal() {
  const chatInput = document.querySelector('.chat-input');
  const chatSubmit = document.querySelector('.chat-submit');
  const chatMessages = document.querySelector('.chat-messages');

  // Add loading indicator
  const addLoadingIndicator = () => {
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('message', 'ai-message', 'loading');
    loadingDiv.innerHTML = `
      <div class="message-content">
        <span class="message-icon"></span>
        <div class="message-text">
          <span class="loading-dots">Thinking<span>.</span><span>.</span><span>.</span></span>
        </div>
      </div>
    `;
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return loadingDiv;
  };

  const removeLoadingIndicator = (loadingDiv) => {
    loadingDiv.remove();
  };

  const addMessage = (message, isUser = false) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(isUser ? 'user-message' : 'ai-message');
    
    const content = document.createElement('div');
    content.classList.add('message-content');
    
    const iconHtml = isUser 
      ? '<span class="message-icon">👤</span>'
      : '<span class="message-icon" style="background-image: url(\'ai16z.webp\'); background-size: cover;"></span>';
      
    // Process code blocks and format message
    let processedMessage = message;
    if (!isUser) {
      // Remove any leading/trailing colons from the response
      processedMessage = message.replace(/^[:\s]+|[:\s]+$/g, '');
      
      // Process code blocks if present
      processedMessage = processedMessage.replace(/```python([\s\S]*?)```/g, (match, code) => {
        return `<div class="code-block">
          <div class="code-header">
            <span>Python</span>
            <button class="run-code" onclick="runPythonCode(this)">▶ Run</button>
            <button class="copy-code" onclick="copyCode(this)">📋 Copy</button>
          </div>
          <pre><code class="python">${code.trim()}</code></pre>
          <div class="code-output"></div>
        </div>`;
      });
    }
    
    content.innerHTML = `
      ${iconHtml}
      <div class="message-text">${processedMessage}</div>
    `;
    
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Initialize syntax highlighting for code blocks
    if (!isUser) {
      messageDiv.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  };

  // Function to call AI API
  const getAIResponse = async (userMessage) => {
    try {
      console.log('Sending request to Hugging Face with message:', userMessage);

      const response = await fetch("https://api-inference.huggingface.co/models/01-ai/Yi-1.5-34B-Chat", {
        method: "POST",
        mode: 'cors',
        headers: {
          "Authorization": `Bearer ${HF_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: `<|im_start|>system
You are Ai16Sm, a friendly and concise AI crypto assistant. Keep responses brief and engaging.
<|im_end|>
<|im_start|>user
${userMessage}
<|im_end|>
<|im_start|>assistant`,
          parameters: {
            max_new_tokens: 150,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
            stop: ["<|im_end|>"],
            repetition_penalty: 1.2
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      const result = await response.json();
      console.log('Hugging Face Response:', result);

      // Clean up the response
      if (Array.isArray(result) && result.length > 0) {
        let text = result[0].generated_text;
        // Remove any system prompts or formatting
        text = text.replace(/<\|im_start\|>system[\s\S]*?<\|im_end\|>/g, '')
                   .replace(/<\|im_start\|>user[\s\S]*?<\|im_end\|>/g, '')
                   .replace(/<\|im_start\|>assistant/g, '')
                   .replace(/<\|im_end\|>/g, '')
                   .trim();
        
        // Limit response length if it's still too long
        if (text.length > 300) {
          text = text.substring(0, 300) + '...';
        }
        
        return text;
      } else {
        throw new Error("Unexpected response format from AI");
      }

    } catch (error) {
      console.error('Hugging Face API Error:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage(message, true);
    chatInput.value = '';

    // Add loading indicator
    const loadingIndicator = addLoadingIndicator();

    try {
      // Get AI response directly without checking for client
      const aiResponse = await getAIResponse(message);
      removeLoadingIndicator(loadingIndicator);
      
      if (aiResponse) {
        addMessage(aiResponse, false);
      } else {
        throw new Error("Empty response from AI");
      }
    } catch (error) {
      console.error('Chat error:', error);
      removeLoadingIndicator(loadingIndicator);
      addMessage(`I apologize, but I'm having trouble connecting to the AI service. Please try again later. Error: ${error.message}`, false);
    }
  };

  // Event listeners
  chatSubmit.addEventListener('click', handleSubmit);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });

  // Add initial message
  addMessage("Hello! I'm Ai16Sm, your AI crypto companion. How can I assist you today?", false);
}

// Add code execution function
const runPythonCode = async (button) => {
  const codeBlock = button.closest('.code-block');
  const code = codeBlock.querySelector('code').textContent;
  const outputDiv = codeBlock.querySelector('.code-output');
  
  outputDiv.innerHTML = '<div class="loading-dots">Running<span>.</span><span>.</span><span>.</span></div>';
  
  try {
    // Here you would typically send the code to a backend server
    // For now, we'll simulate execution
    const response = await fetch('https://your-python-backend/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });
    
    const result = await response.json();
    outputDiv.innerHTML = `<pre>${result.output}</pre>`;
  } catch (error) {
    outputDiv.innerHTML = `<pre class="error">Error: ${error.message}</pre>`;
  }
};

// Add code copying function
const copyCode = (button) => {
  const codeBlock = button.closest('.code-block');
  const code = codeBlock.querySelector('code').textContent;
  navigator.clipboard.writeText(code);
  
  // Show copied feedback
  const originalText = button.textContent;
  button.textContent = '✓ Copied!';
  setTimeout(() => {
    button.textContent = originalText;
  }, 2000);
};

// Optional: Add progressive display functionality
function addProgressiveMessage(message, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  messageDiv.classList.add(isUser ? 'user-message' : 'ai-message');
  
  const content = document.createElement('div');
  content.classList.add('message-content');
  
  const iconHtml = isUser 
    ? '<span class="message-icon">👤</span>'
    : '<span class="message-icon" style="background-image: url(\'ai16z.webp\'); background-size: cover;"></span>';
  
  content.innerHTML = `
    ${iconHtml}
    <div class="message-text"></div>
  `;
  
  messageDiv.appendChild(content);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageDiv.querySelector('.message-text');
}
