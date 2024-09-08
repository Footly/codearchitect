from decode_json import DecodeJson

class ViewGenerator:
    def __init__(self, json_path, id):
        self.id = id
        self.jsonPath = json_path
        self.decode = DecodeJson(json_path)
        self.item = self.decode.search_by_id(id)

    def generate(self):
    