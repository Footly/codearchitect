import json
import sys
import argparse
import os

# Define colors array
colors = [
    "lightblue",
    "lightcoral",
    "lightsalmon",
    "lightseagreen",
    "lightyellow"
]

class PlantUMLConverter:
    def __init__(self, json_path, id):
        self.json_path = json_path
        self.id = id
        self.links = []

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

    def search_id(self, links, id):
        """Retrieve the item from links by its ID."""
        for item in links:
            if item.get('id') == id:
                return item
        return None

    def get_datatype(self, datatype_id, json_data, default=None):
        """Retrieve and format the datatype from json_data."""
        if not datatype_id:
            return default or 'UnknownType'
        found_id = self.search_by_id(datatype_id, json_data)
        return found_id.get('label', default) if found_id else default or 'UnknownType'

    def apply_modifiers(self, datatype, item):
        """Apply modifiers (pointer, const, volatile, etc.) to the datatype."""
        if item.get('isConst'):
            datatype = 'const ' + datatype
        if item.get('isVolatile'):
            datatype = 'volatile ' + datatype
        if item.get('isPointer'):
            datatype += '*'
        if item.get('isArray'):
            datatype += f"[{item['isArray']}]"
        return datatype

    def get_visibility_symbol(self, visibility):
        """Get the visibility symbol for PlantUML."""
        if visibility == 'protected':
            return '~'
        elif visibility == 'private':
            return '-'
        else:  # default to public
            return '+'

    def json_to_plantuml_class(self, json_class):
        try:
            class_name = json_class.get('label', 'UnknownClass')
            variables = json_class.get('variables', [])
            functions = json_class.get('functions', [])
            datastructures = json_class.get('datastructures', [])
            typedefs = json_class.get('typedefs', [])
            enumerators = json_class.get('enumerators', [])

            # Initialize PlantUML output
            plantuml_output = '@startuml\n'

            # Process non-class items into separate packages
            non_class_items = {
                'DataStructures': datastructures,
                'Typedefs': typedefs,
                'Enumerators': enumerators,
            }

            for package_name, items in non_class_items.items():
                if items:
                    plantuml_output += f'package {package_name} {{\n'

                    if package_name == 'DataStructures':
                        for ds in items:
                            ds_name = ds.get('label', 'UnknownDS')
                            ds_type = ds.get('type', 'struct')
                            visibility = ds.get('visibility', 'public')
                            visibility_symbol = self.get_visibility_symbol(visibility)

                            plantuml_output += f'class {ds_name} <<{ds_type}>> {{\n'

                            for member in ds.get('members', []):
                                member_name = member.get('label', 'UnknownMember')
                                datatype = self.get_datatype(member.get('datatype'), json_data)
                                datatype = self.apply_modifiers(datatype, member)
                                plantuml_output += f"    {visibility_symbol}{member_name} : {datatype}\n"

                            plantuml_output += '}\n'

                    elif package_name == 'Typedefs':
                        for typedef in items:
                            typedef_name = typedef.get('label', 'UnknownTypedef')
                            typedef_datatype = self.get_datatype(typedef.get('datatype'), json_data)
                            visibility = typedef.get('visibility', 'private')
                            visibility_symbol = self.get_visibility_symbol(visibility)
                            plantuml_output += f'class {typedef_name} <<typedef>> {{\n'
                            plantuml_output += f"    {visibility_symbol}Type : {typedef_datatype}\n"
                            plantuml_output += '}\n'

                    elif package_name == 'Enumerators':
                        for enumerator in items:
                            enum_name = enumerator.get('label', 'UnknownEnum')
                            visibility = enumerator.get('visibility', 'public')
                            visibility_symbol = self.get_visibility_symbol(visibility)

                            plantuml_output += f'class {enum_name} <<enumeration>> {{\n'

                            for member in enumerator.get('members', []):
                                member_name = member.get('label', 'UnknownMember')
                                value = member.get('value', 'UnknownValue')
                                plantuml_output += f"    {visibility_symbol}{member_name} = {value}\n"

                            plantuml_output += '}\n'

                    plantuml_output += '}\n'

            # Process the main class
            plantuml_output += f'class {class_name} {{\n'

            # Process variables
            for variable in variables:
                datatype = self.get_datatype(variable.get('datatype'), json_data)
                datatype = self.apply_modifiers(datatype, variable)

                visibility = variable.get('visibility', 'public')
                visibility_symbol = self.get_visibility_symbol(visibility)
                plantuml_output += f"    {visibility_symbol}{variable['label']} : {datatype}\n"

            plantuml_output += '\n'

            # Process functions
            for func in functions:
                visibility = func.get('visibility', 'public')
                visibility_symbol = self.get_visibility_symbol(visibility)

                # Parameters
                parameters = func.get('parameters', [])
                param_strs = [f"{p['label']}: {self.get_datatype(p.get('datatype'), json_data, p)}" for p in parameters]

                # Function signature
                plantuml_output += f"    {visibility_symbol}{func['label']}({', '.join(param_strs)})"

                # Return type
                return_type_info = func.get('returntype', {})
                return_datatype = self.get_datatype(return_type_info.get('datatype'), json_data)
                return_datatype = self.apply_modifiers(return_datatype, return_type_info)
                
                plantuml_output += f" : {return_datatype}\n"

            plantuml_output += '}\n'

            # Add dependencies to packages
            if datastructures or typedefs or enumerators:
                plantuml_output += f'{class_name} --* DataStructures\n'
                plantuml_output += f'{class_name} --* Typedefs\n'
                plantuml_output += f'{class_name} --* Enumerators\n'

            plantuml_output += 'hide <<union>> methods\n' 
            plantuml_output += 'hide <<union>> circle\n' 
            plantuml_output += 'hide <<struct>> methods\n' 
            plantuml_output += 'hide <<struct>> circle\n' 
            plantuml_output += 'hide <<typedef>> methods\n' 
            plantuml_output += 'hide <<typedef>> circle \n' 
            plantuml_output += 'hide <<enumeration>> methods\n' 
            plantuml_output += 'hide <<enumeration>> circle\n'
            plantuml_output += '@enduml\n'
            return plantuml_output

        except Exception as e:
            print(f"Error in json_to_plantuml_class: {e}", file=sys.stderr)
            return ''

    def json_to_plantuml_hsm(self, hsm, links=[]):
        def generate_plantuml_state_machine(state, indent=0):
            try:
                plantuml = ''
                indent_str = '    ' * indent

                is_initial = state.get('isInit', True)
                if is_initial:
                    plantuml += f"{indent_str}[*] --> {state['label']}\n"

                plantuml += f'{indent_str}state "{state["label"]}" as {state["label"]} #{colors[indent]} {{\n'

                states = state.get('states', [])
                for substate in states:
                    plantuml += generate_plantuml_state_machine(substate, indent + 1)

                guards = state.get('guards', [])
                for guard in guards:
                    choice_state = guard['label']
                    condition = guard.get('condition', 'undefined condition')
                    plantuml += f"{indent_str}    state {choice_state} <<choice>> : {condition}\n"

                    true_target_state = self.search_id(links, guard['true']['to'])['label']
                    false_target_state = self.search_id(links, guard['false']['to'])['label']

                    plantuml += f"{indent_str}    {choice_state} --> {true_target_state} : [{guard['condition']}=true]\n"
                    plantuml += f"{indent_str}    {choice_state} --> {false_target_state} : [{guard['condition']}=false]\n"

                transitions = state.get('transitions', [])
                for transition in transitions:
                    event = self.search_id(links, transition['event'])['label']
                    target_state = self.search_id(links, transition['transition']['to'])['label']
                    if target_state != state['label']:
                        plantuml += f"{indent_str}    {state['label']} --> {target_state} : {event}\n"
                    else:
                        plantuml += f"{indent_str}    {target_state} : {event}\n"

                plantuml += f"{indent_str}}}\n"
                return plantuml
            except Exception as e:
                print(f"Error in generate_plantuml_state_machine: {e}", file=sys.stderr)
                return ''

        try:
            plantuml = '@startuml\n'

            states = hsm.get('states', [])
            for state in states:
                plantuml += generate_plantuml_state_machine(state)

            plantuml += 'legend left\n'
            plantuml += '  <b><u>HSM levels:</u></b>\n'
            for idx, color in enumerate(colors):
                plantuml += f'  <back:{color}>  </back> level {idx} ↓\n'
            plantuml += 'endlegend\n\n'

            plantuml += '@enduml\n'
            return plantuml
        except Exception as e:
            print(f"Error in json_to_plantuml_hsm: {e}", file=sys.stderr)
            return ''

    def json_to_plantuml(self):
        try:
            with open(self.json_path, 'r', encoding='utf8') as file:
                data = json.load(file)

            plantuml_content = ''

            # Check if 'Structure' and 'libraries' keys are present and non-empty
            if 'Structure' in data and len(data['Structure']) > 0:
                structures = data['Structure']
                for structure in structures:
                    if 'libraries' in structure and len(structure['libraries']) > 0: 
                        libraries = structure['libraries']
                        for library in libraries:
                            # Check id matches the one requested
                            if 'id' in library and library['id'] == self.id:
                                self.links = data.get('$links', [])
                                plantuml_content = self.json_to_plantuml_class(library, self.links)

            return plantuml_content
        except Exception as e:
            print(f"Error in json_to_plantuml: {e}", file=sys.stderr)
            return ''


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert JSON to PlantUML")
    parser.add_argument("-f", "--file", required=True, help="Path to the JSON file")
    parser.add_argument("-i", "--id", required=True, help="ID to search for in the JSON")
    parser.add_argument("-o", "--output", required=False, help="Where to store the PlantUML file")

    args = parser.parse_args()

    try:
        converter = PlantUMLConverter(args.file, args.id)
        plantuml_output = converter.json_to_plantuml()

        if args.output:
            # Ensure the output filename has a .puml extension
            output_file_path = args.output
            if not output_file_path.lower().endswith('.puml'):
                output_file_path += '.puml'

            # Open a file to write the output in UTF-8 encoding
            with open(output_file_path, 'w', encoding='utf-8') as output_file:
                output_file.write(plantuml_output)

            print(f"PlantUML content has been written to {output_file_path}")
        else: 
            print(plantuml_output)
            
    except Exception as e:
        print(f"Error in main execution: {e}", file=sys.stderr)