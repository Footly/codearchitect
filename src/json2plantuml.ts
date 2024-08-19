import * as fs from 'fs';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

// Promisify exec to use async/await
const exec = promisify(execCallback);

// Define colors array
const colors = [
    "lightblue",
    "lightcoral",
    "lightsalmon",
    "lightseagreen",
    "lightyellow"  // Fixed typo: "ligthyellow" -> "lightyellow"
];

// Helper function to search for an ID in a list
function searchId(links: any[], id: string) {
    return links.find(link => link['$id'] === id) || null;
}

// Convert JSON class to PlantUML class
function json2PlantUmlClass(jsonClass: any, links: any[] = []): string {
  try {
      const className = jsonClass['$label'];
      const variables = jsonClass['variables'] ?? [];  // Use default value if 'variables' is undefined
      const funcions = jsonClass['funcions'] ?? [];  // Use default value if 'funcions' is undefined
      
      let plantumlClass = '@startuml\n';
      plantumlClass += `class ${className} {\n`;

      for (const variable of variables) {
          const foundId = searchId(links, variable['datatype']);
          let datatype = foundId ? foundId['$label'] : variable['datatype'];

          // Handle modifiers
          if (variable['isArray'] !== '') {
              datatype += `[${variable["isArray"]}]`;
          }
          if (variable['isPointer']) {
              datatype += '*';
          }
          if (variable['isVolatile']) {
              datatype = 'volatile ' + datatype;
          }
          if (variable['isConst']) {
              datatype = 'const ' + datatype;
          }

          const visibility = variable['visibility'];
          if (visibility === 'protected') {
              plantumlClass += `    ~${variable["$label"]} : ${datatype}\n`;
          } else if (visibility === 'private') {
              plantumlClass += `    -${variable["$label"]} : ${datatype}\n`;
          } else {
              plantumlClass += `    +${variable["$label"]} : ${datatype}\n`;
          }
      }

      plantumlClass += '\n';

      for (const func of funcions) {
          const visibility = func['visibility'];
          const visibilitySymbol = visibility === 'protected' ? '~' : visibility === 'private' ? '-' : '+';
          plantumlClass += `    ${visibilitySymbol}${func["$label"]}(`;

          const parameters = func['parameters'] ?? [];  // Use default value if 'parameters' is undefined
          for (let i = 0; i < parameters.length; i++) {
              const parameter = parameters[i];
              if (i > 0) {
                  plantumlClass += ', ';
              }
              const foundId = searchId(links, parameter['datatype']);
              let datatype = foundId ? foundId['$label'] : parameter['datatype'];

              // Handle parameter modifiers
              if (parameter['isArray'] !== '') {
                  datatype += `[${parameter["isArray"]}]`;
              }
              if (parameter['isPointer']) {
                  datatype += '*';
              }
              if (parameter['isConstPointer']) {
                  datatype = 'const ' + datatype + '*';
              } else if (parameter['isPointerToConst']) {
                  datatype += ' const*';
              }

              plantumlClass += `${parameter["$label"]}: ${datatype}`;
          }

          plantumlClass += ')';

          const returnTypeInfo = func['returntype'] ?? {};  // Use default value if 'returntype' is undefined
          const foundId = searchId(links, returnTypeInfo['datatype'] ?? '');
          let returnDatatype = foundId ? foundId['$label'] : returnTypeInfo['datatype'] ?? '';

          // Handle return type modifiers
          if (returnTypeInfo['isPointer'] ?? false) {
              returnDatatype += '*';
          }
          if (returnTypeInfo['isConst'] ?? false) {
              returnDatatype = 'const ' + returnDatatype;
          }

          plantumlClass += ` : ${returnDatatype}\n`;
      }

      plantumlClass += '}\n';

      plantumlClass += '@enduml\n';
      return plantumlClass;
  } catch (e) {
      console.error(`Error in json2PlantUmlClass: ${e}`);
      return '';
  }
}

function json2PlantUmlHsm(hsm: any, links: any[] = []): string {
  function generatePlantUmlStateMachine(state: any, indent: number = 0): string {
      try {
          let plantuml = '';
          const indentStr = '    '.repeat(indent);

          const isInitial = state.isInit ?? true; // Handle missing property with default value
          if (isInitial) {
              plantuml += `${indentStr}[*] --> ${state['$label']}\n`;
          }

          plantuml += `${indentStr}state "${state['$label']}" as ${state['$label']} #${colors[indent]} {\n`;

          const states = state.states ?? []; // Handle missing property with default value
          for (const substate of states) {
              plantuml += generatePlantUmlStateMachine(substate, indent + 1);
          }

          const guards = state.guards ?? []; // Handle missing property with default value
          for (const guard of guards) {
              const choiceState = `${guard['$label']}`;
              const condition = guard.condition ?? 'undefined condition';
              plantuml += `${indentStr}    state ${choiceState} <<choice>> : ${condition}\n`;

              const trueTargetState = searchId(links, guard.true.to)['$label'];
              const falseTargetState = searchId(links, guard.false.to)['$label'];

              plantuml += `${indentStr}    ${choiceState} --> ${trueTargetState} : [${guard['condition']}=true]\n`;
              plantuml += `${indentStr}    ${choiceState} --> ${falseTargetState} : [${guard['condition']}=false]\n`;
          }

          const transitions = state.transitions ?? []; // Handle missing property with default value
          for (const transition of transitions) {
              const event = searchId(links, transition.event)['$label'];
              const targetState = searchId(links, transition.transition.to)['$label'];
              if (targetState !== state['$label']) {
                  plantuml += `${indentStr}    ${state['$label']} --> ${targetState} : ${event}\n`;
              } else {
                  plantuml += `${indentStr}    ${targetState} : ${event}\n`;
              }
          }

          plantuml += `${indentStr}}\n`;
          return plantuml;
      } catch (e) {
          console.error(`Error in generatePlantUmlStateMachine: ${e}`);
          return '';
      }
  }

  try {
      let plantuml = '@startuml\n';

      const states = hsm.states ?? []; // Handle missing property with default value
      for (const state of states) {
          plantuml += generatePlantUmlStateMachine(state);
      }

      plantuml += 'legend left\n';
      plantuml += '  <b><u>HSM levels:</u></b>\n';
      for (let idx = 0; idx < colors.length; idx++) {
          plantuml += `  <back:${colors[idx]}>  </back> level ${idx} ↓\n`;
      }
      plantuml += 'endlegend\n\n';

      plantuml += '@enduml\n';
      return plantuml;
  } catch (e) {
      console.error(`Error in json2PlantUmlHsm: ${e}`);
      return '';
  }
}


// Parse JSON file and generate PlantUML content
export async function JSON2plantuml(jsonPath: string, id: string): Promise<void> {
    try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

        let plantumlContent = '';

        if (data['Classes']) {
            for (const classs of data['Classes']) {
                if (classs['hsm']) {
                    for (const hsm of classs['hsm']) {
                        if(hsm['$id'] == id)
                          plantumlContent += json2PlantUmlHsm(hsm, data['$links']);
                    }
                }
                if(classs['$id'] == id)
                  plantumlContent += json2PlantUmlClass(classs, data['$links'])
            }
        }
        const filePath = 'c://Users//narcis.oriol//Documents//codearchitect//codearchitect_3//py_scripts//temp.puml';
        //const filePath = path.resolve(__dirname, 'temp.puml');
        fs.writeFileSync(filePath, plantumlContent, { encoding: 'utf8' });

        console.log(`PlantUML content has been saved to ${filePath}`);
    } catch (e) {
        console.error(`Error in parseJson: ${e}`);
    }
}