import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

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
function substitutePlaceholders(args: string[], json: { [key: string]: any }, filepath: string, stdout: any): string[] {
    return args.map(arg => {
        // Use a regular expression to find ${} placeholders
        return arg.replace(/\${(.*?)}/g, (_, key) => {
            if (key === 'id' || key === 'label') {
                return json[key];
            } else if (key === 'path') {
                return filepath;
            } else if (key === 'stdout') {
                return JSON.stringify(stdout);
            } else {
                // Return the placeholder itself if the key doesn't exist
                return `\${${key}}`;
            }
        });
    });
}

// Function to run the command based on the tool and args
export async function runCustomCommand(json: { [key: string]: any }, filepath: string, command: Command) {

    try {
        let output: string;
        let args: string[];
        let stdout: any;
        let stderr: any;

        for (const step of command.steps) {
            // Substitute placeholders in arguments
            args = substitutePlaceholders(step.args, json, filepath, stdout);

            if (step.tool === 'shell') {
                const commandString = args.join(' ');
                const result = await exec(commandString);
                stdout = result.stdout;
                stderr = result.stderr;

                output = stdout;
                if (stderr) {
                    vscode.window.showErrorMessage(`Error executing command: ${stderr}`);
                }
            } else if (step.tool === 'python') {
                const script = args[0];
                const result = await exec(`python ${script}`);
                stdout = result.stdout;
                stderr = result.stderr;

                output = stdout;
                if (stderr) {
                    vscode.window.showErrorMessage(`Error executing Python script: ${stderr}`);
                }
            } else if (step.tool == 'vscode') {
                const instruction = args[0];

                if (instruction === 'openFile') {
                    const path = args[1];
                    const document = await vscode.workspace.openTextDocument(path);
                    stdout = await vscode.window.showTextDocument(document, { preview: false });
                } else if (instruction === 'executeCommand') {
                    const cmd = args[1];
                    // Execute the plantuml.preview command
                    stdout = await vscode.commands.executeCommand(cmd);
                } else if (instruction === 'showOptions') {
                    const title = args[1];
                    const options = args.slice(2);
                    // Show a quick pick dialog to select a schema
                    stdout = await vscode.window.showQuickPick(options, { placeHolder: title});
                } else {
                    vscode.window.showErrorMessage(`Unknown vscode isntruction: ${instruction}`);
                }
                output = `VSCODE: ${instruction} done successfully`;
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
async function runPythonScript(pythonScriptPath: string, jsonPath: string, id: string) {
    try {
        const command = `python ${pythonScriptPath} -f ${jsonPath} -i ${id}`;
        const { stdout, stderr } = await exec(command);

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
export async function JSON2plantuml(pythonScriptPath: string, jsonPath: string, id: string) {
    try {
        // Run the Python script and capture the output
        await runPythonScript(pythonScriptPath, jsonPath, id);
    } catch (e) {
        console.error(`Error in JSON2plantuml: ${e}`);
    }
}