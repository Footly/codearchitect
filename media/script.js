document.addEventListener('DOMContentLoaded', () => {
    const vscode = acquireVsCodeApi();

    window.addEventListener('message', event => {
        const message = event.data;

        if (message.command === 'editObject') {
            // Reset previous content
            document.body.innerHTML = '';

            // Handle the editObject command
            vscode.postMessage({ command: 'objectEdited', item: message.item });

            // Create and append the container for title and button
            const container = createTitleContainer(message.item, vscode);
            document.body.appendChild(container);

            // Create a new div for the object
            const objectDiv = document.createElement('div');
            // Give some css
            objectDiv.style.marginBottom = '10px';
            document.body.appendChild(objectDiv);

            // Render child elements
            message.item.hidden_children.forEach(child => {
                //Copy the $links of the parent to the child
                child.$links = message.item.$links;
                //Copy the tags of the parent to the child
                renderChild(child, objectDiv, vscode);

            });
        }
    });

    vscode.postMessage({ command: 'webviewReady' });
});

function resolveRef(schema, root_schema) {
    for (const key in schema) {
        if (key === "$ref") {
            const ref = schema["$ref"].split("/");
            //Discard the first element
            ref.shift();
            //Convert all %24 to $ using map
            const ref_keys = ref.map((item) => item.replace(/%24/g, "$"));
            //Get the root schema
            let current_schema = root_schema;
            //Loop through the ref_keys
            for (const ref_key of ref_keys) {
                current_schema = current_schema[ref_key];
            }
            schema = current_schema;
        }
    }
    return schema;
}

// Helper functions
function createTitleContainer(item, vscode) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';

    const title = document.createElement('h2');
    title.textContent = item.$label;

    // Create and append the edit button which is a minimalistic icon
    const editButton = document.createElement('button');
    editButton.className = 'codicon codicon-edit';
    editButton.style.marginLeft = '10px';
    editButton.style.background = 'none'; // Remove the background
    editButton.style.border = 'none'; // Remove the border
    editButton.style.padding = '0'; // Remove the padding
    editButton.style.cursor = 'pointer'; // Add cursor pointer
    editButton.style.color = '#6c6c6c'; // Set icon color to match VSCode light theme
    editButton.onclick = () => handleEditTitle(title, item, vscode);

    container.appendChild(title);
    container.appendChild(editButton);
    return container;
}

function handleEditTitle(title, item, vscode) {
    // Hide the edit button
    title.nextElementSibling.style.display = 'none';
    // Enable content-editable mode on the title
    title.contentEditable = true;

    // Apply custom styles when editing
    title.style.fontStyle = 'italic'; // Apply cursive style
    title.style.outline = 'none'; // Remove the default outline
    //I want to add the cursor to the end of the text
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(title);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    title.focus();


    // Handle Enter key and focus out event to save changes
    title.addEventListener('keydown', (event) => handleTitleInput(event, title, item, vscode));
    title.addEventListener('focusout', () => handleTitleInputFocusOut(title, item, vscode));
}

function handleTitleInput(event, title, item, vscode) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent inserting a line break
        title.contentEditable = false;

        // Reset the styles after editing
        title.style.fontStyle = '';
        title.style.border = '';
        title.style.padding = '';

        item.$label = title.textContent;
    }
}

function handleTitleInputFocusOut(title, item, vscode) {
    // Disable content-editable mode and reset styles
    title.contentEditable = false;
    title.style.fontStyle = '';
    title.style.border = '';
    title.style.padding = '';

    // Show the edit button
    title.nextElementSibling.style.display = 'block';

    item.$label = title.textContent;

    // Update child items if needed
    item.hidden_children.forEach(child => {
        if (child.$label === '$label') {
            child.value = title.textContent;
        }
    });

    vscode.postMessage({ command: 'saveObject', item: item });
}

