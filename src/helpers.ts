import * as vscode from "vscode";

export type Progress = vscode.Progress<{
  message?: string | undefined;
  increment?: number | undefined;
}>;

export function promptRootPassword(msg?: string): Thenable<string | undefined> {
  vscode.window.showInformationMessage(`Enter your password ${msg ?? ''}`);
  return vscode.window.showInputBox({
    password: true,
    prompt: "Root Password (used to login to your computer)",
  });
}

export interface TaskMsg {
  success: boolean;
  msg?: string;
  error?: string;
}

export interface TaskSuccess extends TaskMsg {
  success: true;
  msg: string;
}

export interface TaskError extends TaskMsg {
  success: false;
  error: string;
}

export type TaskMessage = TaskError | TaskSuccess;

export function SuccessMsg(msg: string, error?: string): TaskSuccess {
  return { success: true, msg: msg.trim(), error: error };
}

export function ErrorMsg(error: string, msg?: string): TaskError {
  return { success: false, error: error, msg: msg };
}
