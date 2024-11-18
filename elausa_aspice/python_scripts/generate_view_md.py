import argparse
from decode_json import DecodeJson
import markdown
import os
from json2plantuml import (
    PlantUMLConverter
)       
import re

def evaluate_expression(expression):
    # Remove any whitespace
    expression = expression.replace(" ", "")

    # Match the expression pattern
    match = re.match(r"(\d+)([+\-*/])(\d+)", expression)
    if not match:
        raise ValueError("Invalid expression format")

    num1, operator, num2 = match.groups()
    num1, num2 = int(num1), int(num2)

    if operator == '+':
        result = num1 + num2
    elif operator == '-':
        result = num1 - num2
    elif operator == '*':
        result = num1 * num2
    elif operator == '/':
        result = num1 / num2
    else:
        raise ValueError("Unsupported operator")    
    return int(result)

class GenerateElement:
    def __init__(self, decoder, depth, element, *args):
        self.element = element
        self.args = args
        self.ref = False
        self.depth = depth
        if isinstance(self.element, str):
            obj = decoder.search_by_id(decoder.extract_guid(self.element))
            #Check if obj is a list
            if isinstance(obj, tuple) and isinstance(obj[0], dict):
                self.element = obj[0].get("label")
                self.ref = True
        elif isinstance(self.element, list):
            for item in self.element:
                obj = decoder.search_by_id(decoder.extract_guid(item))
                #Check if obj is a list
                if isinstance(obj, tuple) and isinstance(obj[0], dict):
                    self.element[self.element.index(item)] = obj[0].get("label")
                    self.ref = True
        self.result = ""
        try:
            # Call the _generateElement method, which will be defined in subclasses
            self.result = self._generateElement()
        except Exception as e:
            print(f"Error generating element: {e}")
            self.result = f"{{Error: {e}}}"
    
    def _generateElement(self):
        """This method should be overridden by subclasses."""
        raise NotImplementedError("Subclasses must override the _generateElement method")

class MDTitle(GenerateElement):
    def _generateElement(self):
        try:
            # Remove all empty spaces from the arguments
            self.args = [arg.strip() for arg in self.args if arg.strip()]       
            # Convert the first argument to an integer if possible, otherwise default to 1
            heading_level = self.args[0].strip()
            #Check if it contains a "i" character
            if "i" in heading_level:
                #Replace the i character for the self.depth
                heading_level = heading_level.replace("i", str(self.depth))

            #Check if the heading_level contains an expression
            if "+" in heading_level or "-" in heading_level or "*" in heading_level or "/" in heading_level:
                heading_level = evaluate_expression(heading_level)
            else:
                heading_level = int(heading_level)
    
            # Check if "backtick" is in the arguments
            backticks = "backtick" in self.args     
            # If element is a string, replace newline characters with spaces
            if isinstance(self.element, str):
                heading_text = self.element.replace("\n", " ")
            # If element is a list, join the elements with a space
            elif isinstance(self.element, list):
                heading_text = " ".join(self.element)
            else:
                raise ValueError("Invalid element type for heading text")       
            # Create the markdown title with the specified heading
            # If backticks is True, use backticks for the title
            if backticks:
                markdown_title = f"{'#' * heading_level} {'`'}{heading_text}{'`'}"
            else:
                markdown_title = f"{'#' * heading_level} {heading_text}"
            return markdown_title
        
        except Exception as e:
            print(f"Error in MDTitle: {e}")
            return f"{{Error in MDTitle: {e}}}"
    
class MDText(GenerateElement):
    def _generateElement(self):
        try:
            # If element is a string, return it as is
            if isinstance(self.element, str):
                return self.element
            # If element is a list, join the elements with a newline character
            elif isinstance(self.element, list):
                return "\n".join(self.element)
            else:
                raise ValueError("Invalid element type for text")
              
        except Exception as e:
            print(f"Error in MDText: {e}")
            return f"{{Error in MDText: {e}}}"
          
