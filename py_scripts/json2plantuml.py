import argparse
import json
import os

colors = [
    "lightblue",
    "lightcoral",
    "lightsalmon",
    "lightseagreen",
    "lightyellow"  # Fixed typo: "ligthyellow" -> "lightyellow"
]

# Create a function to search in the list of links given an id
def search_id(links, id):
    for link in links:
        if link['$id'] == id:
            return link
    return None
    
# Function to convert JSON Class to PlantUML Class
def json2plantuml(json_class, links=[]):
    try:
        class_name = json_class['$label']
        variables = json_class.get('variables', [])
        functions = json_class.get('functions', [])  # Fixed typo: "funcions" -> "functions"
        plantuml_class = f'class {class_name} {{\n'

        for variable in variables:
            found_id = search_id(links, variable['datatype'])
            datatype = found_id['$label'] if found_id else variable['datatype']

            # Handle modifiers
            if variable['isArray'] != '':
                datatype += f'[{variable["isArray"]}]'
            if variable['isPointer']:
                datatype += '*'
            if variable['isVolatile']:
                datatype = 'volatile ' + datatype
            if variable['isConst']:
                datatype = 'const ' + datatype

            visibility = variable['visibility']
            if visibility == 'protected':
                plantuml_class += f'    ~{variable["$label"]} : {datatype}\n'
            elif visibility == 'private':
                plantuml_class += f'    -{variable["$label"]} : {datatype}\n'
            else:
                plantuml_class += f'    +{variable["$label"]} : {datatype}\n'
        
        plantuml_class += '\n'
        
        for function in functions:
            visibility = function['visibility']
            
            # Start building the function declaration based on visibility
            if visibility == 'protected':
                plantuml_class += f'    ~{function["$label"]}('
            elif visibility == 'private':
                plantuml_class += f'    -{function["$label"]}('
            else:
                plantuml_class += f'    +{function["$label"]}('
            
            # Process the parameters
            parameters = function.get('parameters', [])
            for i, parameter in enumerate(parameters):
                if i > 0:
                    plantuml_class += ', '
                found_id = search_id(links, parameter['datatype'])
                datatype = found_id['$label'] if found_id else parameter['datatype']
                
                # Handle parameter modifiers
                if parameter['isArray'] != '':
                    datatype += f'[{parameter["isArray"]}]'
                if parameter['isPointer']:
                    datatype += '*'
                if parameter['isConstPointer']:
                    datatype = 'const ' + datatype + '*'
                elif parameter['isPointerToConst']:
                    datatype += ' const*'
                
                plantuml_class += f'{parameter["$label"]}: {datatype}'
            
            plantuml_class += ')'
            
            # Process the return type
            return_type_info = function.get('returntype', {})
            found_id = search_id(links, return_type_info.get('datatype', ''))
            return_datatype = found_id['$label'] if found_id else return_type_info.get('datatype', '')
            
            # Handle return type modifiers
            if return_type_info.get('isPointer', False):
                return_datatype += '*'
            if return_type_info.get('isConst', False):
                return_datatype = 'const ' + return_datatype
            
            plantuml_class += f' : {return_datatype}\n'

        plantuml_class += '}\n'
        return plantuml_class
    except KeyError as e:
        print(f"KeyError: Missing key {e} in JSON class.")
        return ''
    except Exception as e:
        print(f"Error in json2plantuml: {e}")
        return ''

