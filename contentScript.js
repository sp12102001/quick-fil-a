let templates = {};

// Load all templates when the script starts
chrome.storage.sync.get(null, function(items) {
    templates = items;
    console.log("Templates loaded:", templates);
});

// Update template storage listener
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync') {
        chrome.storage.sync.get(null, function(items) {
            templates = items;
            console.log("Templates updated:", templates);
        });
    }
});

function createPopup(template, variables) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 9999;
        `;

        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            width: 500px;
            max-width: 90%;
        `;

        const form = document.createElement('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const values = inputs.map(input => input.value);
            if (values.some(value => !value.trim())) {
                return; // Don't submit if any field is empty
            }
            document.body.removeChild(overlay);
            resolve(values);
        });

        // Add the form to popup
        popup.appendChild(form);

        const title = document.createElement('h2');
        title.textContent = 'Fill in the template';
        title.style.cssText = `
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 24px;
            color: #333;
        `;
        popup.appendChild(title);

        const templateContainer = document.createElement('div');
        templateContainer.style.cssText = `
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            white-space: pre-wrap;
            line-height: 1.5;
        `;

        let templateHTML = template;
        const inputs = [];

        variables.forEach((variable, index) => {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = variable;
            input.style.cssText = `
                display: inline-block;
                width: 120px;
                padding: 2px 8px;
                margin: 0 2px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: inherit;
                background-color: #fff;
            `;
            inputs.push(input);

            templateHTML = templateHTML.replace(
                `{{${variable}}}`,
                `<span class="input-placeholder"></span>`
            );
        });

        templateContainer.innerHTML = templateHTML;
        const placeholders = templateContainer.querySelectorAll('.input-placeholder');
        placeholders.forEach((placeholder, index) => {
            placeholder.replaceWith(inputs[index]);
        });

        form.appendChild(templateContainer);

        const submitButton = document.createElement('button');
        submitButton.textContent = 'Insert';
        submitButton.style.cssText = `
            width: 100%;
            padding: 10px;
            margin-top: 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

        form.appendChild(submitButton);
        popup.appendChild(form);
        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Update form submit handler
        form.onsubmit = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const values = inputs.map(input => input.value);
            if (values.some(value => !value.trim())) {
                return; // Don't submit if any field is empty
            }
            document.body.removeChild(overlay);
            resolve(values);
        };

        // Add keypress handler for inputs
        inputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Move to next input or submit if last input
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    } else {
                        const values = inputs.map(input => input.value);
                        if (values.some(value => !value.trim())) {
                            return; // Don't submit if any field is empty
                        }
                        document.body.removeChild(overlay);
                        resolve(values);
                    }
                }
            });
        });

        // Update submit button click handler
        submitButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const values = inputs.map(input => input.value);
            if (values.some(value => !value.trim())) {
                return; // Don't submit if any field is empty
            }
            document.body.removeChild(overlay);
            resolve(values);
        };

        if (inputs.length > 0) {
            inputs[0].focus();
        }
    });
}

async function replaceVariables(template) {
    const regex = /\{\{(\w+)\}\}/g;
    let match;
    const variables = [];
    while ((match = regex.exec(template)) !== null) {
        variables.push(match[1]);
    }

    const values = await createPopup(template, variables);
    let result = template;
    variables.forEach((variable, index) => {
        result = result.replace(`{{${variable}}}`, values[index]);
    });

    return result;
}

async function insertTemplate(node, template, shortcut) {
    try {
        let finalText = await replaceVariables(template);
        
        if (node.isContentEditable) {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const range = selection.getRangeAt(0);
            const startOffset = Math.max(0, range.startOffset - shortcut.length - 1); // -1 for the trigger character
            
            // Create a new range to handle the shortcut removal
            const newRange = document.createRange();
            newRange.setStart(range.startContainer, startOffset);
            newRange.setEnd(range.startContainer, range.startOffset);
            newRange.deleteContents();
            
            // Insert the formatted text
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = finalText;
            
            // Create a document fragment to hold all nodes
            const fragment = document.createDocumentFragment();
            while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
            }
            
            // Insert the fragment
            range.insertNode(fragment);
            
            // Move cursor to end
            selection.collapseToEnd();
        } else if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
            const start = Math.max(0, node.selectionStart - shortcut.length - 1);
            const end = node.selectionEnd;
            
            // For input/textarea, strip HTML tags
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = finalText;
            const plainText = tempDiv.textContent || tempDiv.innerText;
            
            node.value = node.value.substring(0, start) + plainText + node.value.substring(end);
            node.selectionStart = node.selectionEnd = start + plainText.length;
        }
    } catch (error) {
        console.error('Error inserting template:', error);
    }
}

function checkForShortcut(event) {
    let node = event.target;
    let text = '';

    if (node.isContentEditable) {
        let selection = window.getSelection();
        text = selection.focusNode.textContent.substring(0, selection.focusOffset);
    } else if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
        text = node.value.substring(0, node.selectionStart);
    }

    console.log("Checking for shortcut. Current text:", text);

    for (let snippet in templates) {
        let templateObj = templates[snippet];
        console.log("Checking template:", snippet, "with shortcut:", templateObj.shortcut);
        if (text.endsWith(templateObj.shortcut)) {
            console.log("Shortcut found! Inserting template.");
            event.preventDefault();
            event.stopPropagation();
            insertTemplate(node, templateObj.template, templateObj.shortcut);
            break;
        }
    }
}

document.addEventListener('keyup', function(event) {
    console.log("Key pressed:", event.key);
    checkForShortcut(event);
});

console.log("Content script loaded and shortcut listener added");
