document.addEventListener('DOMContentLoaded', function() {
    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show active tab content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            
            // Load chatbots list when My Chatbots tab is activated
            if (tabId === 'my-chatbots') {
                loadChatbotsList();
            }
        });
    });
    
    // Add intent functionality
    const addIntentBtn = document.getElementById('add-intent-btn');
    const intentsContainer = document.getElementById('intents-container');
    
    addIntentBtn.addEventListener('click', addIntent);
    
    // Form submission
    const chatbotForm = document.getElementById('chatbot-form');
    chatbotForm.addEventListener('submit', handleFormSubmit);
    
    // Reset form
    const resetFormBtn = document.getElementById('reset-form');
    resetFormBtn.addEventListener('click', resetForm);
    
    // Refresh chatbots list
    const refreshChatbotsBtn = document.getElementById('refresh-chatbots');
    if (refreshChatbotsBtn) {
        refreshChatbotsBtn.addEventListener('click', loadChatbotsList);
    }
    
    function addIntent() {
        const intentId = Date.now(); // Unique ID for the intent
        
        const intentElement = document.createElement('div');
        intentElement.className = 'intent';
        intentElement.setAttribute('data-intent-id', intentId);
        
        intentElement.innerHTML = `
            <div class="intent-header">
                <input type="text" class="intent-name-input" placeholder="Intent Name (e.g., greeting, weather_inquiry)" required>
                <button type="button" class="btn btn-danger remove-intent-btn">Remove Intent</button>
            </div>
            
            <div class="questions-container">
                <h4>Questions</h4>
                <p class="help-text">Add different ways users might ask about this intent</p>
                <button type="button" class="btn btn-secondary add-question-btn">Add Question</button>
            </div>
            
            <div class="answers-container">
                <h4>Answers</h4>
                <p class="help-text">Add responses your chatbot will give for this intent</p>
                <button type="button" class="btn btn-secondary add-answer-btn">Add Answer</button>
            </div>
        `;
        
        intentsContainer.appendChild(intentElement);
        
        // Add event listeners for the new intent
        const removeIntentBtn = intentElement.querySelector('.remove-intent-btn');
        const addQuestionBtn = intentElement.querySelector('.add-question-btn');
        const addAnswerBtn = intentElement.querySelector('.add-answer-btn');
        
        removeIntentBtn.addEventListener('click', () => {
            intentElement.remove();
        });
        
        addQuestionBtn.addEventListener('click', () => {
            addQuestion(intentElement);
        });
        
        addAnswerBtn.addEventListener('click', () => {
            addAnswer(intentElement);
        });
        
        // Add one question and one answer by default
        addQuestion(intentElement);
        addAnswer(intentElement);
    }
    
    function addQuestion(intentElement) {
        const questionsContainer = intentElement.querySelector('.questions-container');
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        
        questionItem.innerHTML = `
            <input type="text" placeholder="Enter question (e.g., What's the weather like?)" required>
            <button type="button" class="btn btn-danger remove-question-btn">Remove</button>
        `;
        
        // Insert before the "Add Question" button
        questionsContainer.insertBefore(questionItem, questionsContainer.lastElementChild);
        
        // Add event listener for remove button
        const removeBtn = questionItem.querySelector('.remove-question-btn');
        removeBtn.addEventListener('click', () => {
            questionItem.remove();
        });
    }
    
    function addAnswer(intentElement) {
        const answersContainer = intentElement.querySelector('.answers-container');
        const answerItem = document.createElement('div');
        answerItem.className = 'answer-item';
        
        answerItem.innerHTML = `
            <input type="text" placeholder="Enter answer (e.g., The weather is sunny today.)" required>
            <button type="button" class="btn btn-danger remove-answer-btn">Remove</button>
        `;
        
        // Insert before the "Add Answer" button
        answersContainer.insertBefore(answerItem, answersContainer.lastElementChild);
        
        // Add event listener for remove button
        const removeBtn = answerItem.querySelector('.remove-answer-btn');
        removeBtn.addEventListener('click', () => {
            answerItem.remove();
        });
    }
    
    function handleFormSubmit(e) {
        e.preventDefault();
        
        // Get chatbot name
        const chatbotName = document.getElementById('chatbot-name').value.trim();
        
        if (!chatbotName) {
            showMessage('Please enter a chatbot name', 'error');
            return;
        }
        
        // Get all intents
        const intents = [];
        const intentElements = document.querySelectorAll('.intent');
        
        if (intentElements.length === 0) {
            showMessage('Please add at least one intent', 'error');
            return;
        }
        
        let hasErrors = false;
        
        intentElements.forEach(intentElement => {
            const intentName = intentElement.querySelector('.intent-name-input').value.trim();
            
            if (!intentName) {
                showMessage('All intents must have a name', 'error');
                hasErrors = true;
                return;
            }
            
            // Get questions
            const questions = [];
            const questionInputs = intentElement.querySelectorAll('.questions-container .question-item input');
            questionInputs.forEach(input => {
                if (input.value.trim() !== '') {
                    questions.push(input.value.trim());
                }
            });
            
            if (questions.length === 0) {
                showMessage(`Intent "${intentName}" must have at least one question`, 'error');
                hasErrors = true;
                return;
            }
            
            // Get answers
            const answers = [];
            const answerInputs = intentElement.querySelectorAll('.answers-container .answer-item input');
            answerInputs.forEach(input => {
                if (input.value.trim() !== '') {
                    answers.push(input.value.trim());
                }
            });
            
            if (answers.length === 0) {
                showMessage(`Intent "${intentName}" must have at least one answer`, 'error');
                hasErrors = true;
                return;
            }
            
            intents.push({
                name: intentName,
                questions: questions,
                answers: answers
            });
        });
        
        if (hasErrors) {
            return;
        }
        
        // Prepare data for submission
        const formData = {
            chatbotName: chatbotName,
            intents: intents
        };
        
        // Send data to Flask server
        sendToFlaskServer(formData);
    }
    
    function sendToFlaskServer(data) {
        fetch('/api/create-chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showMessage(data.message, 'success');
                resetForm();
                // Switch to My Chatbots tab
                document.querySelector('[data-tab="my-chatbots"]').click();
            } else {
                showMessage(data.message, 'error');
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            showMessage('Error creating chatbot. Please try again.', 'error');
        });
    }
    
    function resetForm() {
        document.getElementById('chatbot-name').value = '';
        intentsContainer.innerHTML = '';
        // Add one empty intent
        addIntent();
    }
    
    function loadChatbotsList() {
        fetch('/api/chatbots')
            .then(response => response.json())
            .then(data => {
                const chatbotsList = document.getElementById('chatbots-list');
                
                if (data.status === 'success') {
                    if (data.chatbots.length === 0) {
                        chatbotsList.innerHTML = `
                            <div class="empty-state">
                                <h3>No Chatbots Created Yet</h3>
                                <p>Go to the "Build Chatbot" tab to create your first chatbot!</p>
                            </div>
                        `;
                    } else {
                        chatbotsList.innerHTML = data.chatbots.map(chatbot => `
                            <div class="chatbot-item" data-chatbot-id="${chatbot.id}">
                                <div class="chatbot-info">
                                    <h3>${escapeHtml(chatbot.name)}</h3>
                                    <div class="chatbot-meta">
                                        Intents: ${chatbot.intent_count} | 
                                        Created: ${new Date(chatbot.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div class="chatbot-actions">
                                    <button class="btn btn-secondary view-chatbot" data-id="${chatbot.id}">View</button>
                                    <button class="btn btn-success export-chatbot" data-id="${chatbot.id}">Export</button>
                                    <button class="btn btn-danger delete-chatbot" data-id="${chatbot.id}">Delete</button>
                                </div>
                            </div>
                        `).join('');
                        
                        // Add event listeners for action buttons
                        document.querySelectorAll('.view-chatbot').forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const chatbotId = e.target.getAttribute('data-id');
                                viewChatbot(chatbotId);
                            });
                        });
                        
                        document.querySelectorAll('.export-chatbot').forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const chatbotId = e.target.getAttribute('data-id');
                                exportChatbot(chatbotId);
                            });
                        });
                        
                        document.querySelectorAll('.delete-chatbot').forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const chatbotId = e.target.getAttribute('data-id');
                                deleteChatbot(chatbotId);
                            });
                        });
                    }
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error loading chatbots:', error);
                showMessage('Error loading chatbots list', 'error');
            });
    }
    
    function viewChatbot(chatbotId) {
        fetch(`/api/chatbot/${chatbotId}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert(`Chatbot: ${data.chatbot.name}\nIntents: ${data.chatbot.intents.length}\n\nView browser console for full details.`);
                    console.log('Chatbot details:', data.chatbot);
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error viewing chatbot:', error);
                showMessage('Error viewing chatbot', 'error');
            });
    }
    
    function exportChatbot(chatbotId) {
        fetch(`/api/export-chatbot/${chatbotId}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Create a downloadable JSON file
                    const dataStr = JSON.stringify(data.chatbot, null, 2);
                    const dataBlob = new Blob([dataStr], {type: 'application/json'});
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `chatbot-${data.chatbot.name}-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    
                    showMessage('Chatbot exported successfully!', 'success');
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error exporting chatbot:', error);
                showMessage('Error exporting chatbot', 'error');
            });
    }
    
    function deleteChatbot(chatbotId) {
        if (confirm('Are you sure you want to delete this chatbot? This action cannot be undone.')) {
            fetch(`/api/chatbot/${chatbotId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    showMessage(data.message, 'success');
                    loadChatbotsList(); // Refresh the list
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error deleting chatbot:', error);
                showMessage('Error deleting chatbot', 'error');
            });
        }
    }
    
    function showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        // Insert message at the top of the container
        const container = document.querySelector('.container');
        container.insertBefore(messageDiv, container.firstChild);
        
        // Auto-remove success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
    }
    
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // Add one initial intent when page loads
    addIntent();

        // DOM Elements
    const uploadJsonBtn = document.getElementById('uploadJsonBtn');
    const jsonUploadModal = document.getElementById('jsonUploadModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const jsonFileInput = document.getElementById('jsonFileInput');
    const jsonPreview = document.getElementById('jsonPreview');
    const submitJsonBtn = document.getElementById('submitJsonBtn');
    const statusMessage = document.getElementById('statusMessage');

    // Open Modal
    uploadJsonBtn.addEventListener('click', () => {
        jsonUploadModal.style.display = 'flex';
    });

    // Close Modal
    closeModalBtn.addEventListener('click', () => {
        jsonUploadModal.style.display = 'none';
        resetForm();
    });

    // Close modal when clicking outside
    jsonUploadModal.addEventListener('click', (e) => {
        if (e.target === jsonUploadModal) {
            jsonUploadModal.style.display = 'none';
            resetForm();
        }
    });

    // File Input Change
    jsonFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            readJsonFile(file);
        }
    });

    // Read JSON File
    function readJsonFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const jsonContent = e.target.result;
                const jsonData = JSON.parse(jsonContent);
                
                // Validate JSON structure
                if (validateJsonStructure(jsonData)) {
                    jsonPreview.textContent = JSON.stringify(jsonData, null, 2);
                    jsonPreview.style.color = '#e2e8f0';
                    submitJsonBtn.disabled = false;
                    showStatus('File loaded successfully!', 'success');
                } else {
                    throw new Error('Invalid JSON structure. Expected format: { "chatbotName": "...", "intents": [...] }');
                }
            } catch (error) {
                jsonPreview.textContent = `Error: ${error.message}`;
                jsonPreview.style.color = '#fc8181';
                submitJsonBtn.disabled = true;
                showStatus(error.message, 'error');
            }
        };
        
        reader.onerror = () => {
            jsonPreview.textContent = 'Error reading file';
            jsonPreview.style.color = '#fc8181';
            submitJsonBtn.disabled = true;
            showStatus('Error reading file', 'error');
        };
        
        reader.readAsText(file);
    }

    // Validate JSON Structure
    function validateJsonStructure(data) {
        return (
            data &&
            typeof data === 'object' &&
            data.chatbotName &&
            typeof data.chatbotName === 'string' &&
            Array.isArray(data.intents) &&
            data.intents.every(intent => 
                intent.name && 
                typeof intent.name === 'string' &&
                Array.isArray(intent.questions) &&
                Array.isArray(intent.answers)
            )
        );
    }

    // Submit JSON to Server
    submitJsonBtn.addEventListener('click', async () => {
        const file = jsonFileInput.files[0];
        if (!file) return;
        
        try {
            submitJsonBtn.disabled = true;
            submitJsonBtn.textContent = 'Creating Chatbot...';
            
            const jsonContent = await readFileAsText(file);
            const jsonData = JSON.parse(jsonContent);
            
            const response = await fetch('/api/upload-json-chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jsonData)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                showStatus(`Chatbot "${result.chatbot_name}" created successfully!`, 'success');
                setTimeout(() => {
                    jsonUploadModal.style.display = 'none';
                    resetForm();
                    // Optional: Refresh page or update UI
                    location.reload();
                }, 2000);
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            showStatus(`Error: ${error.message}`, 'error');
        } finally {
            submitJsonBtn.disabled = false;
            submitJsonBtn.textContent = 'Create Chatbot from JSON';
        }
    });

    // Helper function to read file as text
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Reset Form
    function resetForm() {
        jsonFileInput.value = '';
        jsonPreview.textContent = 'No file selected';
        jsonPreview.style.color = '#e2e8f0';
        submitJsonBtn.disabled = true;
        statusMessage.style.display = 'none';
    }

    // Show Status Message
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 5000);
        }
    }
});