import { Logger } from "./logger";
import { exec, ChildProcess, ExecException } from "child_process";

interface OsShellResult {
  stdout: string;
  stderr: string;
  error: ExecException | null;
}

export default class OsShell {
  cmd: string;
  executor?: ChildProcess;
  promise: Promise<OsShellResult>;
  constructor(cmd: string) {
    this.cmd = cmd;
    this.promise = new Promise((resolve) => {
      this.executor = exec(this.cmd, (error, stdout, stderr) => {
        Logger.log("PID [", this.executor?.pid, "] finished");
        resolve({ stdout: stdout, stderr: stderr, error: error });
      });
      Logger.log("PID [", this.executor?.pid, "] started");
      this.executor.stdout?.on("data", (message) => {
        Logger.log(message);
      });
      this.executor.stderr?.on("data", (message) => {
        Logger.error(message);
      });
    });
  }

  kill() {
    this.executor?.kill(9);
  }

  static exec(cmd: string): Promise<OsShellResult> {
    const osShell = new OsShell(cmd);
    return osShell.promise;
  }
}