function renderChild(child, div, vscode, depth = 0) {
    const modelType = child.schema.modelType;
    switch (modelType) {
        case 'sub-object':
            renderSubObjectChild(child, div, vscode, depth);
            break;
        case 'input-string':
            renderInputString(child, div, vscode);
            break;
        case 'checkbox':
            renderCheckbox(child, div, vscode);
            break;
        case 'dropdown-select':
            renderDropdownSelect(child, div, vscode);
            break;
        case 'dropdown-select-tag':
            renderDropdownSelectTag(child, div, vscode);
            break;
        case 'pool-dropdown-select':
            renderPoolDropdownSelect(child, div, vscode);
            break;
        case 'pool-dropdown-select-tag':
            renderPoolDropdownSelectTag(child, div, vscode);
            break;
        case 'text-area':
            renderTextArea(child, div, vscode);
            break;
        default:
            console.error(`Unsupported modelType: ${modelType}`);
            break;
    }
}

function renderInputString(child, div, vscode) {
    // Create and style the label
    const $label = document.createElement('label');
    $label.textContent = child.$label;
    $label.style.display = 'block';
    $label.style.marginBottom = '8px'; // Spacing between label and input field
    $label.style.color = '#eee'; // Lighter text color for dark mode
    div.appendChild($label);

    // Create and style the input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = child.value;
    input.style.width = 'calc(100% - 16px)'; // Full width minus padding/margin
    input.style.padding = '8px'; // Padding inside the input field
    input.style.border = '1px solid #444'; // Dark border to match dark mode
    input.style.borderRadius = '4px'; // Rounded corners
    input.style.backgroundColor = '#333'; // Dark background
    input.style.color = '#eee'; // Lighter text color
    input.style.marginBottom = '10px'; // Spacing below the input field
    input.style.marginRight = 'auto'; // Center horizontally with auto margins
    input.style.marginLeft = 'auto'; // Center horizontally with auto margins
    div.appendChild(input);

    // Add event listener for input changes
    input.addEventListener('input', (event) => {
        child.value = event.target.value;
        vscode.postMessage({ command: 'saveObject', item: child });
    });
}

function renderTextArea(child, div, vscode) {
    // Create the container for the collapsible content
    const collapsibleDiv = document.createElement('div');
    collapsibleDiv.style.marginBottom = '10px'; // Reduced spacing between sections
    collapsibleDiv.style.border = '1px solid #444'; // Border for collapsible section
    collapsibleDiv.style.borderRadius = '6px'; // Slightly smaller rounded corners
    collapsibleDiv.style.backgroundColor = '#222'; // Dark background for container
    collapsibleDiv.style.overflow = 'hidden'; // Prevent content overflow
    div.appendChild(collapsibleDiv);

    // Create the header for the collapsible section
    const headerDiv = document.createElement('div');
    headerDiv.style.display = 'flex';
    headerDiv.style.alignItems = 'center';
    headerDiv.style.padding = '8px'; // Reduced padding
    headerDiv.style.cursor = 'pointer';
    headerDiv.style.userSelect = 'none'; // Prevent text selection on click
    headerDiv.style.backgroundColor = '#333'; // Darker background for header
    headerDiv.style.borderBottom = '1px solid #444'; // Border separating header and content
    collapsibleDiv.appendChild(headerDiv);

    // Create the label
    const $label = document.createElement('h4');
    $label.textContent = child.$label;
    $label.style.margin = '0';
    $label.style.color = '#eee'; // Lighter text color for better contrast
    headerDiv.appendChild($label);

    // Create the toggle button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = '▼'; // Default to "expanded" icon
    toggleButton.style.background = 'none';
    toggleButton.style.border = 'none';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.color = '#aaa'; // Lighter color for better contrast
    toggleButton.style.fontSize = '14px'; // Smaller font size
    toggleButton.style.marginLeft = '8px'; // Reduced space between label and button
    headerDiv.appendChild(toggleButton);

    // Create the collapsible content container
    const contentDiv = document.createElement('div');
    contentDiv.style.display = 'none'; // Initially hidden
    contentDiv.style.padding = '8px'; // Reduced padding
    contentDiv.style.backgroundColor = '#333'; // Dark background for content
    collapsibleDiv.appendChild(contentDiv);

    // Create the textarea element
    const textarea = document.createElement('textarea');
    textarea.value = child.value;
    textarea.style.width = 'calc(100% - 16px)'; // Full width minus padding
    textarea.style.height = '80px'; // Reduced height for a more compact appearance
    textarea.style.resize = 'vertical'; // Allow vertical resizing
    textarea.style.backgroundColor = '#333'; // Dark background for textarea
    textarea.style.color = '#eee'; // Lighter text color for textarea
    textarea.style.border = '1px solid #444'; // Border to match the dark mode theme
    textarea.style.borderRadius = '6px'; // Rounded corners for textarea
    textarea.style.padding = '8px'; // Padding inside textarea
    textarea.style.margin = '0 auto'; // Center the textarea horizontally
    contentDiv.appendChild(textarea);

    // Add input event listener to the textarea
    textarea.addEventListener('input', (event) => {
        child.value = event.target.value;
        vscode.postMessage({ command: 'saveObject', item: child });
    });

    // Toggle function for showing/hiding content
    headerDiv.addEventListener('click', () => {
        const isExpanded = contentDiv.style.display === 'block';
        contentDiv.style.display = isExpanded ? 'none' : 'block';
        toggleButton.textContent = isExpanded ? '▼' : '▲'; // Change icon
    });
}

