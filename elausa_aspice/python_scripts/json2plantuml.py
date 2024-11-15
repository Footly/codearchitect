from decode_json import DecodeJson
import argparse
import sys

# Define colors array
colors = [
    "lightblue",
    "lightcoral",
    "lightsalmon",
    "lightseagreen",
    "lightyellow"
]

class PlantUMLConverter:
    def __init__(self, json):
        self.json = json
        self.plantuml_output = ""
        # Check the 'tags' field in the JSON and execute the corresponding class
        if 'tags' in self.json and 'reqs' in self.json['tags']:
            self.generate_plantuml_req()
        elif 'tags' in self.json and 'interface' in self.json['tags']:
            self.generate_plantuml_interface()
            
    def generate_plantuml_req(self):
        type = 'requirement'
        try:
            self.plantuml_output = f"@startuml {self.json['id']}\n"
            self.plantuml_output += f'class {self.json["label"]} <<{type}>>\n'
            self.plantuml_output += f'hide <<{type}>> methods\n' 
            self.plantuml_output += f'hide <<{type}>> circle\n'
            self.plantuml_output += f'hide <<{type}>> attributes\n'
            self.plantuml_output += '@enduml\n'
            
        except Exception as e:  # Catching the general exception
            raise RuntimeError(f"Failed to generate PlantUML: {e}")
        
    def generate_plantuml_interface(self):
        type = 'interface'
        try:
            self.plantuml_output = f"@startuml {self.json['id']}\n"
            self.plantuml_output += f'class {self.json["label"]} <<{type}>>\n'
            self.plantuml_output += f'hide <<{type}>> methods\n' 
            self.plantuml_output += f'hide <<{type}>> circle\n'
            self.plantuml_output += f'hide <<{type}>> attributes\n'
            self.plantuml_output += '@enduml\n'
            
        except Exception as e:  # Catching the general exception
            raise RuntimeError(f"Failed to generate PlantUML: {e}")
        
        
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert JSON to PlantUML")
    parser.add_argument("-f", "--file", required=True, help="Path to the JSON file")
    parser.add_argument("-i", "--id", required=True, help="ID to search for in the JSON")
    parser.add_argument("-o", "--output", required=False, help="Where to store the PlantUML file")

    args = parser.parse_args()

    try:
        #Read the json
        decoder = DecodeJson(args.file)
        json_data, path = decoder.search_by_id(args.id)
        converter = PlantUMLConverter(json_data)
        
        plantuml_output = converter.plantuml_output

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