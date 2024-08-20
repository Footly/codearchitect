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

# Helper function to search for an ID in a list
def search_id(links, id):
    return next((link for link in links if link['$id'] == id), None)

# Convert JSON class to PlantUML class
def json_to_plantuml_class(json_class, links=[]):
    try:
        class_name = json_class.get('$label')
        variables = json_class.get('variables', [])
        functions = json_class.get('funcions', [])

        plantuml_class = '@startuml\n'
        plantuml_class += f'class {class_name} {{\n'

        for variable in variables:
            found_id = search_id(links, variable.get('datatype'))
            datatype = found_id['$label'] if found_id else variable.get('datatype')

            # Handle modifiers
            if variable.get('isArray') != '':
                datatype += f"[{variable.get('isArray')}]"
            if variable.get('isPointer'):
                datatype += '*'
            if variable.get('isVolatile'):
                datatype = 'volatile ' + datatype
            if variable.get('isConst'):
                datatype = 'const ' + datatype

            visibility = variable.get('visibility')
            if visibility == 'protected':
                plantuml_class += f"    ~{variable['$label']} : {datatype}\n"
            elif visibility == 'private':
                plantuml_class += f"    -{variable['$label']} : {datatype}\n"
            else:
                plantuml_class += f"    +{variable['$label']} : {datatype}\n"

        plantuml_class += '\n'

        for func in functions:
            visibility = func.get('visibility')
            visibility_symbol = '~' if visibility == 'protected' else '-' if visibility == 'private' else '+'
            plantuml_class += f"    {visibility_symbol}{func['$label']}("

            parameters = func.get('parameters', [])
            for i, parameter in enumerate(parameters):
                if i > 0:
                    plantuml_class += ', '
                found_id = search_id(links, parameter.get('datatype'))
                datatype = found_id['$label'] if found_id else parameter.get('datatype')

                # Handle parameter modifiers
                if parameter.get('isArray') != '':
                    datatype += f"[{parameter.get('isArray')}]"
                if parameter.get('isPointer'):
                    datatype += '*'
                if parameter.get('isConstPointer'):
                    datatype = 'const ' + datatype + '*'
                elif parameter.get('isPointerToConst'):
                    datatype += ' const*'

                plantuml_class += f"{parameter['$label']}: {datatype}"

            plantuml_class += ')'

            return_type_info = func.get('returntype', {})
            found_id = search_id(links, return_type_info.get('datatype', ''))
            return_datatype = found_id['$label'] if found_id else return_type_info.get('datatype', '')

            # Handle return type modifiers
            if return_type_info.get('isPointer', False):
                return_datatype += '*'
            if return_type_info.get('isConst', False):
                return_datatype = 'const ' + return_datatype

            plantuml_class += f" : {return_datatype}\n"

        plantuml_class += '}\n'
        plantuml_class += '@enduml\n'
        return plantuml_class
    except Exception as e:
        print(f"Error in json_to_plantuml_class: {e}", file=sys.stderr)
        return ''

def json_to_plantuml_hsm(hsm, links=[]):
    def generate_plantuml_state_machine(state, indent=0):
        try:
            plantuml = ''
            indent_str = '    ' * indent

            is_initial = state.get('isInit', True)
            if is_initial:
                plantuml += f"{indent_str}[*] --> {state['$label']}\n"

            plantuml += f'{indent_str}state "{state["$label"]}" as {state["$label"]} #{colors[indent]} {{\n'

            states = state.get('states', [])
            for substate in states:
                plantuml += generate_plantuml_state_machine(substate, indent + 1)

            guards = state.get('guards', [])
            for guard in guards:
                choice_state = guard['$label']
                condition = guard.get('condition', 'undefined condition')
                plantuml += f"{indent_str}    state {choice_state} <<choice>> : {condition}\n"

                true_target_state = search_id(links, guard['true']['to'])['$label']
                false_target_state = search_id(links, guard['false']['to'])['$label']

                plantuml += f"{indent_str}    {choice_state} --> {true_target_state} : [{guard['condition']}=true]\n"
                plantuml += f"{indent_str}    {choice_state} --> {false_target_state} : [{guard['condition']}=false]\n"

            transitions = state.get('transitions', [])
            for transition in transitions:
                event = search_id(links, transition['event'])['$label']
                target_state = search_id(links, transition['transition']['to'])['$label']
                if target_state != state['$label']:
                    plantuml += f"{indent_str}    {state['$label']} --> {target_state} : {event}\n"
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

# Parse JSON file and generate PlantUML content
def json_to_plantuml(json_path, id):
    try:
        with open(json_path, 'r', encoding='utf8') as file:
            data = json.load(file)

        plantuml_content = ''

        if 'Classes' in data:
            for classs in data['Classes']:
                if 'hsm' in classs:
                    for hsm in classs['hsm']:
                        if hsm['$id'] == id:
                            plantuml_content += json_to_plantuml_hsm(hsm, data.get('$links', []))
                if classs['$id'] == id:
                    plantuml_content += json_to_plantuml_class(classs, data.get('$links', []))

        return plantuml_content
    except Exception as e:
        print(f"Error in json_to_plantuml: {e}", file=sys.stderr)
        return ''

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert JSON to PlantUML")
    parser.add_argument("-f", "--file", required=True, help="Path to the JSON file")
    parser.add_argument("-i", "--id", required=True, help="ID to search for in the JSON")

    args = parser.parse_args()

    try:
        plantuml_output = json_to_plantuml(args.file, args.id)
        output_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output.puml')
        
        # Open a file to write the output in UTF-8 encoding
        with open(output_file_path, 'w', encoding='utf-8') as output_file:
            output_file.write(plantuml_output)
        
        print(f"PlantUML content has been written to {output_file_path}")

    except Exception as e:
        print(f"Error in main execution: {e}", file=sys.stderr)
