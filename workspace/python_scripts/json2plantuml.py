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
    def __init__(self, json, decoder):
        self.json = json
        self.decoder = decoder
        
    def _apply_modifiers(self, datatype, item):
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

    def _get_visibility_symbol(self, visibility):
        """Get the visibility symbol for PlantUML."""
        if visibility == 'protected':
            return '~'
        elif visibility == 'private':
            return '-'
        else:  # default to public
            return '+'

    def generate(self):
        raise NotImplementedError("Subclasses must implement this method")
        
class PlantUMLReqConverter(PlantUMLConverter):
    def generate(self):
        type = 'requirement'
        if 'tags' in self.json and 'reqs' in self.json['tags']:
            try:
                plantuml_output = f"@startuml {self.json['id']}\n"
                plantuml_output += f'class {self.json["label"]} <<{type}>>\n'
                plantuml_output += f'hide <<{type}>> methods\n' 
                plantuml_output += f'hide <<{type}>> circle\n'
                plantuml_output += f'hide <<{type}>> attributes\n'
                plantuml_output += '@enduml\n'
                return plantuml_output
                
            except Exception as e:  # Catching the general exception
                raise RuntimeError(f"Failed to generate PlantUML: {e}")
                
        else:
            raise NotImplementedError("Json provided on PlantUMLReqConverter does not contain the 'reqs' tag")
        
class PlantUMLLayerConverter(PlantUMLConverter):
    def generate(self):
        type = 'layer'
        if 'tags' in self.json and 'layer' in self.json['tags']:
            try:
                plantuml_output = f"@startuml {self.json['id']}\n"
                plantuml_output += f'package {self.json["label"]} <<{type}>> {{\n'
                
                if 'components' in self.json:
                    for component in self.json['components']:
                        # Extract component details
                        component_label = component['label']
                        plantuml_output += f'  component {component_label}\n'
                        
                        # Optionally handle ports for each component, if needed
                        if 'ports' in component:
                            for port in component['ports']:
                                interface = self.decoder.search_by_id(self.decoder.extract_guid(port['interface']))[0]
                                print(port)
                                use = "" if port["use"] == "" else f': <<{port["use"]}>>'
                                if interface:
                                    if port["direction"] == 'in':
                                        plantuml_output += f'  {component["label"]} <--( {interface["label"]} {use}\n'
                                    else:
                                        plantuml_output += f'  {component["label"]} -->() {interface["label"]} {use}\n'
                plantuml_output += '}\n'
                plantuml_output += '@enduml\n'
                return plantuml_output
                
            except Exception as e:  # Catching the general exception
                raise RuntimeError(f"Failed to generate PlantUML: {e}")
                
        else:
            raise NotImplementedError("Json provided on PlantUMLLayerConverter does not contain the 'layer' tag")
        
class PlantUMLComponentConverter(PlantUMLConverter):
    def _decode_subcomponent(self, json, parent_ports):
        """Decode the component"""
        label = json['label']
        ports = json['ports']
        plantuml = f'  component {label}\n'
        for port in ports:
            interface = self.decoder.search_by_id(self.decoder.extract_guid(port['interface']))[0]
            use = "" if port["use"] == "" else f': <<{port["use"]}>>'
            found_port = False    
            for parent_port in parent_ports:
                parent_int = self.decoder.search_by_id(self.decoder.extract_guid(parent_port['interface']))[0]
                if interface and parent_int and parent_int['label'] == interface['label']:
                    found_port = True
                    if port["direction"] == 'in':
                        plantuml += f'  {label} <-- {parent_port["label"]} {use}\n'
                    else:
                        plantuml += f'  {label} --> {parent_port["label"]} {use}\n'
            
            if not found_port:
                if port["direction"] == 'in':
                    plantuml += f'  {label} <--( {interface["label"]} {use}\n'
                else:
                    plantuml += f'  {label} -->() {interface["label"]} {use}\n'
                  
        return plantuml
    
    def generate(self):
        if 'tags' in self.json and 'component' in self.json['tags']:
            id = self.json['id']
            components = self.json['components']
            try:
                plantuml_output = f"@startuml {id}\n"
                #Decode parent component
                label = self.json['label']
                ports = self.json['ports']
                plantuml_output += f'component {label}{{\n'
                for port in ports:
                    plantuml_output += f'  port{port["direction"]} {port["label"]}\n'
                #Decode subcomponents
                for component in components:
                    plantuml_output += self._decode_subcomponent(component, ports)
                plantuml_output += '}\n'
                #Implement the interfaces
                for port in ports:
                    use = "" if port["use"] == "" else f': <<{port["use"]}>>'
                    interface = self.decoder.search_by_id(self.decoder.extract_guid(port['interface']))[0]
                    if interface:
                        if port["direction"] == 'in':
                            plantuml_output += f'{port["label"]} <--( {interface["label"]} {use}\n'
                        else:
                            plantuml_output += f'{port["label"]} --> () {interface["label"]} {use}\n'
                plantuml_output += '@enduml\n'
                return plantuml_output
                
            except Exception as e:  # Catching the general exception
                raise RuntimeError(f"Failed to generate PlantUML: {e}")
                
        else:
            raise NotImplementedError("Json provided on PlantUMLComponentConverter does not contain the 'component' tag")
        