function renderCheckbox(child, div, vscode) {
    // Create and style the container for the checkbox
    const checkboxContainer = document.createElement('div');
    checkboxContainer.style.display = 'flex';
    checkboxContainer.style.alignItems = 'center';
    checkboxContainer.style.marginBottom = '10px'; // Spacing between items
    div.appendChild(checkboxContainer);

    // Create and style the label
    const $label = document.createElement('label');
    $label.textContent = child.$label;
    $label.style.marginRight = '8px'; // Space between label and checkbox
    $label.style.color = '#eee'; // Lighter text color for dark mode
    checkboxContainer.appendChild($label);

    // Create and style the checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = child.value;
    checkbox.style.cursor = 'pointer'; // Pointer cursor for interactivity
    checkboxContainer.appendChild(checkbox);

    // Add event listener for checkbox changes
    checkbox.addEventListener('change', (event) => {
        child.value = event.target.checked;
        vscode.postMessage({ command: 'saveObject', item: child });
    });
}

function renderDropdownSelect(child, div, vscode) {
    // Create and style the label
    const $label = document.createElement('label');
    $label.textContent = child.$label;
    $label.style.display = 'block';
    $label.style.marginBottom = '10px';
    $label.style.color = '#eee'; // Lighter text color for better contrast
    div.appendChild($label);

    // Create and style the select element
    const select = document.createElement('select');
    select.style.marginBottom = '10px';
    select.style.padding = '8px';
    select.style.border = '1px solid #444';
    select.style.borderRadius = '8px';
    select.style.backgroundColor = '#333';
    select.style.color = '#eee'; // Lighter text color for better contrast
    select.style.fontSize = '14px'; // Consistent font size
    select.style.cursor = 'pointer';

    div.appendChild(select);

    // Populate the select options
    const options = child.schema.enum;

    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        optionElement.style.backgroundColor = '#333'; // Dark background for options
        optionElement.style.color = '#eee'; // Lighter text color for options
        select.appendChild(optionElement);
    });

    select.value = child.value;

    // Event listener for when the select value changes
    select.addEventListener('change', (event) => {
        child.value = event.target.value;
        vscode.postMessage({ command: 'saveObject', item: child });
    });
}

