document.addEventListener('DOMContentLoaded', () => {
    const vscode = acquireVsCodeApi();

    window.addEventListener('message', event => {
        //Compute the new message
        const message = event.data;

        //Check if command is correct
        if (message.command === 'editObject') {
            // Reset previous content
            document.body.innerHTML = '';

            const schema = message.schema;
            const rootJson = message.json;
            const jsonPath = message.jsonPath;
            const jsonFile = message.jsonFile;

            let itemJson = rootJson;

            for (const key of jsonPath) {
                if (itemJson[key] !== undefined) {
                    itemJson = itemJson[key];
                }
            }

            // Async function to handle fetching and populating the select options
            async function simpleSearchItem(key, formGroup, properties, initialVal) {
                const { query, readonly } = properties;

                //Create master container
                const masterContainer = document.createElement('div');
                masterContainer.className = 'master-container';
                formGroup.appendChild(masterContainer);

                //Create a div to hold the search input and button
                const searchContainer = document.createElement('div');
                searchContainer.style.display = 'flex';
                searchContainer.style.alignItems = 'center';
                searchContainer.style.flexWrap = 'wrap';
                searchContainer.className = 'search-container';
                masterContainer.appendChild(searchContainer);

                //Create a button icon
                const buttonIcon = document.createElement('vscode-icon');
                buttonIcon.name = 'search';
                buttonIcon.style.marginLeft = '5px';
                buttonIcon.addEventListener('click', (e) => {
                    //Make the tree container visible
                    treeContainer.style.display = 'block';
                    // Prevent the click event from bubbling up to the document
                    e.stopPropagation();
                });
                buttonIcon.actionIcon = true;

                //Create a div to hold the selected item
                const selectedItemContainer = document.createElement('div');
                selectedItemContainer.addEventListener('tree-updated', (e) => {
                    console.log('Tree updated with value:', e);

                    //Find the vscode-textfield in the selected item container
                    const textField = selectedItemContainer.querySelector('vscode-textfield');

                    //Clear the text field
                    textField.value = '';

                    //Hide it
                    textField.style.display = 'none';

                    // Assuming e.detail.value.icon is the icon class name, such as 'codicon codicon-folder'
                    const iconClass = e.detail.value.icons.leaf;

                    //Find the vscode-badge in the selected item container
                    const badge = selectedItemContainer.querySelector('vscode-badge');

                    //Find the vscode-badge in the selected item container
                    const icon = badge.querySelector('span');
                    icon.className = 'codicon codicon-' + iconClass;
                    //Get the tetx node
                    const textNode = badge.querySelector('.text-node');
                    textNode.textContent = e.detail.value.label;

                    // Show the badge
                    badge.style.display = 'inline-block';
                });

                //This div can either contain a vscode-textfield or a vscode-badge
                const selectedItem = document.createElement('vscode-textfield');
                selectedItem.textContent = key;
                selectedItem.style.userSelect = 'none'; // Disable text selection on this item
                selectedItem.style.display = 'inline-block';
                //Add on input event listener
                selectedItem.oninput = (e) => {
                    console.log(e.target.value);
                };
                selectedItemContainer.appendChild(selectedItem);

                //Create the badge element
                const selectedBadge = document.createElement('vscode-badge');
                selectedBadge.textContent = "";
                selectedBadge.style.display = 'none';

                // Create a span element to hold the icon
                const iconSpan = document.createElement('span');
                iconSpan.className = 'codicon codicon-';
                selectedBadge.appendChild(iconSpan);
                // Set the new label as the text content
                const textContent = document.createElement('span');
                textContent.className = "text-node";
                selectedBadge.appendChild(textContent);

                // Create a simple icon button to remove the item
                const removeButton = document.createElement('vscode-icon');
                removeButton.name = 'close';
                removeButton.onclick = (e) => {
                    //Hide the badge
                    selectedBadge.style.display = 'none';
                    //Clear the text field
                    selectedItem.value = '';
                    //Show the text field
                    selectedItem.style.display = 'inline-block';
                };
                removeButton.actionIcon = true;
                selectedBadge.appendChild(removeButton);

                selectedItemContainer.appendChild(selectedBadge);

                searchContainer.appendChild(selectedItemContainer);
                searchContainer.appendChild(buttonIcon);

                //Create a div to hold the tree and select
                const treeContainer = document.createElement('div');
                treeContainer.className = 'tree-container';
                treeContainer.style.display = 'none';
                const tree = document.createElement('vscode-tree');
                tree.data = fetchOptionsFromSearch(query, initialVal);

                tree.addEventListener('dblclick', (event) => {
                    //Make the tree container invisible
                    treeContainer.style.display = 'none';
                    // Set the value of the selectedItemContainer
                    const changeEvent = new CustomEvent('tree-updated', {
                        detail: {
                            value: tree._selectedItem,
                        },
                    });

                    // Dispatch the custom event into the select element
                    selectedItemContainer.dispatchEvent(changeEvent);
                });
                treeContainer.appendChild(tree);
                masterContainer.appendChild(treeContainer);

                if (initialVal !== "" && initialVal.startsWith("${id")) {
                    //Find the vscode-badge in the selected item container
                    iconSpan.className = 'codicon codicon-';
                    //Get the tetx node
                    textContent.textContent = initialVal;
                    console.log(textContent);
                    selectedBadge.style.display = 'inline-block';
                    selectedItem.style.display = 'none';
                } else if (initialVal !== "" && !initialVal.startsWith("${id")) {
                    selectedItem.value = initialVal;
                }
            }

            function fetchOptionsFromSearch(query, initialValue) {
                const icons = {
                    branch: 'folder',
                    leaf: 'file',
                    open: 'folder-opened',
                };
                const data = [
                    {
                        icons,
                        label: 'node_modules',
                        value: 'black hole',
                        subItems: [
                            {
                                icons: { ...icons, branch: 'account', leaf: 'account', open: 'account' },
                                label: '.bin',
                                guid: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
                                subItems: [
                                    { icons, label: '_mocha_', icon: 'folder' },
                                    { icons, label: '_mocha.cmd_', icon: 'account', guid: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' },
                                    { icons, label: '_mocha.ps1_' },
                                    { icons, label: 'acorn' },
                                    { icons, label: 'acorn.cmd' },
                                    { icons, label: 'acorn.ps1' },
                                ],
                            },
                            {
                                icons,
                                label: '@11ty',
                                open: true,
                                subItems: [
                                    { icons, label: 'lorem.js' },
                                    { icons, label: 'ipsum.js' },
                                    { icons, label: 'dolor.js' },
                                ],
                            },
                            { icons, label: '.DS_Store' },
                        ],
                    },
                    {
                        icons,
                        label: 'scripts',
                        subItems: [
                            { icons, label: 'build.js' },
                            { icons, label: 'start.js' },
                        ],
                    },
                    { icons, label: '.editorconfig', selected: true },
                    { icons, label: '2021-01-18T22_10_20_535Z-debug.log' },
                ];

                let json = rootJson;
                const mySet = new Set();
                const rootPath = [[], [json["label"]], [], []];

                // Helper function to check if an option matches the query
                function matchesQuery(option, query) {
                    return query.every(andConditions => {
                        return andConditions.some(orCondition => {
                            const field = orCondition.field;
                            const regex = new RegExp(orCondition.regex);
                            return option[field] && regex.test(option[field]);
                        });
                    });
                }

                function decodeTreeOptions(query, json, initialValue, path, isArr) {
                    for (const key in json) {
                        const newPath = [[...path[0], key], [...path[1]], [...path[2], json["id"]], [...path[3], json["icon"]]]
                        if (typeof json[key] === 'object') {
                            if(isArr)
                            {
                                newPath[1].push(json[key].label);
                            }
                            else
                                newPath[1].push(key);
                            decodeTreeOptions(query, json[key], initialValue, newPath, Array.isArray(json[key]));
                        } else if (typeof json === 'object') {
                            if (matchesQuery(json, query)) {
                                json.path = newPath;
                                mySet.add(json);
                            }
                        }
                    }
                }

                decodeTreeOptions(query, json, initialValue, rootPath, false);

                for(const item of mySet)
                {
                    let tree = {};

                    const fullpath = [];
                    for(const [index, value] of item.path[2].entries())
                    {
                        if(value)
                        {
                            const dict = {
                                icons: {
                                    branch: item.path[3][index],
                                    leaf: item.path[3][index],
                                    open: item.path[3][index]
                                },
                                label: item.path[1][index],
                                id: item.path[2][index],
                                subItems: []

                            }

                            if (Object.keys(tree).length === 0)
                            {
                                tree = dict;
                            } else {
                                let temp = tree;
                                for (const p in fullpath){
                                    console.error(temp.subItems);
                                    for (const [index, subitem] in temp.subItems.entries())
                                    {
                                        console.log('Subitem: ', subitem, p);
                                        if(subitem.label === p)
                                        {
                                            temp = temp.subItems[index];
                                            break;
                                        }
                                    }
                                }
                                console.log(temp);
                                console.log(fullpath);
                                temp.subItems.push(dict);
                            }
                            let current = tree;

                            //for (let i = 0; i < fullpath.length - 1; i++) 
                            //{
                            //    const key = fullpath[i];
                            //    current=current[key];
                            //}
                            //console.warn(item.path[1][index], current);
                            //current[item.path[1][index]] = dict;
                            fullpath.push(item.path[1][index]);
                        }
                    }
                    console.warn(tree);
                }

                return data;
            }

            //Create function to iterate over schema and create a form.
            const createForm = (schema, jsonItem) => {
                const form = document.createElement('div');

                // Create the header element
                const header = document.createElement('h1'); // You can use 'h1', 'h2', etc., or 'div' with a class
                header.textContent = jsonItem["label"].toUpperCase();
                form.append(header); // Append the header first

                const properties = schema.properties;

                function decodeProperty(properties, parent, schema, json) {
                    for (const key in properties) {
                        const initialValue = json[key];
                        if (!properties[key].editable === true)
                            continue;
                        // Create a badge and set its label
                        const badge = document.createElement('vscode-label');
                        badge.textContent = key;
                        parent.appendChild(badge);

                        // Create a container for the property
                        const formGroup = document.createElement('vscode-form-group');
                        formGroup.style.margin = "5px";
                        const type = properties[key].type;
                        if (type === 'string') {
                            if (!properties[key].enum && !properties[key].search) {
                                if (properties[key].multiline) {
                                    // Create a container to hold the textarea and other elements
                                    const textareaContainer = document.createElement('div');
                                    textareaContainer.style.position = 'relative';

                                    // Check if markdown is enabled
                                    const textarea = document.createElement('vscode-textarea');
                                    textarea.name = key;
                                    textarea.value = initialValue;
                                    // Make minimum height of 10em
                                    textarea.style.minHeight = '10em';
                                    textarea.oninput = (e) => {
                                        console.log(e.target.value);
                                    };
                                    textarea.disabled = properties[key].readonly ? true : false;

                                    // Create a toolbar container at the top of the textarea
                                    const toolbarContainer = document.createElement('div');
                                    toolbarContainer.style.display = 'flex';
                                    toolbarContainer.style.justifyContent = 'flex-start';
                                    toolbarContainer.style.alignItems = 'center';
                                    toolbarContainer.style.marginBottom = '0.5em'; // Add some space below the toolbar

                                    if (properties[key].markdown) {
                                        // Create a div to hold the markdown text
                                        const markdownContainer = document.createElement('div');
                                        markdownContainer.id = 'markdown-container';
                                        // Hide it initially
                                        markdownContainer.style.display = 'none';

                                        // Create a preview button
                                        const buttonPreview = document.createElement('vscode-icon');
                                        buttonPreview.name = 'eye';
                                        buttonPreview.onclick = (e) => {
                                            // Toggle the markdown and HTML content
                                            if (textarea.style.display === 'none') {
                                                textarea.style.display = 'block';
                                                markdownContainer.style.display = 'none';
                                            } else {
                                                // Parse the markdown content
                                                const markdown = textarea.value;
                                                console.log(textarea.textContent);
                                                const html = marked.parse(markdown);
                                                console.log(html);
                                                markdownContainer.innerHTML = html;
                                                textarea.style.display = 'none';
                                                markdownContainer.style.display = 'block';
                                            }
                                        };
                                        buttonPreview.actionIcon = true;

                                        // Add the buttons to the toolbar
                                        toolbarContainer.appendChild(buttonPreview);

                                        // Add the toolbar and textarea to the container
                                        textareaContainer.appendChild(toolbarContainer);
                                        textareaContainer.appendChild(textarea);
                                        textareaContainer.appendChild(markdownContainer);

                                        markdownContainer.style.fontSize = '10px'; // Set the font size to a smaller value
                                    } else {
                                        // If markdown is not enabled, just add the textarea
                                        textareaContainer.appendChild(toolbarContainer);
                                        textareaContainer.appendChild(textarea);
                                    }

                                    // Finally, append the textareaContainer to the formGroup
                                    formGroup.appendChild(textareaContainer);
                                } else {
                                    const input = document.createElement('vscode-textfield');
                                    input.name = key;
                                    input.value = initialValue;
                                    input.oninput = (e) => {
                                        console.log(e.target.value);
                                    };
                                    input.disabled = properties[key].readonly ? true : false;
                                    input.type = properties[key].file ? 'file' : 'text';
                                    formGroup.appendChild(input);
                                }
                            } else if (properties[key].enum && properties[key].enum.length > 0) {
                                const select = document.createElement('vscode-single-select');
                                select.name = key;
                                select.value = initialValue;;
                                select.disabled = properties[key].readonly ? true : false;
                                select.onchange = (e) => {
                                    console.log(e.target.value);
                                };
                                properties[key].enum.forEach((item) => {
                                    const option = document.createElement('vscode-option');
                                    option.value = item;
                                    option.textContent = item; // Use textContent for option text
                                    select.appendChild(option);
                                });
                                formGroup.appendChild(select);
                            } else if (properties[key].search) {
                                simpleSearchItem(key, formGroup, properties[key].search, initialValue);
                            }
                        } else if (type === 'boolean') {
                            const checkbox = document.createElement('vscode-checkbox');
                            checkbox.name = key;
                            checkbox.checked = initialValue;
                            checkbox.onchange = (e) => {
                                console.log(e.target.checked);
                            };
                            checkbox.disabled = properties[key].readonly ? true : false;
                            formGroup.appendChild(checkbox);
                        } else if (type === 'array') {
                            const items = properties[key].items;
                            if (items.type === 'string') {
                                if (!items.enum && !items.search) {
                                    //Create a div to hold the array of textfields
                                    const arrayContainer = document.createElement('div');
                                    arrayContainer.className = 'array-container';
                                    arrayContainer.style.display = 'flex';
                                    arrayContainer.style.alignItems = 'center';
                                    arrayContainer.style.flexWrap = 'wrap';
                                    formGroup.appendChild(arrayContainer);

                                    // Function to handle drag and drop
                                    function handleDragStart(e) {
                                        e.dataTransfer.setData('text/plain', e.target.id);
                                    }

                                    function handleDragOver(e) {
                                        e.preventDefault();  // Necessary to allow a drop
                                        e.dataTransfer.dropEffect = 'move';  // Set the desired drop effect
                                    }

                                    function handleDragEnter(e) {
                                        e.preventDefault();
                                        const target = e.target.closest('.array-item');
                                        const container = e.target.closest('.array-container');
                                        if (target && container && target.parentNode === container) {
                                            target.classList.add('drop-highlight');
                                        }
                                    }

                                    function handleDragLeave(e) {
                                        const target = e.target.closest('.array-item');
                                        if (target) {
                                            target.classList.remove('drop-highlight');
                                        }
                                    }

                                    function handleDrop(e) {
                                        e.preventDefault();
                                        const id = e.dataTransfer.getData('text');
                                        const draggableElement = document.getElementById(id);
                                        const dropzone = e.target.closest('.array-item');

                                        if (dropzone && draggableElement !== dropzone && draggableElement.parentNode === dropzone.parentNode) {
                                            // Get bounding box of the drop zone
                                            const bounding = dropzone.getBoundingClientRect();
                                            const offset = e.clientY - bounding.top;
                                            const middle = bounding.height / 2;

                                            if (offset > middle) {
                                                // Drop in the lower half (after the dropzone)
                                                dropzone.parentNode.insertBefore(draggableElement, dropzone.nextSibling);
                                            } else {
                                                // Drop in the upper half (before the dropzone)
                                                dropzone.parentNode.insertBefore(draggableElement, dropzone);
                                            }

                                            // Optionally, you can add logic to remove the highlight
                                            dropzone.classList.remove('drop-highlight');
                                        }
                                    }

                                    function createItem(container, value) {
                                        const input = document.createElement('vscode-textfield');
                                        //Set width to fit 3 letters
                                        input.style.width = 'auto';
                                        input.className = 'array-item';
                                        input.value = value;
                                        input.autocomplete = 'off';
                                        input.id = 'input-' + Date.now();  // Unique ID for each input
                                        input.setAttribute('draggable', 'true');
                                        if (value !== "") {
                                            input.style.width = value.length + 6 + 'ch';
                                        }

                                        // Event listeners for drag and drop
                                        input.addEventListener('dragstart', handleDragStart);
                                        input.addEventListener('dragover', handleDragOver);
                                        input.addEventListener('dragenter', handleDragEnter);
                                        input.addEventListener('dragleave', handleDragLeave);
                                        input.addEventListener('drop', handleDrop);

                                        input.style.marginRight = '5px'; // Add margin right
                                        input.style.marginBottom = '5px'; // Add margin bottom
                                        input.onchange = (e) => {
                                            //Resize it to current content
                                            input.style.width = input.value.length + 6 + 'ch';
                                        };
                                        input.oninput = (e) => {
                                            //Resize it to fit the content
                                            console.log(e.target.value);
                                        };
                                        // Create a close icon
                                        const closeIcon = document.createElement('vscode-icon');
                                        closeIcon.name = 'close';
                                        closeIcon.onclick = (e) => {
                                            console.log('Close icon clicked');
                                            //Remove the input
                                            container.removeChild(input);
                                        };
                                        closeIcon.actionIcon = true;
                                        closeIcon.slot = 'content-after';

                                        // Append the slot to the input
                                        input.appendChild(closeIcon);

                                        // Append the input to the array container
                                        container.appendChild(input);
                                    }

                                    for (const value of initialValue) {
                                        createItem(arrayContainer, value);
                                    }

                                    const addButton = document.createElement('vscode-icon');
                                    addButton.name = 'add';
                                    addButton.actionIcon = true;
                                    addButton.onclick = (e) => {
                                        console.log('Add button clicked');
                                        createItem(arrayContainer, "");
                                    };

                                    formGroup.appendChild(addButton);
                                } else if (items.enum && items.enum.length > 0) {
                                    const select = document.createElement('vscode-multi-select');
                                    select.name = key;
                                    select.value = initialValue;
                                    select.disabled = properties[key].readonly ? true : false;
                                    select.onchange = (e) => {
                                        console.log(e.target.value);
                                    };
                                    select.oninput = (e) => {
                                        console.log(e.target.value);
                                    };
                                    items.enum.forEach((item) => {
                                        const option = document.createElement('vscode-option');
                                        option.value = item;
                                        option.textContent = item; // Use textContent for option text
                                        select.appendChild(option);
                                    });
                                    formGroup.appendChild(select);
                                } else if (items.search) {
                                    const query = items.search.query;

                                    // Create a main div to hold button and select
                                    const mainContainer = document.createElement('div');
                                    mainContainer.className = 'main-container';
                                    formGroup.appendChild(mainContainer);

                                    // Create a div to hold the array of textfields
                                    const arrayContainer = document.createElement('div');
                                    arrayContainer.className = 'array-container';
                                    arrayContainer.style.display = 'flex';
                                    arrayContainer.style.alignItems = 'center';
                                    arrayContainer.style.flexWrap = 'wrap';
                                    mainContainer.appendChild(arrayContainer);

                                    // Function to handle drag and drop
                                    // Function to handle drag and drop
                                    function handleDragStart(e) {
                                        e.dataTransfer.setData('text/plain', e.target.id);
                                    }

                                    function handleDragOver(e) {
                                        e.preventDefault();  // Necessary to allow a drop
                                        e.dataTransfer.dropEffect = 'move';  // Set the desired drop effect
                                    }

                                    function handleDragEnter(e) {
                                        e.preventDefault();
                                        const target = e.target.closest('.array-item');
                                        const container = e.target.closest('.array-container');
                                        if (target && container && target.parentNode === container) {
                                            target.classList.add('drop-highlight');
                                        }
                                    }

                                    function handleDragLeave(e) {
                                        const target = e.target.closest('.array-item');
                                        if (target) {
                                            target.classList.remove('drop-highlight');
                                        }
                                    }

                                    function handleDrop(e) {
                                        e.preventDefault();
                                        const id = e.dataTransfer.getData('text');
                                        const draggableElement = document.getElementById(id);
                                        const dropzone = e.target.closest('.array-item');

                                        if (dropzone && draggableElement !== dropzone && draggableElement.parentNode === dropzone.parentNode) {
                                            // Get bounding box of the drop zone
                                            const bounding = dropzone.getBoundingClientRect();
                                            const offset = e.clientY - bounding.top;
                                            const middle = bounding.height / 2;

                                            if (offset > middle) {
                                                // Drop in the lower half (after the dropzone)
                                                dropzone.parentNode.insertBefore(draggableElement, dropzone.nextSibling);
                                            } else {
                                                // Drop in the upper half (before the dropzone)
                                                dropzone.parentNode.insertBefore(draggableElement, dropzone);
                                            }

                                            // Optionally, you can add logic to remove the highlight
                                            dropzone.classList.remove('drop-highlight');
                                        }
                                    }

                                    function createText(container, value) {
                                        const input = document.createElement('vscode-textfield');
                                        input.style.width = 'auto';
                                        input.style.marginRight = '5px';
                                        input.style.marginBottom = '5px';
                                        input.value = value;
                                        input.autocomplete = 'off';
                                        input.id = 'input-' + Date.now();  // Unique ID for each input
                                        if (value !== "") {
                                            input.style.width = value.length + 6 + 'ch';
                                        }

                                        input.setAttribute('draggable', 'true');
                                        input.className = 'array-item';

                                        // Event listeners for drag and drop
                                        input.addEventListener('dragstart', handleDragStart);
                                        input.addEventListener('dragover', handleDragOver);
                                        input.addEventListener('dragenter', handleDragEnter);
                                        input.addEventListener('dragleave', handleDragLeave);
                                        input.addEventListener('drop', handleDrop);

                                        input.onchange = (e) => {
                                            input.style.width = input.value.length + 6 + 'ch';
                                        };

                                        const closeIcon = document.createElement('vscode-icon');
                                        closeIcon.name = 'close';
                                        closeIcon.onclick = (e) => {
                                            console.log('Close icon clicked');
                                            container.removeChild(input);
                                        };
                                        closeIcon.actionIcon = true;
                                        closeIcon.slot = 'content-after';

                                        input.appendChild(closeIcon);
                                        container.appendChild(input);
                                    }

                                    // Function to create draggable badge
                                    function createBadge(item) {
                                        const badge = document.createElement('vscode-badge');
                                        badge.style.marginRight = '5px';
                                        badge.style.marginBottom = '5px';
                                        badge.className = 'array-item';
                                        badge.setAttribute('draggable', 'true');
                                        badge.id = 'badge-' + Date.now();  // Unique ID for each draggable item

                                        // Event listeners for drag and drop
                                        badge.addEventListener('dragstart', handleDragStart);
                                        badge.addEventListener('dragover', handleDragOver);
                                        badge.addEventListener('dragenter', handleDragEnter);
                                        badge.addEventListener('dragleave', handleDragLeave);
                                        badge.addEventListener('drop', handleDrop);

                                        const iconSpan = document.createElement('span');
                                        iconSpan.className = 'codicon codicon-' + item.icons.leaf;
                                        iconSpan.style.inherit = 'inherit';

                                        const textContent = document.createTextNode(item.label);
                                        badge.appendChild(iconSpan);
                                        badge.appendChild(textContent);

                                        const removeButton = document.createElement('vscode-icon');
                                        removeButton.name = 'close';
                                        removeButton.onclick = (e) => {
                                            console.log('Remove button clicked');
                                            arrayContainer.removeChild(badge);
                                        };
                                        removeButton.actionIcon = true;
                                        badge.appendChild(removeButton);

                                        arrayContainer.appendChild(badge);
                                    }

                                    // Listen for tree-updated event to create badges
                                    arrayContainer.addEventListener('tree-updated', (e) => {
                                        console.log('Tree updated with value:', e);
                                        createBadge(e.detail.value);
                                    });

                                    // Create a div to hold a single select and a button
                                    const singleSelectContainer = document.createElement('div');
                                    singleSelectContainer.className = 'single-select-container';
                                    singleSelectContainer.style.display = 'flex';
                                    singleSelectContainer.style.alignItems = 'center';
                                    singleSelectContainer.style.flexWrap = 'wrap';
                                    mainContainer.appendChild(singleSelectContainer);

                                    // Create a select element
                                    const select = document.createElement('vscode-single-select');
                                    select.name = key;
                                    select.style.width = "Search".length + 6 + 'ch';
                                    select.disabled = properties[key].readonly ? true : false;
                                    const option1 = document.createElement('vscode-option');
                                    option1.value = 'Text';
                                    option1.textContent = 'Text';
                                    select.appendChild(option1);
                                    const option2 = document.createElement('vscode-option');
                                    option2.value = 'Search';
                                    option2.textContent = 'Search';
                                    select.appendChild(option2);

                                    // Create a button element
                                    const addButton = document.createElement('vscode-icon');
                                    addButton.name = 'add';
                                    addButton.actionIcon = true;
                                    addButton.onclick = (e) => {
                                        const value = select.value;
                                        console.log(value);
                                        if (value === 'Text') {
                                            createText(arrayContainer, "");
                                        } else {
                                            treeContainer.style.display = 'block';
                                        }
                                    };
                                    singleSelectContainer.appendChild(addButton);
                                    singleSelectContainer.appendChild(select);

                                    for (const value of initialValue) {
                                        console.log(value);
                                        if (value.startsWith("${id")) {

                                        } else {
                                            createText(arrayContainer, value);
                                        }
                                    }

                                    // Create a div to hold the tree and select
                                    const treeContainer = document.createElement('div');
                                    treeContainer.className = 'tree-container';
                                    treeContainer.style.display = 'none';
                                    const tree = document.createElement('vscode-tree');
                                    tree.data = fetchOptionsFromSearch(query, initialValue);

                                    tree.addEventListener('dblclick', (event) => {
                                        treeContainer.style.display = 'none';
                                        const changeEvent = new CustomEvent('tree-updated', {
                                            detail: {
                                                value: tree._selectedItem,
                                            },
                                        });
                                        arrayContainer.dispatchEvent(changeEvent);
                                    });

                                    treeContainer.appendChild(tree);
                                    formGroup.appendChild(treeContainer);
                                }
                            }
                        } else if (type === 'object') {
                            //Create a collpasible item
                            const collabsibleItem = document.createElement('vscode-collapsible');
                            collabsibleItem.title = key;
                            form.removeChild(badge);
                            formGroup.appendChild(collabsibleItem);
                            //Decode the sub object
                            decodeProperty(schema.properties[key].properties, collabsibleItem, schema.properties[key], json[key]);
                        }

                        // Append formGroup to form
                        parent.appendChild(formGroup);
                    }
                }

                decodeProperty(properties, form, schema, jsonItem);

                return form;
            }
            const form = createForm(schema, itemJson);

            document.body.appendChild(form);

            console.log('Media module loaded');
        }
        else {
            console.error('Command not implemented yet');
        }
    });
});
