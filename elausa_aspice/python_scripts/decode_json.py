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
            
            
    def get_ids_by_tag(self, tag):
        """Get a list of 'id' values for objects with the specified tag."""
        try:
            id_list = []
            self._recursive_search_by_tag(tag, self.json_data, id_list)
            return id_list
        except Exception as e:
            print(f"Error encountered during search: {e}")
            return None
        
    def _recursive_search_by_tag(self, tag, json_data, id_list):
        """Helper function for recursively searching by tag."""
        try:
            if isinstance(json_data, dict):
                if 'tags' in json_data and tag in json_data['tags']:
                    id_list.append(json_data['id'])  # Append the 'id' value to the list
                for key, value in json_data.items():
                    self._recursive_search_by_tag(tag, value, id_list)

            elif isinstance(json_data, list):
                for item in json_data:
                    self._recursive_search_by_tag(tag, item, id_list)
        except Exception as e:
            print(f"Error during recursive search: {e}")
            
    def get_ids_by_tag_within_parent_id(self, tag, parent_id):
        """Get a list of 'id' values for objects with the specified tag within a parent object."""
        try:
            id_list = []
            self._recursive_search_by_tag_within_parent_id(tag, parent_id, self.json_data, id_list)
            return id_list
        except Exception as e:
            print(f"Error encountered during search: {e}")
            return None
        
    def _recursive_search_by_tag_within_parent_id(self, tag, parent_id, json_data, id_list):
        """Helper function for recursively searching by tag within a parent object."""
        try:
            if isinstance(json_data, dict):
                if 'id' in json_data and json_data['id'] == parent_id:
                    self._recursive_search_by_tag(tag, json_data, id_list)
                for key, value in json_data.items():
                    self._recursive_search_by_tag_within_parent_id(tag, parent_id, value, id_list)

            elif isinstance(json_data, list):
                for item in json_data:
                    self._recursive_search_by_tag_within_parent_id(tag, parent_id, item, id_list)
        except Exception as e:
            print(f"Error during recursive search: {e}")

    def search_by_id(self, target_id, path=[]):
        """Search for an object by its 'id' field within self.json_data."""
        try:
            if isinstance(self.json_data, dict):
                for key, value in self.json_data.items():
                    if key == "id" and value == target_id:
                        return self.json_data, path  # Return the entire object and its path
                    else:
                        result = self._recursive_search(target_id, value, path + [key])
                        if result[0]:  # Return as soon as the object is found
                            return result  # Already a tuple (object, path)

            elif isinstance(self.json_data, list):
                for index, item in enumerate(self.json_data):
                    result = self._recursive_search(target_id, item, path + [str(index)])
                    if result[0]:
                        return result  # Already a tuple (object, path)
        except Exception as e:
            print(f"Error encountered during search: {e}")
            return None, path

        return None, path  # Return (None, path) if no matching object is found
    
    def search_by_path(self, path):
        """Search for an object by its path within self.json_data."""
        try:
            if not path:
                return self.json_data  # Return the root object if the path is empty

            result = self.json_data
            for key in path:
                if isinstance(key, str) and key.isdigit():
                    key = int(key)  # Convert the string key to an integer
                result = result[key]  # Navigate one level deeper in the dictionary
            return result
        except KeyError as e:
            print(f"KeyError encountered: {e} in path {path}")
            return None
        except Exception as e:
            print(f"Unexpected error during search: {e}")

    def _recursive_search(self, target_id, json_data, path):
        """Helper function for recursively searching by 'id'."""
        try:
            if isinstance(json_data, dict):
                for key, value in json_data.items():
                    if key == "id" and value == target_id:
                        return json_data, path  # Return the matched dictionary object and path
                    result = self._recursive_search(target_id, value, path + [key])
                    if result[0]:
                        return result  # Already a tuple (object, path)

            elif isinstance(json_data, list):
                for index, item in enumerate(json_data):
                    result = self._recursive_search(target_id, item, path + [str(index)])
                    if result[0]:
                        return result  # Already a tuple (object, path)
        except Exception as e:
            print(f"Error during recursive search: {e}")
        return None, path  # Return (None, path) if nothing is found at this level
    
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
        
    def search_parent_by_path(self, rootData, path, tag):
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
        return self.search_parent_by_path(rootData, path, tag)
    
    def get_all_refs_to_object(self, target_id, data, rootData, tag, path=""):
        refs = []

        if isinstance(data, dict):
            for key, value in data.items():
                current_path = f"{path}.{key}" if path else key  # Build the current path
                if value == f"${{id:{target_id}}}":
                    parent_result = self.search_parent_by_path(rootData, path.split("."), tag)
                    if parent_result and parent_result[1]:
                        refs.append(parent_result[0])  # Append the entire parent dictionary
                else:
                    refs.extend(self.get_all_refs_to_object(target_id, value, rootData, tag, current_path))  # Recursively search deeper
        elif isinstance(data, list):
            for index, item in enumerate(data):
                current_path = f"{path}.{index}"
                if isinstance(item, dict) or isinstance(item, list):
                    refs.extend(self.get_all_refs_to_object(target_id, item, rootData, tag, current_path))  # Recursively search list items
                elif item == f"${{id:{target_id}}}":  # If the target is found in a simple list
                    parent_result = self.search_parent_by_path(rootData, path.split("."), tag)
                    if parent_result and parent_result[1]:
                        refs.append(parent_result[0])  # Append the parent list

        return refs