function renderDropdownSelectTag(child, div, vscode) {
    const $label = document.createElement('label');
    $label.textContent = child.$label;
    $label.style.display = 'block';
    $label.style.marginBottom = '10px';
    $label.style.color = '#eee'; // Lighter text color for better contrast
    div.appendChild($label);

    // Create a div to display the selected value
    const valueDisplay = document.createElement('div');
    valueDisplay.style.marginBottom = '10px';
    valueDisplay.style.padding = '10px';
    valueDisplay.style.border = '1px solid #444';
    valueDisplay.style.borderRadius = '8px';
    valueDisplay.style.backgroundColor = '#333';
    valueDisplay.style.color = '#eee'; // Lighter text color for better contrast
    valueDisplay.style.cursor = 'pointer';
    valueDisplay.textContent = child.value ? `Selected: ${child.$label}` : 'Select a value';
    div.appendChild(valueDisplay);

    // Create the popup container (hidden by default)
    const popupContainer = document.createElement('div');
    popupContainer.style.position = 'fixed';
    popupContainer.style.left = '50%';
    popupContainer.style.top = '50%';
    popupContainer.style.transform = 'translate(-50%, -50%)';
    popupContainer.style.backgroundColor = '#222';
    popupContainer.style.border = '1px solid #444';
    popupContainer.style.padding = '20px';
    popupContainer.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
    popupContainer.style.borderRadius = '10px';
    popupContainer.style.display = 'none';
    popupContainer.style.zIndex = 1000;
    document.body.appendChild(popupContainer);

    // Add close button to the popup
    const closePopupBtn = document.createElement('button');
    closePopupBtn.textContent = 'Close';
    closePopupBtn.style.backgroundColor = '#444';
    closePopupBtn.style.color = '#eee'; // Lighter text color for better contrast
    closePopupBtn.style.border = 'none';
    closePopupBtn.style.borderRadius = '5px';
    closePopupBtn.style.padding = '5px 10px';
    closePopupBtn.style.cursor = 'pointer';
    closePopupBtn.style.marginBottom = '10px';
    popupContainer.appendChild(closePopupBtn);

    closePopupBtn.addEventListener('click', () => {
        popupContainer.style.display = 'none';
    });

    // Create container for tree view inside the popup
    const treeContainer = document.createElement('div');
    treeContainer.style.maxHeight = '300px';
    treeContainer.style.overflowY = 'auto';
    treeContainer.style.padding = '10px';
    popupContainer.appendChild(treeContainer);

    // Open the popup when the valueDisplay div is clicked
    valueDisplay.addEventListener('click', () => {
        popupContainer.style.display = 'block';
    });

    // Tag to filter
    const tags_filter = child.schema.const;

    // Filter the links using the tags_filter
    const links = child.$links.filter(link => link.$tags.some(t => tags_filter.includes(t)));

    // Convert the filtered links into a tree structure
    function buildTree(data) {
        const root = {};
        let maxDepth = 0;

        data.forEach(item => {
            // Ensure $path exists and is an array
            if (!item.$path || !Array.isArray(item.$path)) {
                console.error("Invalid $path in item:", item);
                return;
            }

            maxDepth = Math.max(maxDepth, item.$path.length);

            let currentNode = root;
            item.$path.forEach((pathPart, index) => {
                if (!currentNode[pathPart]) {
                    currentNode[pathPart] = {
                        __children: {},
                        __label: pathPart,
                        __id: item.$id,
                        __depth: index
                    };
                }
                if (index === item.$path.length - 1) {
                    currentNode[pathPart].__isLeaf = true;
                    currentNode[pathPart].__label = item.$label; // Update label to the final label
                }
                currentNode = currentNode[pathPart].__children;
            });
        });

        return { root, maxDepth };
    }

    // Render the tree view from the tree structure
    function renderTreeView(node, parentDiv, depth, maxDepth) {
        Object.keys(node).forEach(key => {
            if (key.startsWith("__")) return; // Skip internal properties
            const currentNode = node[key];
            const div = document.createElement('div');
            div.style.marginLeft = `${depth * 10}px`; // Further reduced horizontal distance
            div.style.padding = '6px'; // Further reduced padding
            div.style.borderRadius = '8px';
            div.style.marginBottom = '5px';
            div.style.backgroundColor = `rgba(0, 0, 0, ${0.2 + (maxDepth - depth) / maxDepth * 0.4})`;
            div.style.color = '#eee'; // Lighter text color for better contrast
            div.style.cursor = 'pointer';
            div.style.fontSize = '14px';

            const label = document.createElement('span');
            label.textContent = currentNode.__label;

            div.appendChild(label);
            parentDiv.appendChild(div);

            if (currentNode.__isLeaf) {
                div.style.backgroundColor = '#555';
                div.addEventListener('click', () => {
                    // Handle leaf node selection
                    child.value = currentNode.__id;
                    valueDisplay.textContent = `Selected: ${currentNode.__label}`;
                    popupContainer.style.display = 'none';
                    vscode.postMessage({ command: 'saveObject', item: child });
                });
            } else {
                // Toggle children visibility
                const toggleBtn = document.createElement('button');
                toggleBtn.textContent = '-'; // Show collapse symbol by default
                toggleBtn.style.backgroundColor = 'transparent';
                toggleBtn.style.border = 'none';
                toggleBtn.style.color = '#eee'; // Lighter text color for better contrast
                toggleBtn.style.cursor = 'pointer';
                toggleBtn.style.marginRight = '5px';
                toggleBtn.style.fontSize = '16px'; // Increased font size for better visibility
                div.prepend(toggleBtn);

                const childrenDiv = document.createElement('div');
                childrenDiv.classList.add('children');
                childrenDiv.style.marginLeft = '10px'; // Further reduced indentation for children
                childrenDiv.style.display = 'block'; // Show children by default
                div.appendChild(childrenDiv);

                toggleBtn.addEventListener('click', () => {
                    const isVisible = childrenDiv.style.display === 'block';
                    childrenDiv.style.display = isVisible ? 'none' : 'block';
                    toggleBtn.textContent = isVisible ? '+' : '-';
                });

                renderTreeView(currentNode.__children, childrenDiv, depth + 1, maxDepth);
            }
        });
    }

    // Convert the filtered links to tree structure
    const { root, maxDepth } = buildTree(links);

    // Render the tree view inside the popup container
    renderTreeView(root, treeContainer, 0, maxDepth);
}

