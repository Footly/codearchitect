import json
import argparse
import re
import os
import sys
import argparse
from json2plantuml import PlantUMLConverter 
import markdown
import io

def to_camel_case(name):
    words = name.split()
    # Capitalize the first letter of each word and join them
    camel_case_name = ''.join(word.capitalize() for word in words)
    return camel_case_name

def format_anchor(text, name=""):
    """Format the text to be used as an anchor link."""
    new_text = "#"+text.replace(' ', '-').replace(':', '').lower()
    # Check if the name is provided and prepend it to the anchor
    if name:
        new_text = f"{name}{new_text}"
    return new_text

def format_list(items, name=""):
    """Format a list of items into a Markdown string with links or error symbol."""
    if not items:
        return '<span style="color: red;">❌ No items</span>'
    return '<br>'.join([
        f"[{item['label']}]({format_anchor(item['label'], name)}): <i style='font-size: smaller;'>{item['description'][:80] + ('...' if len(item['description']) > 80 else '')}</i>" 
        for item in items
    ])

def get_all_ids(data):
    return [obj.get("id") for obj in data if "id" in obj]

def search_parent(rootData, path, tag):
    # Base case: If path is empty, return the rootData (we have found the object)
    if not path:
        return [rootData, []]

    result = rootData
    try:
        for key in path:
            if isinstance(key, str) and key.isdigit():
                key = int(key)  # Convert the string key to an integer
            result = result[key]  # Go one level deeper in the dictionary
    except KeyError as e:
        print(f"KeyError encountered: {e} in path {path}")
        return None, path
    
    # If 'id' key exists, return the current object
    if 'id' in result and 'tags' in result and tag in result['tags']:
        return [result, path]
    
    # If 'id' key does not exist, pop the last item from the path and search the parent
    path.pop()  # Go up one level
    return search_parent(rootData, path, tag)

def get_all_refs_to_object(target_id, data, rootData, tag, path=""):
    refs = []

    if isinstance(data, dict):
        for key, value in data.items():
            current_path = f"{path}.{key}" if path else key  # Build the current path
            if value == target_id:  # Check if the value matches the target ID
                parent_result = search_parent(rootData, path.split('.'), tag)
                if parent_result and parent_result[1]:
                    refs.append(parent_result[0])  # Append the entire parent dictionary
            else:
                refs.extend(get_all_refs_to_object(target_id, value, rootData, tag, current_path))  # Recursively search deeper
    elif isinstance(data, list):
        for index, item in enumerate(data):
            current_path = f"{path}.{index}"
            if isinstance(item, dict) or isinstance(item, list):
                refs.extend(get_all_refs_to_object(target_id, item, rootData, tag, current_path))  # Recursively search list items
            elif item == target_id:  # If the target is found in a simple list
                parent_result = search_parent(rootData, path.split('.'), tag)
                if parent_result and parent_result[1]:
                    refs.append(parent_result[0])  # Append the parent list

    return refs

def search_by_id(target_id, json_data, path=""):
    if isinstance(json_data, dict):
        for key, value in json_data.items():
            if key == "id" and value == target_id:  # Check if the key is 'id' and the value matches target_id
                return json_data  # Return the entire object (dictionary)
            else:
                # Recursively search deeper within nested dictionaries or lists
                result = search_by_id(target_id, value, path + f".{key}" if path else key)
                if result:  # Return as soon as the object is found
                    return result

    elif isinstance(json_data, list):
        for index, item in enumerate(json_data):
            # Recursively search within lists
            result = search_by_id(target_id, item, path + f".{index}")
            if result:  # Return as soon as the object is found
                return result

    return None  # Return None if no matching object is found

def extract_guid(text):
    # Regular expression to match the GUID pattern inside the text
    match = re.search(r'\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b', text)
    
    # Return the matched GUID or None if not found
    return match.group(0) if match else None

