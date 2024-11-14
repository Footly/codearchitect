from decode_json import DecodeJson

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