function renderPoolDropdownSelect(child, div, vscode) {
    // Create and append the container for the filter input and selected items
    const containerDiv = document.createElement('div');
    containerDiv.style.marginBottom = '10px'; // Add margin
    div.appendChild(containerDiv);

    // Create and append the $label
    const $label = document.createElement('label');
    $label.textContent = child.$label;
    $label.style.marginBottom = '10px';
    containerDiv.appendChild($label);

    // Create and append the input field for searching
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Start typing to filter...';
    input.style.marginBottom = '10px';
    containerDiv.appendChild(input);

    // Create and append the selected items container within the same div
    const selectedItemsDiv = document.createElement('div');
    selectedItemsDiv.className = 'selected-items';
    containerDiv.appendChild(selectedItemsDiv);

    // Create and append the suggestions container
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'suggestions';
    suggestionsDiv.style.display = 'none'; // Initially hidden
    div.appendChild(suggestionsDiv);

    // Initialize with existing selected values
    const selectedValues = child.value || [];
    renderSelectedItems(selectedItemsDiv, selectedValues, child);

    // Setup event listeners
    setupPoolDropdownListeners(input, suggestionsDiv, selectedItemsDiv, selectedValues, child);

    // Helper functions
    function setupPoolDropdownListeners(input, suggestionsDiv, selectedItemsDiv, selectedValues, child) {
        // Show suggestions when input is focused
        input.addEventListener('focus', () => {
            updateSuggestions(input, suggestionsDiv, selectedItemsDiv, selectedValues, child);
            suggestionsDiv.style.display = 'block';
        });

        // Update suggestions on input change
        input.addEventListener('input', () => updateSuggestions(input, suggestionsDiv, selectedItemsDiv, selectedValues, child));

        // Hide suggestions when clicking outside
        document.addEventListener('click', (event) => {
            if (!div.contains(event.target)) {
                suggestionsDiv.style.display = 'none';
            }
        });
    }

    function updateSuggestions(input, suggestionsDiv, selectedItemsDiv, selectedValues, child) {
        const query = input.value.toLowerCase();
        const enumOptions = child.schema.items.enum;
        const filteredOptions = enumOptions.filter(option =>
            option.toLowerCase().includes(query) && !selectedValues.includes(option)
        );
        renderSuggestions(suggestionsDiv, filteredOptions, selectedItemsDiv, selectedValues, child);
    }

    function renderSuggestions(suggestionsDiv, options, selectedItemsDiv, selectedValues, child) {
        suggestionsDiv.innerHTML = '';
        options.forEach(option => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.textContent = option;
            suggestionItem.onclick = () => handleSuggestionClick(option, suggestionsDiv, selectedItemsDiv, selectedValues, child);
            suggestionsDiv.appendChild(suggestionItem);
        });
    }

    function handleSuggestionClick(option, suggestionsDiv, selectedItemsDiv, selectedValues, child) {
        selectedValues.push(option);
        renderSelectedItems(selectedItemsDiv, selectedValues, child);
        suggestionsDiv.style.display = 'none';
    }

    function renderSelectedItems(selectedItemsDiv, selectedValues, child) {
        selectedItemsDiv.innerHTML = '';
        selectedValues.forEach((value, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'selected-item';

            const itemLabel = document.createElement('span');
            itemLabel.textContent = value;
            itemDiv.appendChild(itemLabel);

            const removeButton = document.createElement('button');
            removeButton.textContent = 'X';
            removeButton.className = 'remove-button';
            removeButton.onclick = () => handleRemoveSelectedItem(index, selectedValues, selectedItemsDiv, child);
            itemDiv.appendChild(removeButton);

            selectedItemsDiv.appendChild(itemDiv);
        });

        updateChildValues(child, selectedValues);
    }

    function handleRemoveSelectedItem(index, selectedValues, selectedItemsDiv, child) {
        selectedValues.splice(index, 1);
        renderSelectedItems(selectedItemsDiv, selectedValues, child);
    }

    function updateChildValues(child, selectedValues) {
        child.value = selectedValues;
        vscode.postMessage({ command: 'saveObject', item: child });
    }
}

