import json
import re
import sys

class DecodeJson:
    def __init__(self, json_path):
        self.json_path = json_path
        try:
            # Load the JSON data from the file
            with open(self.json_path, 'r') as json_file:
                self.json_data = json.load(json_file)
        except FileNotFoundError:
            print(f"File {self.json_path} not found.")
            sys.exit(1)  # Exit the program if the file is not found
        except json.JSONDecodeError:
            print(f"Failed to decode JSON from file {self.json_path}.")
            sys.exit(1)  # Exit if there's an error in JSON format

    def search_by_id(self, target_id, path=[]):
        """Search for an object by its 'id' field within self.json_data."""
        try:
            if isinstance(self.json_data, dict):
                for key, value in self.json_data.items():
                    if key == "id" and value == target_id:  # Check if the key is 'id' and the value matches target_id
                        return self.json_data  # Return the entire object (dictionary)
                    else:
                        # Recursively search deeper within nested dictionaries or lists
                        result = self._recursive_search(target_id, value, path + [key])
                        if result:  # Return as soon as the object is found
                            return [result, path]

            elif isinstance(self.json_data, list):
                for index, item in enumerate(self.json_data):
                    # Recursively search within lists
                    result = self._recursive_search(target_id, item, path + [str(index)])
                    if result:  # Return as soon as the object is found
                        return [result, path]
        except Exception as e:
            print(f"Error encountered during search: {e}")
            return [None, path]

        return [None, path]  # Return None if no matching object is found

    def _recursive_search(self, target_id, json_data, path):
        """Helper function for recursively searching by 'id'."""
        try:
            if isinstance(json_data, dict):
                for key, value in json_data.items():
                    if key == "id" and value == target_id:
                        return json_data  # Return the matched dictionary object
                    result = self._recursive_search(target_id, value, path + [key])
                    if result:
                        return [result, path]

            elif isinstance(json_data, list):
                for index, item in enumerate(json_data):
                    result = self._recursive_search(target_id, item, path + [str(index)])
                    if result:
                        return [result, path]
        except Exception as e:
            print(f"Error during recursive search: {e}")
        return None

    def extract_guid(self, text):
        """Extract a GUID from the provided text."""
        try:
            # Regular expression to match the GUID pattern inside the text
            match = re.search(r'\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b', text)
            # Return the matched GUID or None if not found
            return match.group(0) if match else None
        except Exception as e:
            print(f"Error extracting GUID: {e}")
            return None

    def return_parent(self, target_id, tag):
        """Return the parent object of an item with the specified 'id' and 'tag'."""
        def search_parent(path_child, tag):
            try:
                # Base case: If path is empty, return None (we have reached the root)
                if not path_child:
                    return [None, []]

                result = self.json_data  # Start with the root of the JSON
                for key in path_child:
                    if isinstance(key, str) and key.isdigit():
                        key = int(key)  # Convert string key to integer if it's a numeric index
                    result = result[key]  # Navigate one level deeper

                # If 'id' and 'tags' exist and the tag matches, return the current object
                if 'id' in result and 'tags' in result and tag in result['tags']:
                    return [result, path_child]

                # If no match, go up one level in the path
                path_child.pop()
                return search_parent(path_child, tag)

            except KeyError as e:
                print(f"KeyError encountered: {e} in path {path_child}")
                return None, path_child
            except Exception as e:
                print(f"Unexpected error during parent search: {e}")
                return None, path_child

        try:
            # First, find the child item with the specified 'id'
            [child, path_child] = self.search_by_id(target_id)
            if not child:
                return [None, []]

            # Then, find the parent with the matching 'tag'
            return search_parent(path_child, tag)
        except Exception as e:
            print(f"Error in return_parent: {e}")
            return [None, []]