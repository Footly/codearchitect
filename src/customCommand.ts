import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import {Item, ItemTreeProvider } from './tree';

// Interfaces
export interface Step {
    tool: string;
    args: string[];
}

export interface Command {
    title: string;
    steps: Step[];
}

// Promisify exec for easier async/await usage
const exec = promisify(execCallback);

// Function to substitute placeholders with item values
function substitutePlaceholders(args: string[], json: { [key: string]: any }): string[] {
    return args.map(arg => {
        // Use a regular expression to find ${} placeholders
        return arg.replace(/\${(.*?)}/g, (_, key) => {
            if (key in json) {
                const value = json[key];

                // Check if the value is an object or array, and use JSON.stringify
                if (typeof value === 'object' && value !== null) {
                    //return JSON.stringify(value);
                    return "{}";
                } else {
                    // Convert other types to string
                    return String(value ?? "");
                }
            } else {
                // Return the placeholder itself if the key doesn't exist
                return `\${${key}}`;
            }
        });
    });
}

// Function to run the command based on the tool and args
export async function runCustomCommand(json: { [key: string]: any } , command: Command) {

    try {
        for (const step of command.steps) {
            let output: string;
            let args: string[];

            // Substitute placeholders in arguments
            args = substitutePlaceholders(step.args, json);

            if (step.tool === 'shell') {
                const commandString = args.join(' ');
                const { stdout, stderr } = await exec(commandString);

                output = stdout;
                if (stderr) {
                    vscode.window.showErrorMessage(`Error executing command: ${stderr}`);
                }
            } else if (step.tool === 'python') {
                const script = args[0];
                const { stdout, stderr } = await exec(`python ${script}`);

                output = stdout;
                if (stderr) {
                    vscode.window.showErrorMessage(`Error executing Python script: ${stderr}`);
                }
            } else {
                vscode.window.showErrorMessage(`Unknown tool: ${step.tool}`);
                return;
            }

            vscode.window.showInformationMessage(`Command output: ${output}`);
        }
    } catch (e) {
        vscode.window.showErrorMessage(`Error processing command: ${e}`);
    }
}
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