function renderPoolDropdownSelectTag(child, div, vscode) {
    // Create and append the container for the filter input and selected items
    const containerDiv = document.createElement('div');
    containerDiv.style.marginBottom = '10px'; // Add margin
    div.appendChild(containerDiv);

    // Create and append the $label
    const $label = document.createElement('label');
    $label.textContent = child.$label;
    $label.style.marginBottom = '10px';
    containerDiv.appendChild($label);

    // Create and append the input field for searching
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Start typing to filter...';
    input.style.marginBottom = '10px';
    containerDiv.appendChild(input);

    // Create and append the selected items container within the same div
    const selectedItemsDiv = document.createElement('div');
    selectedItemsDiv.className = 'selected-items';
    containerDiv.appendChild(selectedItemsDiv);

    // Create and append the suggestions container as a popup window with dark mode styling
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'suggestions-popup';
    suggestionsDiv.style.position = 'absolute';
    suggestionsDiv.style.border = '1px solid #444'; // Darker border for dark mode
    suggestionsDiv.style.backgroundColor = '#1e1e1e'; // Dark background (VSCode-like)
    suggestionsDiv.style.color = '#c5c5c5'; // Light text color for contrast
    suggestionsDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.5)'; // Darker shadow
    suggestionsDiv.style.padding = '10px';
    suggestionsDiv.style.zIndex = '1000';
    suggestionsDiv.style.display = 'none'; // Initially hidden
    document.body.appendChild(suggestionsDiv);

    // Initialize with existing selected values
    const selectedValues = child.value || [];
    renderSelectedItems(selectedItemsDiv, selectedValues, child);

    // Setup event listeners
    setupPoolDropdownListeners(input, suggestionsDiv, selectedItemsDiv, selectedValues, child);

    // Helper functions
    function setupPoolDropdownListeners(input, suggestionsDiv, selectedItemsDiv, selectedValues, child) {
        // Show suggestions when input is focused
        input.addEventListener('focus', () => {
            updateSuggestions(input, suggestionsDiv, selectedItemsDiv, selectedValues, child);
            const rect = input.getBoundingClientRect();
            suggestionsDiv.style.top = `${rect.top + window.scrollY}px`;
            suggestionsDiv.style.left = `${rect.right + window.scrollX}px`; // Position to the right of the input
            suggestionsDiv.style.display = 'block';
        });

        // Update suggestions on input change
        input.addEventListener('input', () => updateSuggestions(input, suggestionsDiv, selectedItemsDiv, selectedValues, child));

        // Hide suggestions when clicking outside
        document.addEventListener('click', (event) => {
            if (!containerDiv.contains(event.target) && !suggestionsDiv.contains(event.target)) {
                suggestionsDiv.style.display = 'none';
            }
        });
    }

    function updateSuggestions(input, suggestionsDiv, selectedItemsDiv, selectedValues, child) {
        const query = input.value.toLowerCase();
        const tagsFilter = child.schema.items.const;
        const links = child.$links.filter(link => link.$tags.some(t => tagsFilter.includes(t)));
        console.log(links);
        const filteredLinks = links
            .filter(link => link.$label.toLowerCase().includes(query) && !selectedValues.includes(link.$id));
        console.log(filteredLinks);
        renderSuggestions(suggestionsDiv, filteredLinks, selectedItemsDiv, selectedValues, child);
    }

    function renderSuggestions(suggestionsDiv, filteredLinks, selectedItemsDiv, selectedValues, child) {
        suggestionsDiv.innerHTML = '';
        filteredLinks.forEach(link => {
            console.log(link);
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.style.cursor = 'pointer';
            suggestionItem.style.padding = '5px';
            suggestionItem.style.borderBottom = '1px solid #444'; // Divider between items
            suggestionItem.onmouseover = () => suggestionItem.style.backgroundColor = '#333'; // Hover effect
            suggestionItem.onmouseout = () => suggestionItem.style.backgroundColor = '#1e1e1e';

            // Create the label div
            const labelDiv = document.createElement('div');
            labelDiv.textContent = link.$label;
            labelDiv.style.fontWeight = 'bold';
            suggestionItem.appendChild(labelDiv);

            // Create the path div (Tree View)
            const pathDiv = document.createElement('div');
            pathDiv.style.marginTop = '5px';
            pathDiv.style.color = '#888';
            pathDiv.style.fontSize = 'smaller';
            renderPath(pathDiv, link.$path);
            suggestionItem.appendChild(pathDiv);

            // Handle click event
            suggestionItem.onclick = () => handleSuggestionClick(link, suggestionsDiv, selectedItemsDiv, selectedValues, child);

            // Append the suggestion item to the suggestions div
            suggestionsDiv.appendChild(suggestionItem);
        });
    }

    function renderPath(container, pathArray) {
        let root = document.createElement('div'); // Changed from const to let

        pathArray.forEach((segment, index) => {
            const segmentDiv = document.createElement('div');
            segmentDiv.textContent = segment;
            segmentDiv.style.marginLeft = `${index * 10}px`; // Indent for sub-levels
            segmentDiv.style.cursor = 'pointer';

            // Add a toggle functionality for collapsible nodes
            if (index < pathArray.length - 1) { // Only add collapse functionality to non-leaf nodes
                const toggleButton = document.createElement('span');
                toggleButton.textContent = '▸'; // Right-pointing arrow
                toggleButton.style.marginRight = '5px';
                toggleButton.style.color = '#ccc';
                toggleButton.style.cursor = 'pointer';

                // Child container to hold nested items
                const childContainer = document.createElement('div');
                childContainer.style.display = 'none'; // Hidden by default

                // On click, toggle the visibility of the child container
                toggleButton.onclick = () => {
                    const isCollapsed = childContainer.style.display === 'none';
                    childContainer.style.display = isCollapsed ? 'block' : 'none';
                    toggleButton.textContent = isCollapsed ? '▾' : '▸'; // Change arrow direction
                };

                segmentDiv.prepend(toggleButton);
                root.appendChild(segmentDiv);
                root.appendChild(childContainer);
                root = childContainer; // Reassign root to childContainer for nesting
            } else {
                root.appendChild(segmentDiv);
            }
        });

        container.appendChild(root);
    }


    function handleSuggestionClick(link, suggestionsDiv, selectedItemsDiv, selectedValues, child) {
        selectedValues.push(link.$id);
        renderSelectedItems(selectedItemsDiv, selectedValues, child);
        suggestionsDiv.style.display = 'none';
    }

    function renderSelectedItems(selectedItemsDiv, selectedValues, child) {
        selectedItemsDiv.innerHTML = '';
        selectedValues.forEach((id, index) => {
            const link = child.$links.find(link => link.$id === id);
            if (link) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'selected-item';

                const itemLabel = document.createElement('span');
                itemLabel.textContent = link.$label;
                itemLabel.style.color = '#c5c5c5'; // Light text color
                itemDiv.appendChild(itemLabel);

                const removeButton = document.createElement('button');
                removeButton.textContent = 'X';
                removeButton.className = 'remove-button';
                removeButton.style.marginLeft = '5px';
                removeButton.style.backgroundColor = '#444'; // Darker button
                removeButton.style.color = '#c5c5c5'; // Light text color
                removeButton.onclick = () => handleRemoveSelectedItem(index, selectedValues, selectedItemsDiv, child);
                itemDiv.appendChild(removeButton);

                selectedItemsDiv.appendChild(itemDiv);
            }
        });

        updateChildValues(child, selectedValues);
    }

    function handleRemoveSelectedItem(index, selectedValues, selectedItemsDiv, child) {
        selectedValues.splice(index, 1);
        renderSelectedItems(selectedItemsDiv, selectedValues, child);
    }

    function updateChildValues(child, selectedValues) {
        child.value = selectedValues;
        vscode.postMessage({ command: 'saveObject', item: child });
    }
}