def generate_markdown_main(libs, name, filepath):
    # Convert the project name to camel case
    camel_case_name = to_camel_case(libs['label'])
    
    # Start creating the markdown content, setting the camel case name in the header
    markdown = f"# {camel_case_name} Main View\n\n"
    
    try:
        ## Get the directory where the script is being executed
        #script_dir = os.path.dirname(os.path.abspath(__file__))
        ## Construct the path to the file relative to the script directory
        #file_path = os.path.join(script_dir, "index_aspice_sw.txt")

        ## Open the file in the specified path
        #with open(file_path, "r") as file:
        #    # Read the content of the file
        #    file_content = file.read()

        # Add some details about the name and libraries
        markdown += f"## Description: \n\n{libs['description']}\n\n"
        #
        ## Function to replace SWE1 to SWE6 with hyperlinks
        #def substitute_swe_labels(content):
        #    # Define a dictionary for SWE labels and their corresponding links
        #    swe_links = {
        #        "SWE1": f"[SWE1]({name}_swe1.md)",
        #        "SWE2": f"[SWE2]({name}_swe2.md)",
        #        "SWE3": f"[SWE3]({name}_swe3.md)",
        #        "SWE4": f"[SWE4]({name}_swe4.md)",
        #        "SWE5": f"[SWE5]({name}_swe5.md)",
        #        "SWE6": f"[SWE6]({name}_swe6.md)"
        #    }
        #    
        #    # Substitute all occurrences of SWE1-SWE6 with their corresponding hyperlinks
        #    for label, link in swe_links.items():
        #        content = re.sub(rf"\b{label}\b", link, content)
        #    
        #    return content
        #
        ## Replace the SWE labels in the file content
        #updated_content = substitute_swe_labels(file_content)
        #
        ## Append the modified content to the markdown
        markdown += "### ASPICE SW Content:\n\n"
        #markdown += updated_content

        # Create a table with SWE labels arranged as specified
        #markdown += "\n### SWE Labels Table\n\n"
        markdown += "| Define    | Verify    |\n"
        markdown += "|-----------|-----------|\n"
        
        # Define SWE links
        swe_links = {
            "SWE1": f"[SWE1]({name}_swe1.md)",
            "SWE2": f"[SWE2]({name}_swe2.md)",
            "SWE3": f"[SWE3]({name}_swe3.md)",
            "SWE4": f"[SWE4]({name}_swe4.md)",
            "SWE5": f"[SWE5]({name}_swe5.md)",
            "SWE6": f"[SWE6]({name}_swe6.md)"
        }
        
        # Fill the table rows with SWE1 to SWE3 on the left and SWE6 to SWE4 in reverse order on the right
        for i in range(3):
            left_label = f"SWE{i+1}"
            right_label = f"SWE{6-i}"
            markdown += f"| {swe_links[left_label]} | {swe_links[right_label]} |\n"

    except FileNotFoundError:
        markdown += "Error: index_aspice_sw.txt file not found.\n"
    
    return markdown

def generate_markdown_swe1(libs, name, filepath):
    markdown = f"[Back to Main Page]({name}.md)\n\n"
    markdown += "# Traceability SWE1 View\n\n"
    markdown += "This document presents the relationships between requirements, packages, and qualification tests. Each requirement is associated with one or more packages that depend on it and the verification tests that confirm these relationships.\n\n"
    
    # Table of Contents
    markdown += "## Table of Contents\n\n"
    markdown += "- [Summary Table](#summary-table)\n"
    markdown += "- [Requirements](#requirements)\n"

    # Summary Table
    markdown += "## Summary Table\n\n"
    markdown += "| Requirements | Satisfied by | Verified by |\n"
    markdown += "|--------------|--------------|-------------|\n"
    
    for req_id, details in libs.items():
        satisfied_by = format_list(details.get('libs', []), name+"_swe2.md")
        verified_by = format_list(details.get('verified_by', []), name+"_swe6.md")
        description = details.get('desc', 'No description available')
        anchor_req_id = format_anchor(req_id)
        markdown += f"| [`{req_id}`]({anchor_req_id}): {description[:80] + ('...' if len(description) > 80 else '')} | {satisfied_by} | {verified_by} |\n"

    # Requirements
    markdown += "\n## Requirements\n\n"
    markdown += f"[Back to Table of Contents](#table-of-contents)\n\n"
    for req_id, details in libs.items():
        markdown += f"### `{req_id}`\n"
        markdown += f"**Description:** {details.get('desc', 'No description available')}\n\n"
        markdown += f"- **Satisfied by:**\n"
        
        for library in details.get('libs', []):
            anchor_library = format_anchor(library['label'], name+"_swe2.md")
            markdown += f"    - **[{library['label']}]({anchor_library})**\n"
        
        if not details.get('libs'):
            markdown += "    - <span style='color: red;'>❌ No packages satisfied this requirement.</span>\n"
        
        markdown += f"- **Verified by:**\n"
        for qualtest in details.get('verified_by', []):
            anchor_qualtest = format_anchor(qualtest['label'], name+"_swe6.md")
            markdown += f"    - **[{qualtest['label']}]({anchor_qualtest})**\n"
        
        if not details.get('verified_by'):
            markdown += "    - <span style='color: red;'>❌ No qualification tests verified this requirement.</span>\n"
        markdown += "\n"

    markdown += "---\n\n"
    
    return markdown

