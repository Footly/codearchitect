import json
import re
import datetime
import argparse
import sys
import subprocess

# Define placeholders replacement patterns
patterns = {
    '_className': '',
    '_authorName': 'Generated Author',  # Assume author is "Generated Author"
    '_date': datetime.date.today().strftime('%Y-%m-%d'),
    '_req': '',
    '_classDescription': '',
    '__CLASS_NAME_UC_H__': ''
}

# Function to read file content
def read_file_content(file_path):
    with open(file_path, 'r') as file:
        return file.read()

# Helper function to search for an ID in a list
def search_id(links, id):
    return next((link for link in links if link['$id'] == id), None)

# Replace placeholders in template
def replace_placeholders(template, replacements):
    for key, value in replacements.items():
        template = template.replace(key, value)
    return template

def get_requirements_description(requirements, links):
    """Get a comma-separated list of requirement descriptions."""
    descriptions = []
    for req_id in requirements:
        req_info = search_id(links, req_id)
        if req_info:
            descriptions.append(req_info.get('$label', 'Unknown Requirement'))
    return ', '.join(descriptions)

def generate_variable_declarations(variables, links):
    private_declarations_c = ''
    public_declarations_c = ''
    header_declarations = ''
    
    for var in variables:
        # Search for the datatype's label in links
        datatype_info = search_id(links, var['datatype'])
        if datatype_info is None:
            continue  # If datatype is not found, skip this variable

        datatype = datatype_info.get('$label')
        var_name = var['$label']  # Get the variable name
        visibility = var['visibility']  # Get the visibility
        is_pointer = var['isPointer']
        is_const = var['isConst']
        is_array = var.get('isArray', '')  # Retrieve if the variable is an array, default to empty string
        is_volatile = var.get('isVolatile', False)  # Retrieve if the variable is volatile, default to False
        default_value = var.get('defaultValue', '')  # Retrieve default value, default to empty string
        doc = var.get('documentation', '')  # Retrieve comment, default to empty string
        var_id = var.get('$id', 'unknown')  # Retrieve the ID, default to 'unknown' if not present

        # Construct the type string with appropriate modifiers
        type_str = ('volatile ' if is_volatile else '') + ('const ' if is_const else '') + datatype + ('*' if is_pointer else '')
        
        if is_array:
            type_str += f'[{is_array}]'  # Add array size if applicable

        # Add a comment with the ID and a brief Doxygen docstring above each declaration
        comment_doc = (
            f'/**\n'
            f' * @brief {doc if doc else "Brief description for variable " + var_name}.\n'
            f' * @id {var_id}\n'
            f' */\n'
        )
        
        # Generate the declaration string for header file
        header_declaration = f'{comment_doc}extern {type_str} {var_name};\n'
        declaration_c = ''
        # For source files (.c), use 'static' keyword
        if default_value:
            declaration_c = f'{type_str} {var_name} = {default_value};\n'
        else:
            declaration_c = f'{type_str} {var_name};\n'
        if visibility == 'private':
            private_declarations_c += comment_doc + 'static ' + declaration_c
        else:
            public_declarations_c += comment_doc + declaration_c
        
        header_declarations += header_declaration

    return private_declarations_c, public_declarations_c, header_declarations

def generate_function_declaration(functions, links):
    private_declarations = ''
    public_declarations = ''

    for func in functions:
        # Search for the return type's label in links
        return_type_info = search_id(links, func['returntype']['datatype'])
        if return_type_info is None:
            continue  # If return type is not found, skip this function

        return_type = return_type_info.get('$label')
        func_name = func.get('$label', 'unknown')  # Get the function name
        visibility = func.get('visibility', 'public')  # Get visibility
        parameters = func.get('parameters', [])  # Get parameters
        documentation = func.get('documentation', 'No documentation available')  # Get documentation

        # Create parameter list
        param_strs = []
        for param in parameters:
            param_type_info = search_id(links, param['datatype'])
            if param_type_info is None:
                continue  # Skip if datatype is not found

            param_type = param_type_info.get('$label')
            param_name = param.get('$label', 'unknown')
            is_pointer = param.get('isPointer', False)
            is_const = param.get('isConst', False)
            is_pointer_const = param.get('isPointerConst', False) if is_pointer else False
            is_array = param.get('isArray', '')

            # Construct the parameter type string
            if is_pointer:
                if is_pointer_const and is_const:
                    # Pointer is constant, so 'const' is placed after the pointer symbol
                    type_str = f'{param_type} const * const'
                elif is_pointer_const:
                    # Regular pointer
                    type_str = f'{param_type} * const'
            else:
                # Not a pointer, just a regular type with possible const
                type_str = f'{param_type}'
                if is_const:
                    type_str = f'const {type_str}'
            
            if is_array:
                type_str += f'[{is_array}]'  # Add array size if applicable

            param_strs.append(f'{type_str} {param_name}')

        params_str = ', '.join(param_strs)

        # Construct the function declaration
        doc_comment = (
            f'/**\n'
            f' * @brief {documentation}\n'
            f' * @id {func.get("$id", "unknown")}\n'
            f' */\n'
        )
        declaration = f'{return_type} {func_name}({params_str});\n'

        if visibility == 'private':
            private_declarations += doc_comment + 'static ' + declaration
        else:
            public_declarations += doc_comment + declaration

    return (private_declarations, public_declarations)