function renderSubObjectChild(child, div, vscode, depth = 0) {
    // Create and style the container for the collapsible content
    const subObjectDiv = document.createElement('div');
    subObjectDiv.style.marginBottom = '5px'; // Spacing between sections
    subObjectDiv.style.border = '1px solid #444'; // Dark border
    subObjectDiv.style.borderRadius = '8px'; // Rounded corners
    subObjectDiv.style.backgroundColor = getColorForDepth(depth); // Dynamic background color based on depth
    subObjectDiv.style.overflow = 'hidden'; // Prevent content overflow
    div.appendChild(subObjectDiv);

    // Create and style the header for the collapsible section
    const headerDiv = document.createElement('div');
    headerDiv.style.display = 'flex';
    headerDiv.style.alignItems = 'center';
    headerDiv.style.padding = '8px'; // Padding for compact look
    headerDiv.style.cursor = 'pointer';
    headerDiv.style.userSelect = 'none'; // Prevent text selection
    headerDiv.style.backgroundColor = adjustColor(getColorForDepth(depth), -10); // Slightly darker background for header
    headerDiv.style.borderBottom = '1px solid #444'; // Border separating header and content
    subObjectDiv.appendChild(headerDiv);

    // Create and style the label
    const $label = document.createElement('h4');
    $label.textContent = child.$label;
    $label.style.margin = '0';
    $label.style.color = '#eee'; // Lighter text color
    headerDiv.appendChild($label);

    // Create and style the toggle button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = '▼'; // Default to "expanded" icon
    toggleButton.style.background = 'none';
    toggleButton.style.border = 'none';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.color = '#aaa'; // Lighter color for better contrast
    toggleButton.style.fontSize = '14px'; // Smaller font size
    toggleButton.style.marginLeft = '8px'; // Space between label and button
    headerDiv.appendChild(toggleButton);

    // Create and style the collapsible content container
    const contentDiv = document.createElement('div');
    contentDiv.style.display = 'none'; // Initially hidden
    contentDiv.style.padding = '8px'; // Padding for content area
    contentDiv.style.backgroundColor = adjustColor(getColorForDepth(depth), -20); // Darker background for nested content
    subObjectDiv.appendChild(contentDiv);

    // Add sub-children to the collapsible content
    child.hidden_children.forEach(subChild => {
        console.log(subChild);
        // Copy the $links of the parent to the child
        subChild.$links = child.$links;
        renderChild(subChild, contentDiv, vscode, depth + 1);
        // Copy subchild into child
        child.hidden_children.push(subChild);
    });

    // Toggle function for showing/hiding content
    headerDiv.addEventListener('click', () => {
        const isExpanded = contentDiv.style.display === 'block';
        contentDiv.style.display = isExpanded ? 'none' : 'block';
        toggleButton.textContent = isExpanded ? '▼' : '▲'; // Change icon
    });

    // Helper function to get color based on depth
    function getColorForDepth(depth) {
        // Base color for the deepest level
        const baseColor = '#222';
        const colorStep = Math.min(depth * 15, 60); // Adjust the color gradient step based on depth
        return shadeColor(baseColor, colorStep);
    }

    // Helper function to adjust color brightness
    function shadeColor(color, percent) {
        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);

        R = Math.min(255, Math.max(0, R + (R * percent / 100)));
        G = Math.min(255, Math.max(0, G + (G * percent / 100)));
        B = Math.min(255, Math.max(0, B + (B * percent / 100)));

        return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
    }

    // Helper function to adjust color brightness by a fixed amount
    function adjustColor(color, amount) {
        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);

        R = Math.min(255, Math.max(0, R + amount));
        G = Math.min(255, Math.max(0, G + amount));
        B = Math.min(255, Math.max(0, B + amount));

        return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
    }
}

function createElement(item, vscode) {
    vscode.postMessage({ command: 'createItem', item: item });
}

function removeElement(item, vscode) {
    vscode.postMessage({ command: 'removeItem', item: item });
}
