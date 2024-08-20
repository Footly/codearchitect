import * as fs from 'fs';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

// Function to run the Python script and capture its output
async function runPythonScript(pythonScriptPath:string , jsonPath:string, id:string){
    try {
        const command = `python ${pythonScriptPath} -f ${jsonPath} -i ${id}`;
        const {stdout, stderr} = await exec(command);

        console.log(stdout);

        if (stderr) {
            console.error(`Error from Python script: ${stderr}`);
            throw new Error(`Error from Python script: ${stderr}`);
        }
    } catch (e) {
        console.error(`Error executing Python script: ${e}`);
        throw e;
    }
}

// Parse JSON file and generate PlantUML content
export async function JSON2plantuml(pythonScriptPath:string, jsonPath:string, id:string) {
    try {
        // Run the Python script and capture the output
        await runPythonScript(pythonScriptPath, jsonPath, id);
    } catch (e) {
        console.error(`Error in JSON2plantuml: ${e}`);
    }
}