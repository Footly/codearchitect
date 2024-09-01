document.addEventListener('DOMContentLoaded', () => {
    const schema = {
        name: 'Media',
        properties: {
            id: { type: 'string', icon: 'key', readonly: true },
            path: { type: 'string', file: '.pdf', hidden: true },
            flag: { type: 'string', icon: 'lock' },
            title: { type: 'string', enum: ['Mr', 'Mrs', 'Ms', 'Dr'] },
            description: { type: 'string', multiline: true, tag: 'variable', markdown: true },
            active: { type: 'boolean' },
            tags: { type: 'array', items: { type: 'string' } },
            category: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['Action', 'Adventure', 'Comedy', 'Drama', 'Horror', 'Mystery', 'Romance', 'Thriller'],
                },
            },
            search: {
                type: 'string',
                search: {
                    multiple: true,
                    editable: true,
                    query: [
                        [
                            { field: 'tag', regex: "cha.*" }, // OR condition within the sub-array
                            { field: 'tag', regex: "bro.*" }
                        ],
                        [
                            { field: 'name', regex: "Brocollu" } // AND condition (this sub-array indicates an AND condition)
                        ]
                    ]
                }
            },
            search2: {
                type: 'array',
                items: {
                    type: 'string',
                    search: {
                        editable: true,
                        query: [
                            [
                                { field: 'tag', regex: "cha.*" }, // OR condition within the sub-array
                                { field: 'tag', regex: "bro.*" }
                            ],
                            [
                                { field: 'name', regex: "Brocollu" } // AND condition (this sub-array indicates an AND condition)
                            ]
                        ]
                    }
                }
            },
        },
    };

    //A list of 20 vgeetables
    const vegetables = [
        {
            "name": "Carrot",
            "color": "Orange",
            "type": "Root",
            "tag": ["cha", "bro"]
        },
        {
            "name": "Broccoli",
            "color": "Green",
            "type": "Stem",
            "tag": ["bro"]
        },
        {
            "name": "Cabbage",
            "color": "Green",
            "type": "Leafy",
            "tag": ["cha"]
        },
        {
            "name": "Spinach",
            "color": "Green",
            "type": "Leafy",
            "tag": ["cha"]
        },
        {
            "name": "Lettuce",
            "color": "Green",
            "type": "Leafy",
            "tag": ["cha"]
        },
        {
            "name": "Tomato",
            "color": "Red",
            "type": "Fruit",
            "tag": ["bro"]
        },
        {
            "name": "Cucumber",
            "color": "Green",
            "type": "Fruit",
            "tag": ["bro"]
        },
        {
            "name": "Potato",
            "color": "Brown",
            "type": "Root",
            "tag": ["cha"]
        },
        {
            "name": "Onion",
            "color": "White",
            "type": "Bulb",
            "tag": ["cha"]
        },
        {
            "name": "Garlic",
            "color": "White",
            "type": "Bulb",
            "tag": ["cha"]
        },
        {
            "name": "Bell Pepper",
            "color": "Red",
            "type": "Fruit",
            "tag": ["bro"]
        },
        {
            "name": "Eggplant",
            "color": "Purple",
            "type": "Fruit",
            "tag": ["bro"]
        },
        {
            "name": "Zucchini",
            "color": "Green",
            "type": "Fruit",
            "tag": ["bro"]
        },
        {
            "name": "Pumpkin",
            "color": "Orange",
            "type": "Fruit",
            "tag": ["bro"]
        },
        {
            "name": "Radish",
            "color": "Red",
            "type": "Root",
            "tag": ["cha"]
        },
        {
            "name": "Beetroot",
            "color": "Red",
            "type": "Root",
            "tag": ["cha"]
        },
        {
            "name": "Celery",
            "color": "Green",
            "type": "Stalk",
            "tag": ["bro"]
        },
        {
            "name": "Cauliflower",
            "color": "White",
            "type": "Flower",
            "tag": ["bro"]
        },
        {
            "name": "Mushroom",
            "color": "White",
            "type": "Fungus",
            "tag": ["bro"]
        },
        {
            "name": "Asparagus",
            "color": "Green",
            "type": "Stalk",
            "tag": ["bro"]
        }
    ];

    // Async function to handle fetching and populating the select options
    async function simpleSearchItem(key, formGroup, properties) {
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
        buttonIcon.style.marginRight = '5px';
        buttonIcon.addEventListener('click', (e) => {
            //Make the tree container visible
            treeContainer.style.display = 'block';
            // Prevent the click event from bubbling up to the document
            e.stopPropagation();
        });

        searchContainer.appendChild(buttonIcon);

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

            // Create a span element to hold the icon
            const iconSpan = document.createElement('span');
            iconSpan.className = 'codicon codicon-' + iconClass;

            // Clear the current content of select element
            badge.textContent = '';

            // Append the icon span to the select element
            badge.appendChild(iconSpan);

            // Set the new label as the text content
            const textContent = document.createTextNode(e.detail.value.label);
            badge.appendChild(textContent);

            // Create a simple icon button to remove the item
            const removeButton = document.createElement('vscode-icon');
            removeButton.name = 'close';
            removeButton.onclick = (e) => {
                //Hide the badge
                badge.style.display = 'none';
                //Clear the text field
                textField.value = '';
                //Show the text field
                textField.style.display = 'inline-block';
                console.warn(textField);
            };
            removeButton.actionIcon = true;
            badge.appendChild(removeButton);

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
        selectedBadge.textContent = key;
        selectedBadge.style.display = 'none';
        selectedItemContainer.appendChild(selectedBadge);

        searchContainer.appendChild(selectedItemContainer);

        //Create a div to hold the tree and select
        const treeContainer = document.createElement('div');
        treeContainer.className = 'tree-container';
        treeContainer.style.display = 'none';
        const tree = document.createElement('vscode-tree');

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

        try {
            // Fetch options and populate the select element
            await fetchOptionsFromSearch(query, masterContainer);
        } catch (error) {
            console.error('Failed to fetch options:', error);
        }
    }

    async function fetchOptionsFromSearch(query, formGroup) {

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

        //
        //// Get the values from the dataset
        //const options = vegetables;
        //
        //// Iterate over vegetables and filter the options based on the query
        //const filteredOptions = options.filter((option) => {
        //    // Every sub-array in the query represents an AND condition
        //    return query.every((andConditions) => {
        //        // At least one of the OR conditions within each sub-array must be satisfied
        //        return andConditions.some((orCondition) => {
        //            const field = orCondition.field;
        //            const regex = new RegExp(orCondition.regex);
        //            return option[field] && regex.test(option[field]);
        //        });
        //    });
        //});

        //if (filteredOptions.length > 0) {
        //
        //    return filteredOptions.map((option) => option.name);
        //}

        //Search the treeContainer in FormGroup
        const treeContainer = formGroup.querySelector('.tree-container');

        //If the tree container is not found, return
        if (!treeContainer) {
            return;
        }

        //Get the tree element
        const tree = treeContainer.querySelector('vscode-tree');

        //Set the data to the tree
        tree.data = data;

        // Simulate an API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    async function fetchOptionsFromSearch(query, formGroup) {

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

        //
        //// Get the values from the dataset
        //const options = vegetables;
        //
        //// Iterate over vegetables and filter the options based on the query
        //const filteredOptions = options.filter((option) => {
        //    // Every sub-array in the query represents an AND condition
        //    return query.every((andConditions) => {
        //        // At least one of the OR conditions within each sub-array must be satisfied
        //        return andConditions.some((orCondition) => {
        //            const field = orCondition.field;
        //            const regex = new RegExp(orCondition.regex);
        //            return option[field] && regex.test(option[field]);
        //        });
        //    });
        //});

        //if (filteredOptions.length > 0) {
        //
        //    return filteredOptions.map((option) => option.name);
        //}

        //Search the treeContainer in FormGroup
        const treeContainer = formGroup.querySelector('.tree-container');

        //If the tree container is not found, return
        if (!treeContainer) {
            return;
        }

        //Get the tree element
        const tree = treeContainer.querySelector('vscode-tree');

        //Set the data to the tree
        tree.data = data;

        console.log('Fetching options from search:', query);

        // Simulate an API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    //Create function to iterate over schema and create a form.
    const createForm = (schema) => {
        const form = document.createElement('div');

        for (const key in schema.properties) {
            if (schema.properties[key].hidden) {
                continue;
            }

            // Create a badge and set its label
            const badge = document.createElement('vscode-label');
            badge.textContent = key;
            form.appendChild(badge);

            // Create a container for the property
            const formGroup = document.createElement('vscode-form-group');
            const type = schema.properties[key].type;
            if (type === 'string') {
                if (!schema.properties[key].enum && !schema.properties[key].search) {
                    if (schema.properties[key].multiline) {
                        // Create a container to hold the textarea and other elements
                        const textareaContainer = document.createElement('div');
                        textareaContainer.style.position = 'relative';

                        // Check if markdown is enabled
                        const textarea = document.createElement('vscode-textarea');
                        textarea.name = key;
                        // Make minimum height of 10em
                        textarea.style.minHeight = '10em';
                        textarea.oninput = (e) => {
                            console.log(e.target.value);
                        };
                        textarea.disabled = schema.properties[key].readonly ? true : false;

                        // Create a toolbar container at the top of the textarea
                        const toolbarContainer = document.createElement('div');
                        toolbarContainer.style.display = 'flex';
                        toolbarContainer.style.justifyContent = 'flex-start';
                        toolbarContainer.style.alignItems = 'center';
                        toolbarContainer.style.marginBottom = '0.5em'; // Add some space below the toolbar

                        if (schema.properties[key].markdown) {
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

                            markdownContainer.style.fontSize = '8px'; // Set the font size to a smaller value
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
                        input.oninput = (e) => {
                            console.log(e.target.value);
                        };
                        input.disabled = schema.properties[key].readonly ? true : false;
                        input.type = schema.properties[key].file ? 'file' : 'text';
                        formGroup.appendChild(input);
                    }
                } else if (schema.properties[key].enum && schema.properties[key].enum.length > 0) {
                    const select = document.createElement('vscode-single-select');
                    select.name = key;
                    select.disabled = schema.properties[key].readonly ? true : false;
                    select.onchange = (e) => {
                        console.log(e.target.value);
                    };
                    schema.properties[key].enum.forEach((item) => {
                        const option = document.createElement('vscode-option');
                        option.value = item;
                        option.textContent = item; // Use textContent for option text
                        select.appendChild(option);
                    });
                    formGroup.appendChild(select);
                } else if (schema.properties[key].search) {
                    simpleSearchItem(key, formGroup, schema.properties[key].search);
                }
            } else if (type === 'boolean') {
                const checkbox = document.createElement('vscode-checkbox');
                checkbox.name = key;
                checkbox.onchange = (e) => {
                    console.log(e.target.checked);
                };
                checkbox.disabled = schema.properties[key].readonly ? true : false;
                formGroup.appendChild(checkbox);
            } else if (type === 'array') {
                const items = schema.properties[key].items;
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

                        const addButton = document.createElement('vscode-icon');
                        addButton.name = 'add';
                        addButton.actionIcon = true;
                        addButton.onclick = (e) => {
                            console.log('Add button clicked');
                            const input = document.createElement('vscode-textfield');
                            //Set width to fit 3 letters
                            input.style.width = 'auto';
                            input.className = 'array-item';
                            input.autocomplete = 'off';
                            input.id = 'input-' + Date.now();  // Unique ID for each input
                            input.setAttribute('draggable', 'true');

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
                                input.style.width = input.value.length + 4 + 'ch';
                                console.warn(input.style.width);
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
                                arrayContainer.removeChild(input);
                            };
                            closeIcon.actionIcon = true;
                            closeIcon.slot = 'content-after';

                            // Append the slot to the input
                            input.appendChild(closeIcon);

                            // Append the input to the array container
                            arrayContainer.appendChild(input);
                        };

                        formGroup.appendChild(addButton);
                    } else if (items.enum && items.enum.length > 0) {
                        const select = document.createElement('vscode-multi-select');
                        select.name = key;
                        select.disabled = schema.properties[key].readonly ? true : false;
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
                        select.style.width = "Search".length + 3 + 'ch';
                        select.disabled = schema.properties[key].readonly ? true : false;
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
                                const input = document.createElement('vscode-textfield');
                                input.style.width = 'auto';
                                input.style.marginRight = '5px';
                                input.style.marginBottom = '5px';
                                input.autocomplete = 'off';
                                input.id = 'input-' + Date.now();  // Unique ID for each input

                                input.setAttribute('draggable', 'true');
                                input.className = 'array-item';

                                // Event listeners for drag and drop
                                input.addEventListener('dragstart', handleDragStart);
                                input.addEventListener('dragover', handleDragOver);
                                input.addEventListener('dragenter', handleDragEnter);
                                input.addEventListener('dragleave', handleDragLeave);
                                input.addEventListener('drop', handleDrop);

                                input.onchange = (e) => {
                                    input.style.width = input.value.length + 4 + 'ch';
                                };

                                const closeIcon = document.createElement('vscode-icon');
                                closeIcon.name = 'close';
                                closeIcon.onclick = (e) => {
                                    console.log('Close icon clicked');
                                    arrayContainer.removeChild(input);
                                };
                                closeIcon.actionIcon = true;
                                closeIcon.slot = 'content-after';

                                input.appendChild(closeIcon);
                                arrayContainer.appendChild(input);
                            } else {
                                treeContainer.style.display = 'block';
                            }
                        };
                        singleSelectContainer.appendChild(addButton);
                        singleSelectContainer.appendChild(select);

                        // Create a div to hold the tree and select
                        const treeContainer = document.createElement('div');
                        treeContainer.className = 'tree-container';
                        treeContainer.style.display = 'none';
                        const tree = document.createElement('vscode-tree');

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

                        try {
                            fetchOptionsFromSearch(query, formGroup);
                        } catch (error) {
                            console.error('Failed to fetch options:', error);
                        }
                    }
                }
            }

            const icon = schema.properties[key].icon;
            if (icon) {
                const iconElement = document.createElement('vscode-icon');
                iconElement.name = icon;
                formGroup.appendChild(iconElement);
            }

            // Append formGroup to form
            form.appendChild(formGroup);
        }
        return form;
    };

    const form = createForm(schema);

    document.body.appendChild(form);

    console.log('Media module loaded');
});