def json2plantuml_hsm(hsm, links=[]):
    def generate_plantuml_state_machine(state, indent=0):
        try:
            plantuml = ""
            indent_str = "    " * indent

            is_initial = state.get('isInit', True)
            if is_initial:
                plantuml += f"{indent_str}[*] --> {state['$label']}\n"

            # Add the state label
            plantuml += f"{indent_str}state \"{state['$label']}\" as {state['$label']} #{colors[indent]} {{\n"

            # Process the nested states recursively
            for substate in state.get('states', []):
                plantuml += generate_plantuml_state_machine(substate, indent + 1)

            # Process guards within this state
            for guard in state.get('guards', []):
                choice_state = f"{guard['$label']}"
                
                # Extract the condition
                condition = guard.get('condition', 'undefined condition')
                
                # Add the state with the condition
                plantuml += f"{indent_str}    state {choice_state} <<choice>> : {condition}\n"
                
                # Retrieve the target states based on guard conditions
                true_target_state = search_id(links, guard['true']['to'])['$label']
                false_target_state = search_id(links, guard['false']['to'])['$label']
                
                # Add transitions to the PlantUML
                plantuml += f"{indent_str}    {choice_state} --> {true_target_state} : [{guard['condition']}=true]\n"
                plantuml += f"{indent_str}    {choice_state} --> {false_target_state} : [{guard['condition']}=false]\n"

            # Process transitions within this state
            for transition in state.get('transitions', []):
                event = search_id(links, transition['event'])['$label']
                target_state = search_id(links, transition['transition']['to'])['$label']
                if target_state != state['$label']:
                    plantuml += f"{indent_str}    {state['$label']} --> {target_state} : {event}\n"
                else:
                    plantuml += f"{indent_str}    {target_state} : {event}\n"
        
            plantuml += f"{indent_str}}}\n"
            return plantuml
        except KeyError as e:
            print(f"KeyError: Missing key {e} in state machine.")
            return ''
        except Exception as e:
            print(f"Error in generate_plantuml_state_machine: {e}")
            return ''

    try:
        plantuml = "@startuml\n"

        # Generate the state machine
        for state in hsm.get('states', []):
            plantuml += generate_plantuml_state_machine(state)

        # Add the legend at the top left corner
        plantuml += "legend left\n"
        plantuml += "  <b><u>HSM levels:</u></b>\n"
        for idx, color in enumerate(colors):
            plantuml += f"  <back:{color}>  </back> level {idx} ↓\n"
        plantuml += "endlegend\n\n"

        plantuml += "@enduml\n"
        return plantuml
    except KeyError as e:
        print(f"KeyError: Missing key {e} in HSM.")
        return ''
    except Exception as e:
        print(f"Error in json2plantuml_hsm: {e}")
        return ''

# Function to parse JSON file
def parse_json(json_path):
    try:
        with open(json_path) as file:
            data = json.load(file)
        
        # Collect PlantUML content
        plantuml_content = ""

        # Check if there are classes to parse
        if 'Classes' in data:
            classes = data['Classes']
            for classs in classes:
                # Check if there are state machines (HSMs) to parse
                if 'hsm' in classs:
                    hsms = classs['hsm']
                    for hsm in hsms:
                        plantuml_content += json2plantuml_hsm(hsm, data['$links'])
        
        # Save PlantUML content to the file with UTF-8 encoding
        file_path = 'temp.puml'
        if not os.path.exists(file_path):
            print(f"{file_path} does not exist. It will be created.")

        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(plantuml_content)
        
        print(f"PlantUML content has been saved to {file_path}")
    except FileNotFoundError:
        print(f"FileNotFoundError: The file {json_path} was not found.")
    except json.JSONDecodeError:
        print("JSONDecodeError: Failed to decode JSON. Ensure the file is valid JSON.")
    except Exception as e:
        print(f"Error in parse_json: {e}")

def main():
    try:
        # Create an argument parser
        parser = argparse.ArgumentParser(description='Process JSON file.')

        # Add the input file argument
        parser.add_argument('-i', '--input', type=str, help='Path to the JSON file')

        # Parse the command-line arguments
        args = parser.parse_args()

        # Check if the input file argument is provided
        if args.input:
            json_file = args.input
            # Process the JSON file here
            parse_json(json_file)
        else:
            print("Please provide the path to the JSON file using the -i/--input argument.")
    except Exception as e:
        print(f"Error in main: {e}")

if __name__ == '__main__':
    main()