def generate_markdown_swe2(libs, name, filepath):
    markdown = f"[Back to Main Page]({name}.md)\n\n"
    markdown += "# Traceability SWE2 View\n\n"
    markdown += "This document presents the relationships between packages, libraries, requirements, and integration tests. Each package consists of a architectural block satisfying requirement/s, implemented by librarie/s and verified by integration test/s.\n\n"
    
    # Table of Contents
    markdown += "## Table of Contents\n\n"
    markdown += "- [Summary Table](#summary-table)\n"
    markdown += "- [Packages](#packages)\n"

    # Summary Table
    markdown += "## Summary Table\n\n"
    markdown += "| Satisfies | Package | Implemented by | Verified by |\n"
    markdown += "|-----------|---------|----------------|-------------|\n"
    
    for package, details in libs.items():
        implemented_by = format_list(details.get('implemented by', []), name+"_swe3.md")
        satisfies = format_list(details.get('satisfies', []), name+"_swe1.md")
        verified_by = format_list(details.get('verified by', []), name+"_swe5.md")
        description = details.get('desc', 'No description available')
        anchor_package = format_anchor(package)
        markdown += f"| {satisfies} | [`{package}`]({anchor_package}): {description[:80] + ('...' if len(description) > 80 else '')} | {implemented_by} | {verified_by} |\n"

    # Packages
    markdown += "\n## Packages\n\n"
    markdown += f"[Back to Table of Contents](#table-of-contents)\n\n"
    for package, details in libs.items():
        markdown += f"### `{package}`\n"
        markdown += f"**Description:** {details.get('desc', 'No description available')}\n\n"
        markdown += "- **Satisfies Requirements:**\n"
        
        for requirement in details.get('satisfies', []):
            anchor_requirement = format_anchor(requirement['label'], name+"_swe1.md")
            markdown += f"  - **[{requirement['label']}]({anchor_requirement})**: {requirement['description']}\n"
        
        if not details.get('satisfies'):
            markdown += "    - <span style='color: red;'>❌ No requirements satisfied by this package.</span>\n"

        markdown += "- **Implemented by:**\n"
        
        for lib in details.get('implemented by', []):
            anchor_lib = format_anchor(lib['label'], name+"_swe3.md")
            markdown += f"    - **[{lib['label']}]({anchor_lib})**: {lib['description']}\n"
        
        if not details.get('implemented by'):
            markdown += "    - <span style='color: red;'>❌ No libraries implementing this package.</span>\n"
        
        markdown += "- **Verified by:**\n"
        for inttest in details.get('verified by', []):
            anchor_inttest = format_anchor(inttest['label'], name+"_swe5.md")
            markdown += f"    - **[{inttest['label']}]({anchor_inttest})**: {inttest.get('description', 'No description available')}\n"
        
        if not details.get('verified by'):
            markdown += "    - <span style='color: red;'>❌ No Int. tests verify this package.</span>\n"
        markdown += "\n"

    markdown += "---\n\n"
    
    return markdown

