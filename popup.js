document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const templateForm = document.querySelector('.template-form');
    const shortcutInput = document.getElementById('shortcut');
    const descriptionInput = document.getElementById('description');
    const templateDiv = document.getElementById('template');
    const templateList = document.getElementById('templateList');
    const saveButton = document.querySelector('button[type="submit"]');
    const cancelButton = document.querySelector('.template-form button[type="button"]');
    const importButton = document.getElementById('importButton');
    const exportButton = document.getElementById('exportButton');
    const fileInput = document.getElementById('fileInput');

    // Load existing templates
    function loadTemplates() {
        chrome.storage.sync.get(null, function(items) {
            templateList.innerHTML = '';
            
            if (Object.keys(items).length === 0) {
                templateList.innerHTML = '<li class="list-group-item text-muted">No templates yet. Click "Add New Template" to create one.</li>';
                return;
            }

            for (let key in items) {
                const template = items[key];
                const li = document.createElement('li');
                li.className = 'list-group-item template-item';
                
                const previewDiv = document.createElement('div');
                previewDiv.textContent = template.template.replace(/<[^>]*>/g, '');
                
                li.innerHTML = `
                    <div class="template-header">
                        <div class="header-main">
                            <div class="header-title">
                                <strong>${key}</strong>
                                <div class="toggle-area">
                                    <span class="toggle-icon">▼</span>
                                    <span class="shortcut-preview">/${template.shortcut}</span>
                                </div>
                            </div>
                        </div>
                        <div class="header-buttons">
                            <button class="btn btn-sm btn-primary edit-btn" data-snippet="${key}">Edit</button>
                            <button class="btn btn-sm btn-danger delete-btn" data-snippet="${key}">Delete</button>
                        </div>
                    </div>
                    <div class="template-content">
                        <div class="template-preview">${previewDiv.textContent}</div>
                    </div>
                `;

                // Add click handler for toggle
                const toggleArea = li.querySelector('.toggle-area');
                toggleArea.addEventListener('click', function(e) {
                    e.stopPropagation();
                    li.classList.toggle('expanded');
                });

                templateList.appendChild(li);
            }
            addDeleteListeners();
            addEditListeners();
        });
    }

    // Save template
    saveButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Validate inputs
        if (!shortcutInput.value) {
            shortcutInput.classList.add('is-invalid');
            return;
        }
        if (!descriptionInput.value) {
            descriptionInput.classList.add('is-invalid');
            return;
        }
        if (!templateDiv.innerHTML.trim()) {
            templateDiv.classList.add('is-invalid');
            return;
        }

        const templateObj = {
            shortcut: shortcutInput.value,
            template: templateDiv.innerHTML.trim()
        };
        
        const saveObj = {};
        saveObj[descriptionInput.value] = templateObj;

        const oldDescription = descriptionInput.getAttribute('data-original-description');
        if (oldDescription && oldDescription !== descriptionInput.value) {
            chrome.storage.sync.remove(oldDescription);
        }

        chrome.storage.sync.set(saveObj, function() {
            shortcutInput.classList.remove('is-invalid');
            descriptionInput.classList.remove('is-invalid');
            templateDiv.classList.remove('is-invalid');
            
            shortcutInput.value = '';
            descriptionInput.value = '';
            templateDiv.innerHTML = '';
            descriptionInput.removeAttribute('data-original-description');
            templateForm.style.display = 'none';
            
            loadTemplates();
        });
    });

    // Cancel template editing
    cancelButton.addEventListener('click', function() {
        shortcutInput.value = '';
        descriptionInput.value = '';
        templateDiv.innerHTML = '';
        descriptionInput.removeAttribute('data-original-description');
        templateForm.style.display = 'none';
        
        // Remove any validation states
        shortcutInput.classList.remove('is-invalid');
        descriptionInput.classList.remove('is-invalid');
        templateDiv.classList.remove('is-invalid');
    });

    // Delete template
    function addDeleteListeners() {
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering parent click events
                const snippet = this.getAttribute('data-snippet');
                chrome.storage.sync.remove(snippet, function() {
                    console.log('Template deleted:', snippet);
                    loadTemplates();
                });
            });
        });
    }

    // Update the paste event listener
    templateDiv.addEventListener('paste', function(e) {
        e.preventDefault();
        let content = e.clipboardData.getData('text/html');
        
        if (!content) {
            content = e.clipboardData.getData('text/plain');
            // Sanitize the content
            content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            document.execCommand('insertText', false, content);
        } else {
            // Basic HTML sanitization
            const div = document.createElement('div');
            div.innerHTML = content;
            // Remove potentially harmful elements/attributes
            const clean = div.textContent;
            document.execCommand('insertText', false, clean);
        }
    });

    // Handle template editing
    templateList.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-btn')) {
            const snippet = e.target.getAttribute('data-snippet');
            chrome.storage.sync.get(snippet, function(result) {
                const template = result[snippet];
                shortcutInput.value = template.shortcut;
                descriptionInput.value = snippet;
                templateDiv.innerHTML = template.template;
                descriptionInput.setAttribute('data-original-description', snippet);
                templateForm.style.display = 'block';
            });
        }
    });

    // Export Templates
    exportButton.addEventListener('click', function() {
        chrome.storage.sync.get(null, function(items) {
            const dataStr = JSON.stringify(items, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = 'templates.json';
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        });
    });

    // Import Templates
    importButton.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const templates = JSON.parse(e.target.result);
                    
                    // Show confirmation dialog
                    if (confirm('Do you want to:\n"Replace" all existing templates\nor\n"Merge" with existing templates?\n\nOK = Replace\nCancel = Merge')) {
                        // Replace: Clear existing templates first
                        chrome.storage.sync.clear(() => {
                            chrome.storage.sync.set(templates, function() {
                                alert('Templates imported successfully!');
                                loadTemplates();
                            });
                        });
                    } else {
                        // Merge: Add to existing templates
                        chrome.storage.sync.set(templates, function() {
                            alert('Templates merged successfully!');
                            loadTemplates();
                        });
                    }
                } catch (error) {
                    alert('Error importing templates. Please make sure the file is valid JSON.');
                    console.error('Import error:', error);
                }
            };
            reader.readAsText(file);
        }
    });

    // Show form button
    const addButton = document.getElementById('addButton');
    addButton.addEventListener('click', function() {
        templateForm.style.display = 'block';
    });
    document.querySelector('h2').after(addButton);

    // Initial setup
    templateForm.style.display = 'none';
    loadTemplates();

    function addEditListeners() {
        const editButtons = document.querySelectorAll('.edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const snippet = this.getAttribute('data-snippet');
                chrome.storage.sync.get(snippet, function(result) {
                    const template = result[snippet];
                    if (template) {
                        shortcutInput.value = template.shortcut;
                        descriptionInput.value = snippet;
                        templateDiv.innerHTML = template.template;
                        templateForm.style.display = 'block';
                        // Scroll to the form
                        templateForm.scrollIntoView({ 
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        });
    }

    // Add this after your existing event listeners
    document.getElementById('downloadSampleButton').addEventListener('click', function() {
        const sampleTemplates = {
            "Welcome Email": {
                "shortcut": "+WELCOME",
                "template": "Dear {{name}},\n\nWelcome to our platform! We're excited to have you on board.\n\nBest regards,\n{{sender}}"
            },
            "Meeting Request": {
                "shortcut": "+meeting",
                "template": "Hi {{recipient}},\n\nWould you be available for a {{duration}} meeting on {{date}} to discuss {{topic}}?\n\nBest,\n{{sender}}"
            },
            "Thank You Note": {
                "shortcut": "+thanks",
                "template": "Dear {{name}},\n\nThank you for {{action}}. I really appreciate your {{quality}}.\n\nBest regards,\n{{sender}}"
            }
        };

        const dataStr = JSON.stringify(sampleTemplates, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', 'sample_templates.json');
        linkElement.click();
    });
});