class MDList(GenerateElement):
    def _generateElement(self):
        try:
            # If element is a list, join the elements with a newline character
            if isinstance(self.element, list):
                if self.ref:
                    return "\n".join([f"- [{item}](#{item.lower().replace(' ', '-')})" for item in self.element])
                else:
                    return "\n".join([f"- {item}" for item in self.element])
            else:
                raise ValueError("Invalid element type for list")
        except Exception as e:
            print(f"Error in MDList: {e}")
            return f"{{Error in MDList: {e}}}"

class MDImage(GenerateElement):
    def _generateElement(self):
        image_name = self.args[0] if self.args else "Image"
        try:
            # If element is a string, return it as is
            if isinstance(self.element, str):
                return f"<img src='{self.element}' alt='{image_name}'/>"
            else:
                raise ValueError("Invalid element type for image")
        except Exception as e:
            print(f"Error in MDImage: {e}")
            return f"{{Error in MDImage: {e}}}"
          
class MDLink(GenerateElement):
  def _generateElement(self):
    link_text = self.args[0] if self.args else "Link"
    try:
      # If element is a string, return it as is
      if isinstance(self.element, str):
        return f'<a href="{self.element}">{link_text}</a>'
      else:
        raise ValueError("Invalid element type for link")
    except Exception as e:
      print(f"Error in MDLink: {e}")
      return f"{{Error in MDLink: {e}}}"