def generate_markdown_swe3(libs, name, filepath):
    markdown = "# Traceability SWE3 View\n\n"
    markdown += "This document presents the relationships between libraries, packages, and unit tests. Each library implements a package and is verified by unit test/s\n\n"
    
    # Table of Contents
    markdown += "## Table of Contents\n\n"
    markdown += "- [Summary Table](#summary-table)\n"
    markdown += "- [Libraries](#libraries)\n"

    # Summary Table
    markdown += "## Summary Table\n\n"
    markdown += "| Satisfies | Library | Verified by |\n"
    markdown += "|-----------|---------|-------------|\n"
    
    for library, details in libs.items():
        satisfies = format_list(details.get('satisfies', []), name+"_swe2.md")
        verified_by = format_list(details.get('verified by', []), name+"_swe4.md")
        description = details.get('desc', 'No description available')
        anchor_library = format_anchor(library)
        markdown += f"| {satisfies} | [`{library}`]({anchor_library}): {description[:80] + ('...' if len(description) > 80 else '')} | {verified_by} |\n"

    # Libraries
    markdown += "\n## Libraries\n\n"
    markdown += f"[Back to Table of Contents](#table-of-contents)\n\n"
    for library, details in libs.items():
        markdown += f"### `{library}`\n"
        converter = PlantUMLConverter(filepath, details.get('id'))
        item = search_by_id(details.get('id'), json_data)
        plantuml = converter.json_to_plantuml_class(item, json_data)
        markdown += f"**Description:** {details.get('desc', 'No description available')}\n\n"
        markdown += f"<!--\n{plantuml}\n-->\n![]({details.get('id')}.svg)\n\n"
        markdown += "- **Satisfies Packages:**\n"
        
        for requirement in details.get('satisfies', []):
            anchor_requirement = format_anchor(requirement['label'], name+"_swe2.md")
            markdown += f"    - **[{requirement['label']}]({anchor_requirement})**: {requirement['description']}\n"
        
        if not details.get('satisfies'):
            markdown += "    - <span style='color: red;'>❌ No package is satisfied by this library.</span>\n"
        
        markdown += "- **Verified by:**\n"
        for unittest in details.get('verified by', []):
            anchor_unittest = format_anchor(unittest['label'], name+"_swe4.md")
            markdown += f"    - **[{unittest['label']}]({anchor_unittest})**: {unittest.get('description', 'No description available')}\n"
        
        if not details.get('verified by'):
            markdown += "    - <span style='color: red;'>❌ No Unit tests verify this library.</span>\n"
        markdown += "\n"

    markdown += "---\n\n"
    
    return markdown

def generate_markdown_swe4(libs, name, filepath):
    markdown = f"[Back to Main Page]({name}.md)\n\n"
    markdown += "# Traceability SWE4 View\n\n"
    # Implement swe4 view specific Markdown generation here
    # ...
    return markdown

def generate_markdown_swe5(libs, name, filepath):
    markdown = f"[Back to Main Page]({name}.md)\n\n"
    markdown += "# Traceability SWE5 View\n\n"
    # Implement swe5 view specific Markdown generation here
    # ...
    return markdown

def generate_markdown_swe6(libs, name, filepath):
    markdown = f"[Back to Main Page]({name}.md)\n\n"
    markdown += "# Traceability SWE6 View\n\n"
    # Implement swe6 view specific Markdown generation here
    # ...
    return markdown

def process_main(json_data, libs):
    libs['label'] = json_data['label']
    libs['description'] = json_data['documentation']

def process_swe1(json_data, libs):
    requirements = []
    if 'Requirements' in json_data and len(json_data['Requirements']) > 0:
        requirements = json_data['Requirements']
    ids = list(set(get_all_ids(requirements)))
    for id in ids:
        target_id = "${id:" + id + "}"
        for req in requirements:
            if 'id' in req and req['id'] == id:
                lib_refs = get_all_refs_to_object(target_id, json_data, json_data, "package")
                libs[req['label']] = {}
                arr_refs = []
                seen_refs = set()

                for ref in lib_refs:
                    dictionary = {
                        'label': ref['label'],
                        'description': ref['documentation']
                    }
                    dict_tuple = (dictionary['label'], dictionary['description'])

                    if dict_tuple not in seen_refs:
                        seen_refs.add(dict_tuple)
                        arr_refs.append(dictionary)
                libs[req['label']]['libs'] = arr_refs

                arr_refs = []
                seen_refs = set()
                qual_refs = get_all_refs_to_object(target_id, json_data, json_data, "qualtest")

                libs[req['label']]['verified_by'] = []

                for ref in qual_refs:
                    dictionary = {
                        'label': ref['label'],
                        'description': ref['documentation']
                    }
                    dict_tuple = (dictionary['label'], dictionary['description'])

                    if dict_tuple not in seen_refs:
                        seen_refs.add(dict_tuple)
                        arr_refs.append(dictionary)

                libs[req['label']]['verified_by'] = arr_refs
                libs[req['label']]['desc'] = req['description']
                break

