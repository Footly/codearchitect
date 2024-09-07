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

            function findItemById(rootJson, id) {
                // Base case: if the input is an object, check each key
                if (typeof rootJson === 'object' && rootJson !== null) {
                    // Check if this object itself contains the id we are looking for
                    if (rootJson.id === id) {
                        return rootJson;
                    }

                    // If it's an array, check each element recursively
                    if (Array.isArray(rootJson)) {
                        for (let item of rootJson) {
                            const result = findItemById(item, id);
                            if (result) return result;
                        }
                    } else {
                        // If it's an object, check each property recursively
                        for (let key in rootJson) {
                            if (rootJson.hasOwnProperty(key)) {
                                const result = findItemById(rootJson[key], id);
                                if (result) return result;
                            }
                        }
                    }
                }

                // Return null if no matching item is found
                return null;
            }

            // Async function to handle fetching and populating the select options
            async function simpleSearchItem(key, formGroup, properties, initialVal, parentpath) {
                const { query, readonly, text } = properties;

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
                selectedItem.onchange = (e) => {
                    const updateJson = new CustomEvent('updateJSON', {
                        detail: {
                            path: [...parentpath, key],
                            value: selectedItem.value
                        },
                    });

                    // Dispatch the custom event into the select element
                    form.dispatchEvent(updateJson);
                };
                if (!text === true)
                    selectedItem.disabled = true;

                selectedItemContainer.appendChild(selectedItem);

                //Create the badge element
                const selectedBadge = document.createElement('vscode-badge');
                selectedBadge.textContent = "";
                selectedBadge.style.display = 'none';

                // Create a span element to hold the icon
                const iconSpan = document.createElement('span');
                iconSpan.className = 'codicon codicon-';
                iconSpan.style.marginRight = '3px';
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
                    const updateJson = new CustomEvent('updateJSON', {
                        detail: {
                            path: [...parentpath, key],
                            value: ""
                        },
                    });

                    // Dispatch the custom event into the select element
                    form.dispatchEvent(updateJson);
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
                tree.arrows = true;
                let mySet = [];
                [tree.data, mySet] = fetchOptionsFromSearch(query, initialVal);

                tree.addEventListener('dblclick', (event) => {
                    if ([...mySet].some(set => set.id === tree._selectedItem.id)) {
                        //Make the tree container invisible
                        treeContainer.style.display = 'none';
                        // Set the value of the selectedItemContainer
                        const changeEvent = new CustomEvent('tree-updated', {
                            detail: {
                                value: tree._selectedItem,
                            },
                        });

                        const updateJson = new CustomEvent('updateJSON', {
                            detail: {
                                path: [...parentpath, key],
                                value: "${id:" + tree._selectedItem.id + "}"
                            },
                        });

                        // Dispatch the custom event into the select element
                        form.dispatchEvent(updateJson);

                        // Dispatch the custom event into the select element
                        selectedItemContainer.dispatchEvent(changeEvent);
                    }
                });
                treeContainer.appendChild(tree);
                masterContainer.appendChild(treeContainer);

                if (initialVal !== "" && initialVal.startsWith("${id")) {
                    // Regular expression to match ${idTHIS} or similar patterns
                    const regex = /\$\{id:([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})\}/;
                    // Get the first match
                    const match = initialVal.match(regex);
                    if (match) {
                        //Find the vscode-badge in the selected item container
                        iconSpan.className = 'codicon codicon-' + findItemById(rootJson, match[1]).icon;
                        //Get the tetx node
                        textContent.textContent = findItemById(rootJson, match[1]).label;
                        selectedBadge.style.display = 'inline-block';
                        selectedItem.style.display = 'none';
                    }
                } else if (initialVal !== "" && !initialVal.startsWith("${id")) {
                    selectedItem.value = initialVal;
                }
            }

            function fetchOptionsFromSearch(query, initialValue) {
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
                            if (isArr) {
                                newPath[1].push(json[key]?.label);
                            }
                            else
                                newPath[1].push(key);
                            decodeTreeOptions(query, json[key], initialValue, newPath, Array.isArray(json[key]));
                        } else if (typeof json === 'object') {
                            if (matchesQuery(json, query)) {
                                const newJson = { ...json };
                                newJson.path = newPath;
                                mySet.add(newJson);
                            }
                        }
                    }
                }

                decodeTreeOptions(query, json, initialValue, rootPath, false);
                let tree = {};
                for (const item of mySet) {
                    const fullpath = [];
                    for (const [index, value] of item.path[2].entries()) {
                        if (value) {
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

                            if ([...mySet].some(set => set.id === item.path[2][index])) {
                                dict.decorations = [];
                                dict.decorations.push({ visibleWhen: 'always', appearance: 'filled-circle' });
                            } else {
                                dict.open = true;
                            }

                            if (Object.keys(tree).length === 0) {
                                tree = dict;
                                tree.value = 'black hole';
                            } else if (index !== 0) {
                                let temp = tree;
                                for (const p of fullpath.slice(1)) {
                                    for (const [index, subitem] of temp.subItems.entries()) {
                                        if (subitem.label === p) {
                                            temp = temp.subItems[index];
                                            break;
                                        }
                                    }
                                }
                                if (temp.subItems.length === 0)
                                    temp.subItems.push(dict);
                                else {
                                    if (!temp.subItems.some(sub => sub.id === item.path[2][index])) {
                                        temp.subItems.push(dict);
                                    }
                                }
                            }
                            fullpath.push(item.path[1][index]);
                        }
                    }
                }
                return [[tree], mySet];
            }

            //Create function to iterate over schema and create a form.
            const createForm = (schema, jsonItem) => {
                const layoutForm = document.createElement('vscode-split-layout');
                layoutForm.split = 'vertical';

                const form = document.createElement('vscode-scrollable');
                form.slot = 'start';
                const viewer = document.createElement('vscode-scrollable');
                viewer.slot = 'end';
                viewer.style.display = 'none';
                layoutForm.initialHandlePosition = "100%";
                layoutForm.appendChild(form); // Add the viewer to the slot
                layoutForm.appendChild(viewer); // Add the viewer to the slot
                layoutForm.handleSize = '0';
                if (schema?.view) {
                    const openView = document.createElement('vscode-icon');
                    openView.style.marginLeft = "5px";
                    openView.name = 'eye';
                    openView.actionIcon = true;
                    form.appendChild(openView);

                    openView.onclick = () => {
                        viewer.style.display = viewer.style.display === 'none' ? 'block' : 'none';
                        if(viewer.style.display === 'none')
                        {
                            openView.name = 'eye';
                            layoutForm.handleSize = '0';
                            layoutForm.initialHandlePosition = "100%";
                            layoutForm.initializeResizeHandler();
                        } else {
                            openView.name = 'eye-closed';
                            layoutForm.handleSize = '4';
                            layoutForm.initialHandlePosition = "50%";
                            layoutForm.initializeResizeHandler();
                        }
                    };
                }
                const updateJSONHandler = (e) => {
                    let current = jsonItem;
                    const path = [...e.detail.path];
                    const value = e.detail.value;

                    if (path.length > 0) {
                        let key = path[0];

                        for (let i = 0; i < path.length - 1; i++) {
                            key = path[i];
                            current = current[key];
                        }
                        key = path[path.length - 1];
                        current[key] = value;
                    }

                    // Handle the editObject command
                    vscode.postMessage({ command: 'saveObject', json: jsonItem, jsonPath: jsonPath, jsonFile: jsonFile });
                };

                // Initial event listener setup
                form.addEventListener('updateJSON', updateJSONHandler);

                const header = document.createElement('vscode-textfield');
                header.classList.add('header');
                header.name = jsonItem["label"];
                header.value = jsonItem["label"];

                header.onchange = (e) => {
                    const updateJson = new CustomEvent('updateJSON', {
                        detail: {
                            path: ["label"],
                            value: header.value
                        },
                    });

                    // Dispatch the custom event into the select element
                    form.dispatchEvent(updateJson);
                    header.disabled = true;
                };
                header.onblur = (e) => {
                    header.disabled = true;
                };
                header.disabled = true;
                form.appendChild(header);

                const headerIcon = document.createElement('vscode-icon');
                headerIcon.style.marginLeft = "5px";
                headerIcon.name = 'edit';
                headerIcon.actionIcon = true;
                headerIcon.onclick = (e) => {
                    header.disabled = false;
                };
                form.append(header); // Append the header first
                form.append(headerIcon);

                const properties = schema.properties;

                function decodeProperty(properties, parent, schema, json, parentpath) {
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
                        const type = properties[key].type;
                        if (type === 'string') {
                            if (!properties[key].enum && !properties[key].search) {
                                if (properties[key].multiline) {
                                    // Check if markdown is enabled
                                    const textarea = document.createElement('vscode-textarea');
                                    textarea.name = key;
                                    textarea.value = initialValue;
                                    // Make minimum height of 10em
                                    textarea.style.minHeight = '10em';
                                    textarea.onchange = (e) => {
                                        const updateJson = new CustomEvent('updateJSON', {
                                            detail: {
                                                path: [...parentpath, key],
                                                value: textarea.value
                                            },
                                        });

                                        // Dispatch the custom event into the select element
                                        form.dispatchEvent(updateJson);
                                    };
                                    textarea.disabled = properties[key].readonly ? true : false;

                                    //// Create a toolbar container at the top of the textarea
                                    //const toolbarContainer = document.createElement('div');
                                    //toolbarContainer.style.display = 'flex';
                                    //toolbarContainer.style.justifyContent = 'flex-start';
                                    //toolbarContainer.style.alignItems = 'center';
                                    //toolbarContainer.style.marginBottom = '0.5em'; // Add some space below the toolbar
                                    //
                                    //if (properties[key].markdown) {
                                    //    // Create a div to hold the markdown text
                                    //    const markdownContainer = document.createElement('div');
                                    //    markdownContainer.id = 'markdown-container';
                                    //    // Hide it initially
                                    //    markdownContainer.style.display = 'none';
                                    //
                                    //    // Create a preview button
                                    //    const buttonPreview = document.createElement('vscode-icon');
                                    //    buttonPreview.name = 'eye';
                                    //    buttonPreview.onclick = (e) => {
                                    //        // Toggle the markdown and HTML content
                                    //        if (textarea.style.display === 'none') {
                                    //            textarea.style.display = 'block';
                                    //            markdownContainer.style.display = 'none';
                                    //        } else {
                                    //            // Parse the markdown content
                                    //            const markdown = textarea.value;
                                    //            const html = marked.parse(markdown);
                                    //            markdownContainer.innerHTML = html;
                                    //            textarea.style.display = 'none';
                                    //            markdownContainer.style.display = 'block';
                                    //        }
                                    //    };
                                    //    buttonPreview.actionIcon = true;
                                    //
                                    //    // Add the buttons to the toolbar
                                    //    toolbarContainer.appendChild(buttonPreview);
                                    //
                                    //    // Add the toolbar and textarea to the container
                                    //    textareaContainer.appendChild(toolbarContainer);
                                    //    textareaContainer.appendChild(textarea);
                                    //    textareaContainer.appendChild(markdownContainer);
                                    //
                                    //    markdownContainer.style.fontSize = '10px'; // Set the font size to a smaller value
                                    //} else {
                                    //    // If markdown is not enabled, just add the textarea
                                    //    textareaContainer.appendChild(toolbarContainer);
                                    //    textareaContainer.appendChild(textarea);
                                    //}

                                    // Finally, append the textareaContainer to the formGroup
                                    formGroup.appendChild(textarea);
                                } else {
                                    const input = document.createElement('vscode-textfield');
                                    input.name = key;
                                    input.value = initialValue;
                                    input.onchange = (e) => {
                                        const updateJson = new CustomEvent('updateJSON', {
                                            detail: {
                                                path: [...parentpath, key],
                                                value: input.value
                                            },
                                        });

                                        // Dispatch the custom event into the select element
                                        form.dispatchEvent(updateJson);
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
                                    const updateJson = new CustomEvent('updateJSON', {
                                        detail: {
                                            path: [...parentpath, key],
                                            value: select.value
                                        },
                                    });

                                    // Dispatch the custom event into the select element
                                    form.dispatchEvent(updateJson);
                                };
                                properties[key].enum.forEach((item) => {
                                    const option = document.createElement('vscode-option');
                                    option.value = item;
                                    option.textContent = item; // Use textContent for option text
                                    select.appendChild(option);
                                });
                                formGroup.appendChild(select);
                            } else if (properties[key].search) {
                                simpleSearchItem(key, formGroup, properties[key].search, initialValue, parentpath);
                            }
                        } else if (type === 'boolean') {
                            const checkbox = document.createElement('vscode-checkbox');
                            checkbox.name = key;
                            checkbox.checked = initialValue;
                            checkbox.onchange = (e) => {
                                const updateJson = new CustomEvent('updateJSON', {
                                    detail: {
                                        path: [...parentpath, key],
                                        value: checkbox.checked
                                    },
                                });

                                // Dispatch the custom event into the select element
                                form.dispatchEvent(updateJson);
                            };
                            checkbox.disabled = properties[key].readonly ? true : false;
                            formGroup.appendChild(checkbox);
                        } else if (type === 'array') {
                            const items = properties[key].items;
                            if (items.type === 'string') {
                                if (!items.enum && !items.search) {
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

                                        console.log("Drop Item");

                                        const arr = [];

                                        for (const [index, child] of Array.from(arrayContainer.children).entries()) {
                                            arr.push(child.value);
                                        }

                                        const updateJson = new CustomEvent('updateJSON', {
                                            detail: {
                                                path: [...parentpath, key],
                                                value: arr
                                            },
                                        });

                                        // Dispatch the custom event into the select element
                                        form.dispatchEvent(updateJson);
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
                                            console.log("Change Item");
                                            //Resize it to current content
                                            input.style.width = input.value.length + 6 + 'ch';
                                            const arr = [];

                                            for (const [index, child] of Array.from(container.children).entries()) {
                                                arr.push(child.value);
                                            }

                                            const updateJson = new CustomEvent('updateJSON', {
                                                detail: {
                                                    path: [...parentpath, key],
                                                    value: arr
                                                },
                                            });

                                            // Dispatch the custom event into the select element
                                            form.dispatchEvent(updateJson);
                                        };
                                        // Create a close icon
                                        const closeIcon = document.createElement('vscode-icon');
                                        closeIcon.name = 'close';
                                        closeIcon.onclick = (e) => {
                                            console.log("Remove Item");
                                            //Remove the input
                                            container.removeChild(input);
                                            //
                                            const arr = [];

                                            for (const [index, child] of Array.from(container.children).entries()) {
                                                arr.push(child.value);
                                            }

                                            const updateJson = new CustomEvent('updateJSON', {
                                                detail: {
                                                    path: [...parentpath, key],
                                                    value: arr
                                                },
                                            });

                                            // Dispatch the custom event into the select element
                                            form.dispatchEvent(updateJson);
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
                                        createItem(arrayContainer, "");
                                    };

                                    formGroup.appendChild(addButton);
                                } else if (items.enum && items.enum.length > 0) {
                                    const select = document.createElement('vscode-multi-select');
                                    select.name = key;
                                    select.value = initialValue;
                                    select.disabled = properties[key].readonly ? true : false;
                                    select.onchange = (e) => {
                                        const updateJson = new CustomEvent('updateJSON', {
                                            detail: {
                                                path: [...parentpath, key],
                                                value: select.value
                                            },
                                        });

                                        // Dispatch the custom event into the select element
                                        form.dispatchEvent(updateJson);
                                    };
                                    items.enum.forEach((item) => {
                                        const option = document.createElement('vscode-option');
                                        if (initialValue.some(val => val === item)) {
                                            option.selected = true;
                                        }
                                        option.value = item;
                                        option.textContent = item; // Use textContent for option text
                                        select.appendChild(option);
                                    });
                                    formGroup.appendChild(select);
                                } else if (items.search) {
                                    const query = items.search.query;
                                    const text = items.search.text;

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

                                        const arr = [];

                                        for (const [index, child] of Array.from(arrayContainer.children).entries()) {
                                            if (child.nodeName === 'VSCODE-TEXTFIELD') {
                                                arr.push(child.value);
                                            }
                                            else {
                                                arr.push('${id:' + child.taggedValue.id + '}');
                                            }
                                        }

                                        const updateJson = new CustomEvent('updateJSON', {
                                            detail: {
                                                path: [...parentpath, key],
                                                value: arr
                                            },
                                        });

                                        // Dispatch the custom event into the select element
                                        form.dispatchEvent(updateJson);
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
                                            const arr = [];

                                            for (const [index, child] of Array.from(arrayContainer.children).entries()) {
                                                if (child.nodeName === 'VSCODE-TEXTFIELD') {
                                                    arr.push(child.value);
                                                }
                                                else {
                                                    arr.push('${id:' + child.taggedValue.id + '}');
                                                }
                                            }

                                            const updateJson = new CustomEvent('updateJSON', {
                                                detail: {
                                                    path: [...parentpath, key],
                                                    value: arr
                                                },
                                            });

                                            // Dispatch the custom event into the select element
                                            form.dispatchEvent(updateJson);
                                        };

                                        const closeIcon = document.createElement('vscode-icon');
                                        closeIcon.name = 'close';
                                        closeIcon.onclick = (e) => {
                                            container.removeChild(input);
                                            const arr = [];

                                            for (const [index, child] of Array.from(container.children).entries()) {
                                                if (child.nodeName === 'VSCODE-TEXTFIELD') {
                                                    arr.push(child.value);
                                                }
                                                else {
                                                    arr.push('${id:' + child.taggedValue.id + '}');
                                                }
                                            }

                                            const updateJson = new CustomEvent('updateJSON', {
                                                detail: {
                                                    path: [...parentpath, key],
                                                    value: arr
                                                },
                                            });

                                            // Dispatch the custom event into the select element
                                            form.dispatchEvent(updateJson);
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

                                        // Example of additional data that you might want to store
                                        const taggedValue = {
                                            label: item.label,
                                            id: item.id,
                                            item: item
                                        };

                                        badge.taggedValue = taggedValue;

                                        const textContent = document.createTextNode(item.label);
                                        badge.appendChild(iconSpan);
                                        badge.appendChild(textContent);

                                        const removeButton = document.createElement('vscode-icon');
                                        removeButton.name = 'close';
                                        removeButton.onclick = (e) => {
                                            arrayContainer.removeChild(badge);
                                            const arr = [];

                                            for (const [index, child] of Array.from(arrayContainer.children).entries()) {
                                                if (child.nodeName === 'VSCODE-TEXTFIELD') {
                                                    arr.push(child.value);
                                                }
                                                else {
                                                    arr.push('${id:' + child.taggedValue.id + '}');
                                                }
                                            }

                                            const updateJson = new CustomEvent('updateJSON', {
                                                detail: {
                                                    path: [...parentpath, key],
                                                    value: arr
                                                },
                                            });

                                            // Dispatch the custom event into the select element
                                            form.dispatchEvent(updateJson);
                                        };
                                        removeButton.actionIcon = true;
                                        badge.appendChild(removeButton);

                                        arrayContainer.appendChild(badge);
                                    }

                                    // Listen for tree-updated event to create badges
                                    arrayContainer.addEventListener('tree-updated', (e) => {
                                        createBadge(e.detail.value);
                                        const arr = [];

                                        for (const [index, child] of Array.from(arrayContainer.children).entries()) {
                                            if (child.nodeName === 'VSCODE-TEXTFIELD') {
                                                arr.push(child.value);
                                            }
                                            else {
                                                arr.push('${id:' + child.taggedValue.id + '}');
                                            }
                                        }

                                        const updateJson = new CustomEvent('updateJSON', {
                                            detail: {
                                                path: [...parentpath, key],
                                                value: arr
                                            },
                                        });

                                        // Dispatch the custom event into the select element
                                        form.dispatchEvent(updateJson);
                                    });

                                    // Create a div to hold a single select and a button
                                    const singleSelectContainer = document.createElement('div');
                                    singleSelectContainer.className = 'single-select-container';
                                    singleSelectContainer.style.display = 'flex';
                                    singleSelectContainer.style.alignItems = 'center';
                                    singleSelectContainer.style.flexWrap = 'wrap';
                                    mainContainer.appendChild(singleSelectContainer);

                                    const select = document.createElement('vscode-single-select');
                                    select.style.display = 'none';
                                    // Create a select element
                                    if (text === true) {
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
                                        select.style.display = 'inline-block';
                                    }

                                    // Create a button element
                                    const addButton = document.createElement('vscode-icon');
                                    addButton.name = 'add';
                                    addButton.actionIcon = true;
                                    addButton.onclick = (e) => {
                                        const value = select.value;
                                        if (value === 'Text') {
                                            createText(arrayContainer, "");
                                        } else {
                                            treeContainer.style.display = 'block';
                                        }
                                    };
                                    singleSelectContainer.appendChild(addButton);
                                    singleSelectContainer.appendChild(select);

                                    for (const value of initialValue) {
                                        if (value.startsWith("${id")) {
                                            // Regular expression to match ${idTHIS} or similar patterns
                                            const regex = /\$\{id:([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})\}/;
                                            // Get the first match
                                            const match = value.match(regex);
                                            if (match) {
                                                const item = findItemById(rootJson, match[1]);
                                                item.icons = {
                                                    leaf: item.icon
                                                };
                                                createBadge(item);
                                            }

                                        } else {
                                            createText(arrayContainer, value);
                                        }
                                    }

                                    // Create a div to hold the tree and select
                                    const treeContainer = document.createElement('div');
                                    treeContainer.className = 'tree-container';
                                    treeContainer.style.display = 'none';
                                    const tree = document.createElement('vscode-tree');
                                    tree.arrows = true;
                                    let mySet = [];
                                    [tree.data, mySet] = fetchOptionsFromSearch(query, initialValue);

                                    tree.addEventListener('dblclick', (event) => {
                                        if ([...mySet].some(set => set.id === tree._selectedItem.id)) {
                                            //Make the tree container invisible
                                            treeContainer.style.display = 'none';
                                            // Set the value of the selectedItemContainer
                                            const changeEvent = new CustomEvent('tree-updated', {
                                                detail: {
                                                    value: tree._selectedItem,
                                                },
                                            });

                                            // Dispatch the custom event into the select element
                                            arrayContainer.dispatchEvent(changeEvent);
                                        }
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
                            decodeProperty(schema.properties[key].properties, collabsibleItem, schema.properties[key], json[key], [...parentpath, key]);
                        }

                        // Append formGroup to form
                        parent.appendChild(formGroup);
                    }
                }

                decodeProperty(properties, form, schema, jsonItem, []);

                return layoutForm;
            }

            const form1 = createForm(schema, itemJson);

            const form2 = createForm(schema, itemJson);

            document.body.appendChild(form1);
            document.body.appendChild(form2);
        }
        else {
            console.error('Command not implemented yet');
        }
    });
});
