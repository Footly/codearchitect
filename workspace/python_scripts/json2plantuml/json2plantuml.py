import argparse
import json

#Create function to search in list of links given an id
def search_id(links, id):
    for link in links:
        if link['$id'] == id:
            return link
    return None

    
#Create funcio to convert JSON Class to PlantUML Class
def json2plantuml(json_class, links=[]):
    class_name = json_class['$label']
    variables = json_class.get('variables', [])
    funcions = json_class.get('funcions', [])
    plantuml_class = f'class {class_name} {{\n'

    for variable in variables:
        found_id = search_id(links, variable['datatype'])
        datatype = found_id['$label'] if found_id else variable['datatype']
        visibility = variable['visibility']
        if visibility == 'protected':
            plantuml_class += f'    ~{variable["$label"]} : {datatype}\n'
        elif visibility == 'private':
            plantuml_class += f'    -{variable["$label"]} : {datatype}\n'
        else:
            plantuml_class += f'    +{variable["$label"]} : {datatype}\n'
    
    plantuml_class += '\n'
    
    for funcio in funcions:
        visibility = funcio['visibility']
        if visibility == 'protected':
            plantuml_class += f'    ~{funcio["$label"]}('
        elif visibility == 'private':
            plantuml_class += f'    -{funcio["$label"]}('
        else:
            plantuml_class += f'    +{funcio["$label"]}('
        
        parameters = funcio.get('parameters', [])
        for i, parameter in enumerate(parameters):
            if i > 0:
                plantuml_class += ', '
            found_id = search_id(links, parameter['datatype'])
            datatype = found_id['$label'] if found_id else parameter['datatype']
            plantuml_class += f'{parameter["$label"]}: {datatype}'
        plantuml_class += ')\n'
    
    plantuml_class += '}\n'
    return plantuml_class

#Create funcio to parse JSON file
def parse_json(json_path):
    with open(json_path) as file:
        data = json.load(file)
    
    #Get classes from JSON file
    classes = data['Classes']
    
    #Loop through classes and print them
    for classs in classes:
        print(json2plantuml(classs, data['$links']))

    return classes
def main():
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
        print(f"Processing JSON file: {json_file}")
        parse_json(json_file)
    else:
        print("Please provide the path to the JSON file using the -i/--input argument.")

if __name__ == '__main__':
    main()