def process_swe2(json_data, libs):
    def look_for_packages(json_data):
        # This will store all the found packages
        packages = []

        # If 'packages' key exists and has content, add to the list
        if "packages" in json_data:
            packages.extend(json_data['packages'])

        if "layers" in json_data:
            # Recursively process nested packages
            for item in json_data['layers']:
                if isinstance(item, dict):
                    packages.extend(look_for_packages(item))
        return packages

    # Check if 'Architecture' exists and is not empty
    architecture = json_data.get('Architecture', [])
    # Initialize packages list
    packages = []

    if architecture:
        for item in architecture:
            if isinstance(item, dict):
                packages.extend(look_for_packages(item))
            elif isinstance(item, list):
                packages.extend(item)
                
    ids = list(set(get_all_ids(packages)))
    int_tests = []
    for id in ids:
        target_id = "${id:" + id + "}"
        int_tests.extend(get_all_refs_to_object(target_id, json_data, json_data, "inttest"))

    for pack in packages:
        libs[pack['label']] = {}
        libs[pack['label']]['desc'] = pack['documentation']
        libs[pack['label']]['id'] = pack['id']
        libs[pack['label']]['satisfies'] = []
        libs[pack['label']]['implemented by'] = []
        libs[pack['label']]['verified by'] = []
        if 'requirements' in pack and pack['requirements']:  # Corrected this line
            for req in pack['requirements']:
                req_item = search_by_id(extract_guid(req), json_data)
                dictionary = {
                  'label': req_item['label'],
                  'description': req_item['description']
                }
                libs[pack['label']]['satisfies'].append(dictionary)
        if 'libraries' in pack and pack['libraries']:  # Corrected this line
            for lib in pack['libraries']:
                dictionary = {
                  'label': lib['label'],
                  'description': lib['documentation']
                }
                libs[pack['label']]['implemented by'].append(dictionary)

        if 'packages' in pack and pack['packages']:  # Corrected this line
            for lib in pack['packages']:
                dictionary = {
                  'label': lib['label'],
                  'description': lib['documentation']
                }
                libs[pack['label']]['implemented by'].append(dictionary)
        
        arr_refs = []
        seen_refs = set()
        for test in int_tests:
            dictionary = {
                'label': test['label'],
                'description': test['documentation']
            }
            dict_tuple = (dictionary['label'], dictionary['description'])

            if dict_tuple not in seen_refs:
                seen_refs.add(dict_tuple)
                arr_refs.append(dictionary)
        libs[pack['label']]['verified by'] = arr_refs

def process_swe3(json_data, libs):
    libraries = {}
    def look_for_libraries(json_data):
        libraries_by_package = {}

        for pack in json_data:
            if isinstance(pack, dict):
                # Use the pack's label as the key for the dictionary
                current_label = pack.get('label', 'unknown_package')

                # Initialize the entry if it doesn't exist
                if current_label not in libraries_by_package:
                    libraries_by_package[current_label] = {}
                    libraries_by_package[current_label]['description'] = pack.get('documentation', '')

                # Add the libraries under the corresponding label
                if "libraries" in pack and pack['libraries']:
                    if 'libraries' not in libraries_by_package[current_label]:
                        libraries_by_package[current_label]['libraries'] = []
                    libraries_by_package[current_label]['libraries'].extend(pack['libraries'])

                # Recursively handle nested packages
                if "packages" in pack and pack['packages']:
                    nested_libraries = look_for_libraries(pack['packages'])
                    # Merge the nested dictionaries with the current one
                    for nested_label, nested_libs in nested_libraries.items():
                        if nested_label not in libraries_by_package:
                            libraries_by_package[nested_label] = {}
                        libraries_by_package[nested_label].update(nested_libs)
        
        return libraries_by_package

    architecture= json_data.get('Architecture', []) if 'Architecture' in json_data and len(json_data['Architecture']) > 0 else []
    if architecture:
        libraries.update(look_for_libraries(architecture))

    ids = []
    for key, value in libraries.items():
        if value and 'libraries' in value and value['libraries']:
            ids.extend(get_all_ids(value['libraries']))

    ids = list(set(ids))
    for pack, value in libraries.items():
        if value and 'libraries' in value and value['libraries']:
            for lib in value['libraries']:
                libs[lib['label']] = {}
                libs[lib['label']]['desc'] = lib['documentation']
                libs[lib['label']]['id'] = lib['id']
                pack_dict = {
                  'label': pack,
                  'description': value['description']
                }
                libs[lib['label']]['satisfies'] = [pack_dict]
                libs[lib['label']]['verified by'] = []
                if 'Unit Tests' in lib and lib['Unit Tests']:  # Corrected this line
                    for unit in lib['Unit Tests']:
                        dictionary = {
                          'label': unit['label'],
                          'description': unit['documentation']
                        }
                        libs[lib['label']]['verified by'].append(dictionary)