def generate_data_structures_and_typedefs(data_structures, links):
    private_structures = ''
    public_structures = ''
    private_typedefs = ''
    public_typedefs = ''
    
    for ds in data_structures:
        # Determine visibility
        ds_visibility = ds.get('visibility', 'public')
        
        # Search for the structure's label in links
        ds_label = ds.get('$label', 'unknown')
        ds_type = ds.get('type', 'struct')
        ds_documentation = ds.get('documentation', 'No documentation available')
        members = ds.get('members', [])
        
        # Create the structure declaration
        doc_comment = (
            f'/**\n'
            f' * @brief {ds_documentation}\n'
            f' * @id {ds.get("$id", "unknown")}\n'
            f' */\n'
        )
        
        structure_start = f'{doc_comment}{ds_type} {ds_label} {{\n'
        structure_end = '};\n'
        
        member_declarations = ''
        for member in members:
            # Search for the member's datatype label in links
            member_type_info = search_id(links, member['datatype'])
            if member_type_info is None:
                continue  # Skip if datatype is not found

            member_type = member_type_info.get('$label')
            member_name = member.get('$label', 'unknown')
            is_pointer = member.get('isPointer', False)
            is_const = member.get('isConst', False)
            is_array = member.get('isArray', '')
            is_volatile = member.get('isVolatile', False)
            
            # Construct the member type string
            if is_pointer:
                if is_const:
                    type_str = f'{member_type}{" const" if not member.get("isPointerConst", False) else " const"} *'
                else:
                    type_str = f'{member_type} *'
            else:
                type_str = f'{"volatile " if is_volatile else ""}{member_type}'
                if is_const:
                    type_str = f'const {type_str}'
                
            if is_array:
                type_str += f'[{is_array}]'  # Add array size if applicable

            # Add member declaration with documentation
            member_doc_comment = (
                f'    /**\n'
                f'     * @brief {member.get("documentation", "No documentation available")}\n'
                f'     * @id {member.get("$id", "unknown")}\n'
                f'     */\n'
            )
            member_declaration = f'    {member_doc_comment}    {type_str} {member_name};\n'
            member_declarations += member_declaration

        # Append the structure to the appropriate declarations string
        structure_declaration = f'{structure_start}{member_declarations}{structure_end}\n'
        
        if ds_visibility == 'private':
            private_structures += structure_declaration
            private_typedefs += f'{doc_comment}typedef {ds_type} {ds_label};\n'
        else:
            public_structures += structure_declaration
            public_typedefs += f'{doc_comment}typedef {ds_type} {ds_label};\n'

    return private_structures, public_structures, private_typedefs, public_typedefs

def generate_typedefs(typedefs, links):
    private_typedefs = ''
    public_typedefs = ''
    
    for typedef in typedefs:
        # Determine visibility
        typedef_visibility = typedef.get('visibility', 'public')
        
        # Get typedef properties
        typedef_label = typedef.get('$label', 'unknown')
        typedef_documentation = typedef.get('documentation', 'No documentation available')
        typedef_datatype_id = typedef.get('datatype', 'unknown')
        
        # Search for the typedef's datatype in links
        typedef_type_info = search_id(links, typedef_datatype_id)
        if typedef_type_info is None:
            continue  # Skip if datatype is not found
        
        typedef_type = typedef_type_info.get('$label', 'unknown')
        
        # Create the typedef declaration
        doc_comment = (
            f'/**\n'
            f' * @brief {typedef_documentation}\n'
            f' * @id {typedef.get("$id", "unknown")}\n'
            f' */\n'
        )
        
        typedef_declaration = f'{doc_comment}typedef {typedef_type} {typedef_label};\n'
        
        # Append the typedef to the appropriate declarations string
        if typedef_visibility == 'private':
            private_typedefs += typedef_declaration
        else:
            public_typedefs += typedef_declaration

    return private_typedefs, public_typedefs