class PlantUMLClassConverter(PlantUMLConverter):
    def generate(self):
        type = 'library'
        if 'tags' in self.json and 'lib' in self.json['tags']:
            id = self.json['id']
            label = self.json['label']
            funcions = self.json['funcions']
            variables = self.json['variables']
            try:
                plantuml_output = f"@startuml {id}\n"
                plantuml_output += f'class {label} <<{type}>>{{\n'
                for var in variables:
                    datatype = self.decoder.search_by_id(self.decoder.extract_guid(var['datatype']))[0]['label']
                    datatype = self._apply_modifiers(datatype, var)

                    visibility = var['visibility']
                    visibility_symbol = self._get_visibility_symbol(visibility)
                    plantuml_output += f"  {visibility_symbol}{var['label']} : {datatype}\n"
                for fun in funcions:
                    visibility = fun['visibility']
                    visibility_symbol = self._get_visibility_symbol(visibility)

                    # Parameters
                    param_strs = [f"{p['label']}: {self.decoder.search_by_id(self.decoder.extract_guid(p['datatype']))[0]['label']}" for p in fun['parameters']]

                    # Function signature
                    plantuml_output += f"  {visibility_symbol}{fun['label']}({', '.join(param_strs)})"

                    # Return type
                    return_type_info = fun.get('returntype', {})
                    return_datatype = self.decoder.search_by_id(self.decoder.extract_guid(return_type_info['datatype']))[0]['label']
                    return_datatype = self._apply_modifiers(return_datatype, return_type_info)

                    plantuml_output += f" : {return_datatype}\n"
                plantuml_output += '}\n'
                plantuml_output += f'hide <<{type}>> circle\n'
                plantuml_output += '@enduml\n'
                return plantuml_output
                
            except Exception as e:  # Catching the general exception
                raise RuntimeError(f"Failed to generate PlantUML: {e}")
                
        else:
            raise NotImplementedError("Json provided on PlantUMLClassConverter does not contain the 'lib' tag")

class PlantUMLHSMConverter(PlantUMLConverter):
    def _decode_states(self, json, depth=0):
        """Recursively decode states into PlantUML format."""
        indent = '  ' * depth
        plantuml = ''
        if 'isInit' in json and json['isInit']:
            plantuml += indent+f'[*] --> {json["label"]}\n'
        if 'isTerminated' in json and json['isTerminated'] != "":
            plantuml += indent+f'{json["label"]} --> [*] : {self.decoder.search_by_id(self.decoder.extract_guid(json["isTerminated"]))[0]["label"]}\n'
        plantuml += indent+f'state {json["label"]} #{colors[depth]}{{\n'
        if 'states' in json and json['states']:
            for state in json['states']:
                plantuml += self._decode_states(state, depth+1)  # Recursively call and accumulate PlantUML string
        if 'hsms' in json and json['hsms']:
            for hsm in json['hsms']:
                plantuml += indent + f'  state {hsm["label"]} #line.dotted;\n'
        if 'guards' in json and json['guards']:
            for guard in json['guards']:
                    choice_state = guard['label']
                    plantuml += indent+f"  state {choice_state} <<choice>> : {guard['condition']}\n"
                    plantuml += indent+f"  {choice_state} --> {self.decoder.search_by_id(self.decoder.extract_guid(guard['true']['to']))[0]['label']} : [{guard['condition']}=true]\n"
                    plantuml += indent+f"  {choice_state} --> {self.decoder.search_by_id(self.decoder.extract_guid(guard['false']['to']))[0]['label']} : [{guard['condition']}=false]\n"
        if 'transitions' in json and json['transitions']:
            for tran in json['transitions']:
                event = self.decoder.search_by_id(self.decoder.extract_guid(tran['event']))[0]['label']
                target_state = self.decoder.search_by_id(self.decoder.extract_guid(tran['transition']['to']))[0]['label']
                if target_state != json['label']:
                    plantuml += indent + f"  {json['label']} --> {target_state} : {event}\n"
                else:
                    plantuml += indent + f"  {target_state} : {event}\n"
        plantuml += indent + '}\n'
        return plantuml
        
    def generate(self):
        if 'tags' in self.json and 'hsm' in self.json['tags']:
            id = self.json['id']
            label = self.json['label']
            try:
                plantuml_output = f"@startuml {id}\n"
                for state in self.json['States']:
                    plantuml_output += self._decode_states(state)
                
                plantuml_output += '@enduml\n'
                return plantuml_output

            except Exception as e:  # Catching the general exception
                raise RuntimeError(f"Failed to generate PlantUML: {e}")

        else:
            raise NotImplementedError("Json provided on PlantUMLClassConverter does not contain the 'hsm' tag")