class ViewGenerator:
    def __init__(self, json_path, id, blueprint_path, depth=1):
        self.id = id
        self.jsonPath = json_path
        self.decode = DecodeJson(json_path)
        self.depth = depth
        try:
            self.item = self.decode.search_by_id(id)[0] if self.decode.search_by_id(id) else {}
        except Exception as e:
            print(f"Error decoding JSON: {e}")
            self.item = {}
        self.md_file = ""
        self.blueprint_path = blueprint_path

        # Open the blueprint file
        try:
            with open(blueprint_path, "r") as file:
                self.blueprint_file = file.read()
        except FileNotFoundError:
            print("Blueprint file not found")
            self.blueprint_file = ""
        except Exception as e:
            print(f"Error reading blueprint file: {e}")
            self.blueprint_file = ""

        # Call the _decodeBlueprint method
        self._decodeBlueprint()

    def _createMarkdownItem(self, type_data, data, arguments):
        # Call the appropriate class based on the type
        if type_data == "title":
            element = MDTitle(self.decode, self.depth, data, *arguments[2:])
        elif type_data == "text":
            element = MDText(self.decode, self.depth, data)
        elif type_data == "list":
            element = MDList(self.decode, self.depth, data)
        elif type_data == "image":
            element = MDImage(self.decode, self.depth, data, *arguments[2:])
        elif type_data == "link":
            element = MDLink(self.decode, self.depth, data, *arguments[2:])
        else:
            print(f"Invalid type: {type_data}")
            return None

        # Append the generated element to the markdown file
        self.md_file += element.result + "\n\n"
        
    def _processData(self, type_data, arguments, data):
        """
        Process the data based on the type and arguments.
        This function handles extracting data from the JSON and creating markdown items.
        """
        if isinstance(data, str):
            self._createMarkdownItem(type_data, data, arguments)
        elif isinstance(data, list):
            if all(isinstance(item, str) for item in data):
                self._createMarkdownItem(type_data, data, arguments)
            else:
                print(f"Invalid data type in list: {data}")
        else:
            print(f"Invalid data type: {data}")

    def _decodeBlueprint(self):
        try:
            lines = self.blueprint_file.split("\n")
            idx = 0

            while idx < len(lines):
                line = lines[idx]

                # If the line contains a placeholder
                if "{{" in line and "}}" in line:
                    try:
                        start_idx = line.find("{{") + 2
                        end_idx = line.find("}}")
                        placeholder = line[start_idx:end_idx]
                        arguments = placeholder.split(":")
                        type_data = arguments[0].strip()

                        if "@" not in type_data:
                            key = arguments[1].strip()
                            #Check if data is a string surroudned by " "
                            if key[0] == '"' and key[-1] == '"':
                                data = key[1:-1]
                            else:
                                data = self.item.get(key, None)
                                if data is None:
                                    print(f"Data '{key}' not found")
                                    idx += 1
                                    continue
                                # Call the new function to handle non-loop types
                            self._processData(type_data, arguments, data)
                            
                        elif type_data == "@plantuml":
                            plantuml_output =  PlantUMLConverter(self.item).plantuml_output
                            plantuml_md = f"<!--\n{plantuml_output}\n-->\n![]({self.item.get('id')}.svg)\n"
                            self.md_file += plantuml_md + "\n\n"
                            
                        elif type_data == "@ref":
                            ref_key = arguments[1].strip()
                            id = self.item.get("id")
                            label = self.item.get("label", "No label")
                            list_refs = self.decode.get_all_refs_to_object(id, self.decode.json_data, self.decode.json_data, ref_key)
                            if not list_refs:
                                self.md_file += f"`No references found for '{label}'`\n"
                            for ref in list_refs:
                                label = ref.get("label", "No label")
                                #description = ref.get("description", "No description")[:60] + "..."
                                #self.md_file += f"- **{label}**: {description}\n"
                                anchor_label = label.lower().replace(" ", "-")
                                self.md_file += f"- **[{label}](#{anchor_label})**\n\n"
                                
                        elif type_data == "@foreach":
                            #Check if argument[2] exists
                            if len(arguments) == 3:
                                depth = arguments[2].strip()
                                if "i" in depth:
                                    #Replace the i character for the self.depth
                                    depth = depth.replace("i", str(self.depth))
                                self.depth = evaluate_expression(depth)
                                
                            searches = arguments[1].strip().split(",")
                            # Iterate over the search queries
                            for search in searches:
                                #Split the search by the . character
                                search_split = search.split(".")
                                # Get the search tag
                                tags = search_split[0].strip()
                                # Get the blueprint_file
                                blueprint_file = search_split[1]
                                loop_blueprint_path = os.path.abspath(os.path.join(os.path.dirname(self.blueprint_path), f"{blueprint_file}.md"))
                                ids = self.decode.get_ids_by_tag_within_parent_id(tags, self.item.get("id"))
                                # Iterate over the ids
                                for id in ids:
                                    loop_generator = ViewGenerator(self.jsonPath, id, loop_blueprint_path, self.depth + 1)
                                    # Append the loop markdown to the main markdown file
                                    self.md_file += loop_generator.md_file
                            
                        else:
                            print(f"Invalid type: {type_data}")

                    except Exception as e:
                        print(f"Error processing line '{line}': {e}")
                        self.md_file += f"{{Error processing line: {e}}}\n"
                else:
                    self.md_file += line + "\n\n"

                idx += 1

        except Exception as e:
            print(f"Error in _decodeBlueprint: {e}")

def main():
    # Set up argparse
    parser = argparse.ArgumentParser(description="Generate a Markdown file from a JSON input and blueprint.")
    parser.add_argument('--json', type=str, required=True, help="Path to the JSON file")
    parser.add_argument('--id', type=str, required=True, help="ID to search for in the JSON")
    parser.add_argument('--blueprint', type=str, required=True, help="Path to the blueprint file")
    parser.add_argument('--format', type=str, default="md", help="Output format (md, html)")
    args = parser.parse_args()

    # Create a ViewGenerator instance with the provided arguments
    generator = ViewGenerator(json_path=args.json, id=args.id, blueprint_path=args.blueprint)
    output_data = generator.md_file
    
    if args.format == "html":
        output_data = markdown.markdown(output_data)
    else:
        output_data = generator.md_file
    print(output_data)
    
if __name__ == "__main__":
    main()
