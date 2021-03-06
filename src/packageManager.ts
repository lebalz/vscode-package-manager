import { vscodeInstallChocolatey, isChocolateyInstalled, inElevatedShell, inShell } from "./chocolatey";
import { Progress, ErrorMsg, SuccessMsg, TaskMessage, promptRootPassword } from "./helpers";
import { vscodeInstallBrew, isBrewInstalled } from "./homebrew";
import { ExtensionContext } from "vscode";
import OsShell from "./osShell";

export function vscodeInstallPackageManager(context: ExtensionContext, progress: Progress, progressOnSuccess: number): Thenable<boolean> {
  if (process.platform === 'win32') {
    return vscodeInstallChocolatey(progress, progressOnSuccess);
  } else if (process.platform === 'darwin') {
    return vscodeInstallBrew(context, progress, progressOnSuccess);
  } else {
    throw new Error('Plattform not supported');
  }
}

export function isPackageManagerInstalled(): Thenable<boolean> {
  if (process.platform === 'win32') {
    return isChocolateyInstalled();
  } else if (process.platform === 'darwin') {
    return isBrewInstalled();
  } else {
    throw new Error('Plattform not supported');
  }
}

/**
 * executes a command within the native os shell.
 * Windows: cmd, OSX: bash or zsh
 * @param cmd [string]
 * @return Promise<TaskMessage>
 */
export function shellExec(cmd: string): Thenable<TaskMessage> {
  return OsShell.exec(cmd)
    .then(({ stdout, stderr, exitCode }) => {
      if (exitCode === 0) {
        return SuccessMsg(stdout, stderr);
      }
      if (stderr.length > 0) {
        if (stdout.length === 0) {
          return ErrorMsg(stderr.trim());
        }
        return ErrorMsg(`${stderr}\n${stdout}`.trim());
      }
      return SuccessMsg(stdout);
    })
    .catch((error: Error) => {
      return ErrorMsg(`${error.name}: ${error.message}`);
    });
}

export function inOsShell(cmd: string, options?: { sudo?: boolean, requiredCmd?: string, disableChocoCheck?: boolean, promptMsg?: string }): Thenable<TaskMessage> {
  if (process.platform === 'win32') {
    if (options?.sudo) {
      return inElevatedShell(cmd, options);
    }
    return inShell(cmd, options);
  }
  if (options?.sudo) {
    return promptRootPassword(options.promptMsg)
      .then((rootPw) => {
        if (!rootPw) {
          // throw new Error('No root password was provided');
          return ErrorMsg('Error: No root password provided');
        }
        return shellExec(`echo "${rootPw}" | sudo -S echo foo > /dev/zero && ${cmd}`);
      });
  }
  return shellExec(cmd);
}