def generate_enums(enumerators, links):
    private_enums = ''
    public_enums = ''
    private_enum_typedefs = ''
    public_enum_typedefs = ''
    
    for enum in enumerators:
        # Determine visibility
        enum_visibility = enum.get('visibility', 'public')
        
        # Get enum properties
        enum_label = enum.get('$label', 'unknown')
        enum_documentation = enum.get('documentation', 'No documentation available')
        members = enum.get('members', [])
        
        # Create the enum declaration
        doc_comment = (
            f'/**\n'
            f' * @brief {enum_documentation}\n'
            f' * @id {enum.get("$id", "unknown")}\n'
            f' */\n'
        )

        enum_start = f'{doc_comment}enum {enum_label}{{\n'
        enum_end = f'}};\n'
        
        member_declarations = ''
        for member in members:
            member_name = member.get('$label', 'unknown')
            member_value = member.get('value', '0')
            member_doc_comment = (
                f'    /**\n'
                f'     * @brief {member.get("documentation", "No documentation available")}\n'
                f'     * @id {member.get("$id", "unknown")}\n'
                f'     */\n'
            )
            member_declaration = f'    {member_doc_comment}    {member_name} = {member_value},\n'
            member_declarations += member_declaration

        # Complete enum declaration
        enum_declaration = f'{enum_start}{member_declarations.rstrip(",\n")}\n{enum_end}\n'

        if enum_visibility == 'private':
            private_enums += enum_declaration
            private_enum_typedefs += f'{doc_comment}typedef enum {enum_label};\n'
        else:
            public_enums += enum_declaration
            public_enum_typedefs += f'{doc_comment}typedef enum {enum_label};\n'

    return private_enums, public_enums, private_enum_typedefs, public_enum_typedefs

def generate_includes(class_name, public_includes, private_includes, links):
    private_includes_str = '#include "'+class_name+'.h"\n'
    public_includes_str = ''

    for include in public_includes:
        include_info = search_id(links, include)
        if include_info is None:
            continue  # Skip if include is not found
    
        include_label = include_info.get('$label', 'unknown')
        public_includes_str += f'#include "{include_label}.h"\n'

    for include in private_includes:
        include_info = search_id(links, include)
        if include_info is None:
            continue

        include_label = include_info.get('$label', 'unknown')
        private_includes_str += f'#include "{include_label}.h"\n'

    return public_includes_str, private_includes_str

