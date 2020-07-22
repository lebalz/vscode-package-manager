import {
    OutputChannel,
    window,
  } from "vscode";
  
  export interface FileStats {
    ctime: Date;
    mtime: Date;
  }
  
  export class Logger {
    private static debugging_regex = /\package-manager\b/i;
    private static output: OutputChannel | undefined;
  
    private static isDebugging = false;
  
    static configure(extensionName: string, channelName: string) {
      this.output = window.createOutputChannel(channelName);
      this.debugging_regex = new RegExp(`\\${extensionName}\\b`, 'i');
      this.isDebugging = process.env && process.env.VSCODE_DEBUGGING_EXTENSION
        ? this.debugging_regex.test(process.env.VSCODE_DEBUGGING_EXTENSION)
        : false;
    }
  
    static log(message: any, ...optMessages: any[]) {
      if (this.isDebugging) {
        console.log(message, ...optMessages);
      }
      this.print(`${(new Date).toJSON()}: ${message} ${optMessages.join(' ')}`);
    }
  
    static warn(message: any, ...optMessages: any[]) {
      if (this.isDebugging) {
        console.warn(message, ...optMessages);
      }
      this.print(`${(new Date).toJSON()}: [WARNING] ${message} ${optMessages.join(' ')}`);
    }
  
    static error(message: any, ...optMessages: any[]) {
      if (this.isDebugging) {
        console.error(message, ...optMessages);
      }
      this.print(`${(new Date).toJSON()}: [ERROR] ${message} ${optMessages.join(' ')}`);
    }
  
    static print(text: string) {
      this.output?.appendLine(text.trim());
    }
  
    static show() {
      this.output?.show();
    }
  
    static hide() {
      this.output?.hide();
    }
  
    static clear() {
      this.output?.clear();
    }
  }
  