def process_swe4(json_data, libs):
    # swe4 specific data processing
    pass

def process_swe5(json_data, libs):
    # swe5 specific data processing
    pass

def process_swe6(json_data, libs):
    # swe6 specific data processing
    pass

def process_view(view_type, json_data, libs, name, filepath):
    view_processors = {
        'main': (process_main, generate_markdown_main),
        'swe1': (process_swe1, generate_markdown_swe1),
        'swe2': (process_swe2, generate_markdown_swe2),
        'swe3': (process_swe3, generate_markdown_swe3),
        'swe4': (process_swe4, generate_markdown_swe4),
        'swe5': (process_swe5, generate_markdown_swe5),
        'swe6': (process_swe6, generate_markdown_swe6)
    }
    if view_type in view_processors:
        process_func, markdown_func = view_processors[view_type]
        process_func(json_data, libs)
        return markdown_func(libs, name, filepath)
    else:
        raise ValueError(f"Unsupported view type: {view_type}")

def process_swe_view(swe_key, json_data, libs, name, file, output_directory, format, output_flag):
    # Process the JSON data and generate the Markdown content for the given swe_key
    swe_markdown = process_view(swe_key, json_data, libs, name, file)

    # Convert markdown to HTML if needed
    if format == "html":
        swe_html = markdown.markdown(swe_markdown, extensions=['tables'])  # Convert markdown to HTML
        output_content = swe_html
    else:
        output_content = swe_markdown  # Keep as markdown

    # Write to file if output flag is set, otherwise print to stdout
    if output_flag:
        with open(f"{output_directory}{name}_{swe_key}.{format}", 'w', encoding='utf-8') as file:
            file.write(output_content)
    else:
        # Use UTF-8 encoding for stdout
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stdout.write(output_content)
        sys.stdout.flush()  # Ensure the content is flushed to stdout

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert JSON to Autogenerated Markdown")
    parser.add_argument("-f", "--file", required=True, help="Path to the JSON file")
    parser.add_argument("-n", "--name", default= "temp", help="Name of the output file (without extension)")
    parser.add_argument("-o", "--output", help="Path to the output directory")  # Output directory argument
    parser.add_argument("-v", "--view", required=True, help="Which view are we generating (e.g., swe1, swe2, ..., or 'all')")
    parser.add_argument("--format", choices=["md", "html"], default="md", help="Output format: 'md' for Markdown (default), 'html' for HTML")
    args = parser.parse_args()

    try:
        options = []
        json_data = {}
        libs = {}

        # Load the JSON data from the file
        with open(args.file, 'r') as json_file:
            json_data = json.load(json_file)

        # Handle which views to generate
        if args.view == 'all':
            options = ['swe1', 'swe2', 'swe3', 'swe4', 'swe5', 'swe6']
        else:
            options.append(args.view)

        # Ensure output directory ends with a slash
        if args.output:
            output_directory = args.output.rstrip('/')
        else:
            output_directory = ""

        # Process each selected view
        for swe_key in options:
            libs = {}  # Reset libs for each swe view
            process_swe_view(swe_key, json_data, libs, args.name, args.file, output_directory, args.format, args.output)

    except Exception as e:
        # Print the error message and exit with status code 1
        print(f"An error occurred: {e}", file=sys.stderr)
        sys.exit(1)
    else:
        # Exit with status code 0 if everything is successful
        sys.exit(0)

# Run the script with the following command:
# python generate_view.py -f path/to/json/file.json -n output_filename -v swe1 -o path/to/output/directory --format md
# Example: python generate_view.py -f data.json -n output -v all -o output/
# The output files will be saved in the specified output directory as output_swe1.md, output_swe2.md, ..., output_swe6.md