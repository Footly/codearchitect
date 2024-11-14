# Base class
from decode_json import DecodeJson
from json2plantuml import (
    PlantUMLReqConverter,
    PlantUMLLayerConverter,
    PlantUMLComponentConverter,
    PlantUMLClassConverter,
    PlantUMLHSMConverter
)

class ViewGenerator:
    def __init__(self, json_path, id):
        self.id = id
        self.jsonPath = json_path
        self.decode = DecodeJson(json_path)
        self.item = self.decode.search_by_id(id)[0]

    def generate(self, view):
        raise NotImplementedError("Subclasses must implement this method")

class RequirementViewGenerator(ViewGenerator):
    def generate(self, view):
        if view == 'plantuml':
            converter = PlantUMLReqConverter(self.item, self.decode)
            plantuml_content = converter.generate()
            return plantuml_content
        else:
            raise NotImplementedError(f'This {view} has not been implemented yet in RequirementViewGenerator class')
        
class LayerViewGenerator(ViewGenerator):
    def generate(self, view):
        if view == 'plantuml':
            converter = PlantUMLLayerConverter(self.item, self.decode)
            plantuml_content = converter.generate()
            return plantuml_content
        else:
            raise NotImplementedError(f'This {view} has not been implemented yet in LayerViewGenerator class')
        
class ComponentViewGenerator(ViewGenerator):
    def generate(self, view):
        if view == 'plantuml':
            converter = PlantUMLComponentConverter(self.item, self.decode)
            plantuml_content = converter.generate()
            return plantuml_content
        else:
            raise NotImplementedError(f'This {view} has not been implemented yet in ComponentViewGenerator class')
        
class ClassViewGenerator(ViewGenerator):
    def generate(self, view):
        if view == 'plantuml':
            converter = PlantUMLClassConverter(self.item, self.decode)
            plantuml_content = converter.generate()
            return plantuml_content
        else:
            raise NotImplementedError(f'This {view} has not been implemented yet in ClassViewGenerator class')
        
class HSMViewGenerator(ViewGenerator):
    def generate(self, view):
        if view == 'plantuml':
            converter = PlantUMLHSMConverter(self.item, self.decode)
            plantuml_content = converter.generate()
            return plantuml_content
        else:
            raise NotImplementedError(f'This {view} has not been implemented yet in HSMViewGenerator class')

view1 = LayerViewGenerator("C:\\Users\\narcis.oriol\\Documents\\codearchitect\\codearchitect\\workspace\\954068.json", "10d2712c-f021-4e9d-9300-cb3e95d2db37")
print(view1.generate('plantuml'))

view2 = ComponentViewGenerator("C:\\Users\\narcis.oriol\\Documents\\codearchitect\\codearchitect\\workspace\\954068.json", "db35bdc1-a2c5-49d6-ae17-7372bef0342b")
print(view2.generate('plantuml'))