# Modify template based on JSON data
def modify_templates(c_template, h_template, entry, output_path, links, clang_format_command):
    # Using the `$id` from the JSON data
    entry_id = entry['$id']
    class_name = entry['$label']
    patterns = {
        '_className': class_name,
        '__CLASS_NAME_UC_H__': '__' + class_name.upper() + '_H__',
        '_req': get_requirements_description(entry.get('requirements', []), links),
        '_classDescription': f'{class_name} description'
    }

    # Replace placeholders in the template
    c_template_modified = replace_placeholders(c_template, patterns)
    h_template_modified = replace_placeholders(h_template, patterns)

    # Generate declarations based on JSON data
    var_private_declarations, var_public_declarations, var_header_declarations = generate_variable_declarations(entry['variables'], links)
    fun_private_declarations, fun_public_declarations = generate_function_declaration(entry['funcions'], links)
    data_struct_private_declarations, \
    data_struct_public_declarations, \
    private_data_struct_typedefs, \
    public_data_struct_typedefs = generate_data_structures_and_typedefs(entry['datastructures'], links)
    private_typdefs, public_typdefs = generate_typedefs(entry['typedefs'], links)
    private_enums, public_enums, \
    private_typdef_enums, public_typdef_enums = generate_enums(entry['enumerators'], links)
    public_includes, private_includes = generate_includes(class_name, entry.get('public dependencies', []), entry.get('private dependencies', []), links)

    # Insert generated declarations into template sections
    c_template_modified = c_template_modified.replace('/******* GLOBAL VARIABLES DECLARATION ******/', 
                                                      '/******* GLOBAL VARIABLES DECLARATION ******/\n' + var_public_declarations)

    c_template_modified = c_template_modified.replace('/******* STATIC VARIABLES DECLARATION ******/', 
                                                      '/******* STATIC VARIABLES DECLARATION ******/\n' + var_private_declarations)

    c_template_modified = c_template_modified.replace('/******* STATIC FUNCTION DECLARATION *******/', 
                                                      '/******* STATIC FUNCTION DECLARATION *******/\n' + fun_private_declarations)

    h_template_modified = h_template_modified.replace('/****** GLOBAL FUNCTION DECLARATION *******/', 
                                                      '/****** GLOBAL FUNCTION DECLARATION *******/\n' + fun_public_declarations)

    c_template_modified = c_template_modified.replace('/***************** TYPEDEFS ***************/', 
                                                      '/***************** TYPEDEFS ***************/\n' + private_typdef_enums + private_data_struct_typedefs + private_typdefs + private_enums + data_struct_private_declarations)

    h_template_modified = h_template_modified.replace('/***************** TYPEDEFS ***************/', 
                                                      '/***************** TYPEDEFS ***************/\n' + public_typdef_enums + public_data_struct_typedefs + public_typdefs + public_enums + data_struct_public_declarations)

    h_template_modified = h_template_modified.replace('/****** GLOBAL VARIABLES DECLARATION ******/', 
                                                      '/****** GLOBAL VARIABLES DECLARATION ******/\n' + var_header_declarations)
    
    c_template_modified = c_template_modified.replace('/***************** HEADERS ****************/', 
                                                      '/***************** HEADERS ****************/\n' + private_includes)

    h_template_modified = h_template_modified.replace('/***************** HEADERS ****************/', 
                                                      '/***************** HEADERS ****************/\n' + public_includes)
    
    # Use the `$id` for the filename
    c_filename = f'{output_path}/{class_name}-{entry_id}.c'
    h_filename = f'{output_path}/{class_name}-{entry_id}.h'

    # Write the modified templates to new files
    with open(c_filename, 'w') as c_file:
        c_file.write(c_template_modified)
    with open(h_filename, 'w') as h_file:
        h_file.write(h_template_modified)

    # Format the files using clang-format if a command is provided
    if clang_format_command:
        for filename in [c_filename, h_filename]:
            try:
                subprocess.run([clang_format_command, '-i', filename], check=True)
                print(f"Formatted file {filename} using {clang_format_command}.")
            except subprocess.CalledProcessError as e:
                print(f"Error occurred while formatting {filename}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert JSON to Autogenerated C Code")
    parser.add_argument("-f", "--file", required=True, help="Path to the JSON file")
    parser.add_argument("-i", "--id", required=True, help="ID to search for in the JSON")
    parser.add_argument("-t", "--templates", required=True, help="Path where templates are located")
    parser.add_argument("-o", "--output", required=True, help="Path where to refresh the autogenerated code")
    parser.add_argument("--clang-format", help="Path to the clang-format executable")

    args = parser.parse_args()

    try:
        # Load templates from files
        c_template = read_file_content(f'{args.templates}/elausa_template.c')
        h_template = read_file_content(f'{args.templates}/elausa_template.h')

        # Load the JSON data from the file
        with open(args.file, 'r') as json_file:
            json_data = json.load(json_file)

        # Check if 'Structure' and 'libraries' keys are present and non-empty
        if 'Structure' in json_data and len(json_data['Structure']) > 0:
            structures = json_data['Structure']
            for structure in structures:
                if 'libraries' in structure and len(structure['libraries']) > 0: 
                    libraries = structure['libraries']
                    for library in libraries:
                        # Check id matches the one requested
                        if '$id' in library and library['$id'] == args.id:
                            # Run the function with the actual template contents and output path
                            modify_templates(c_template, h_template, library, args.output, json_data['$links'], args.clang_format)
                            print(f"Templates generated successfully at {args.output} for ID {args.id}.")
                            sys.exit(0)

    except Exception as e:
        print(f"An error occurred: {e}")
