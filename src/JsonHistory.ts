import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

//Class to keep track of changes done in the file
export class JsonHistory {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private currentContent: string = '';
  private currentUndoIndex: number = -1; // Keeps track of the current position in the undo stack
  private isInUndoRedoOperation: boolean = false; // Flag to indicate if an undo/redo operation is in progress

  constructor(private jsonFilePath: string) {
    // Initialize current content with the file's content
    this.currentContent = fs.readFileSync(this.jsonFilePath, 'utf-8');
    this.undoStack.push(this.currentContent);
    this.currentUndoIndex = 0;

    // Subscribe to document changes
    vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument, this);
  }

  private onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent) {
    if (event.document.fileName.toLowerCase() === this.jsonFilePath.toLowerCase()) {
      if (this.isInUndoRedoOperation) {
        this.isInUndoRedoOperation = false;
        return; // Skip processing if an undo/redo operation is in progress
      }

      // Remove any redo entries as new change happened
      this.redoStack = [];

      // Update undo stack and current content
      this.currentContent = event.document.getText();
      if (this.currentUndoIndex === this.undoStack.length - 1) {
        // Append new change to the end of the undo stack
        this.undoStack.push(this.currentContent);
      } else {
        // Replace the current position with new change
        this.undoStack[this.currentUndoIndex + 1] = this.currentContent;
        // Remove entries after the current position
        this.undoStack = this.undoStack.slice(0, this.currentUndoIndex + 2);
      }
      this.currentUndoIndex = this.undoStack.length - 1;
    }
  }

  public undo(): boolean {
    if (this.currentUndoIndex > 0) {
      this.isInUndoRedoOperation = true; // Start undo/redo operation

      // Move current content to redo stack
      this.redoStack.push(this.currentContent);

      // Move one step back in the undo stack
      this.currentUndoIndex--;
      this.currentContent = this.undoStack[this.currentUndoIndex];
      this.writeContentToFile(this.currentContent);
      return true;
    } else {
      vscode.window.showInformationMessage('Nothing to undo');
      return false;
    }
  }

  public redo(): boolean {
    if (this.redoStack.length > 0) {
      this.isInUndoRedoOperation = true; // Start undo/redo operation

      // Move current content to undo stack
      this.undoStack.push(this.currentContent);
      this.currentUndoIndex++;

      // Move one step forward in the redo stack
      this.currentContent = this.redoStack.pop()!;
      this.writeContentToFile(this.currentContent);
      return true;
    } else {
      vscode.window.showInformationMessage('Nothing to redo');
      return false;
    }
  }

  private writeContentToFile(content: string) {
    fs.writeFileSync(this.jsonFilePath, content, 'utf-8');
    this.refreshFile();
  }

  private refreshFile() {
    const document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === this.jsonFilePath);
    if (document) {
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      edit.replace(document.uri, fullRange, this.currentContent);
      vscode.workspace.applyEdit(edit);
    }
  }
}
