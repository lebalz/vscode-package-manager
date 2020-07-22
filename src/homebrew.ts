import * as vscode from "vscode";
import { promisify } from "util";
import { exec } from "child_process";
import { promptRootPassword, Progress, TaskMessage, SuccessMsg, ErrorMsg } from "./helpers";

export function isBrewInstalled(): Thenable<boolean> {
  const shellExec = promisify(exec);
  return shellExec("brew -v")
    .then(({ stdout, stderr }) => {
      if (stdout.length > 0) {
        return true;
      }
      return false;
    })
    .catch(() => {
      return false;
    });
}

export function installBrew(extensionPath: string, rootPW?: string): Thenable<TaskMessage> {
  return isBrewInstalled()
    .then((isInstalled) => {
      if (isInstalled) {
        return SuccessMsg('Brew installed');
      }
      if (!rootPW) {
        return ErrorMsg('Brew ist not installed and not password was entered.');
      }
      const shellExec = promisify(exec);
      return shellExec(
        `cat -s ${`${extensionPath}/bin/install_brew.sh`} | bash -s "${rootPW}" && echo "Success."`
      )
        .then(({ stdout, stderr }) => {
          if (stderr.length > 0 || !stdout.endsWith("Success.\n")) {
            return ErrorMsg(`Could not install Homebrew. Try to install it manually.\n${stderr.length > 0 ? stderr : stdout}`);
          }
          return SuccessMsg('Homebrew installed');
        })
        .catch((error: Error) => ErrorMsg(`Error occured during installation of brew.\n${error}`));
    });
}

export function vscodeInstallBrew(
  context: vscode.ExtensionContext,
  rootProgress: Progress,
  progressOnSuccess: number
): Thenable<boolean> {
  return vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Install Homebrew',
    cancellable: false
  }, (_progress, _token) => {
    return isBrewInstalled()
      .then((isInstalled) => {
        if (isInstalled) {
          rootProgress.report({ message: 'Brew installed', increment: progressOnSuccess });
          return true;
        }
        return promptRootPassword("to install Brew.")
          .then((rootPW) => {
            if (!rootPW) {
              vscode.window.showErrorMessage('Error: no root password');
              return false;
            }
            return installBrew(context.extensionPath, rootPW)
              .then((taskMsg) => {
                if (taskMsg.success) {
                  rootProgress.report({ message: 'Brew installed', increment: progressOnSuccess });
                  return true;
                }
                vscode.window.showErrorMessage(taskMsg.error);
                return false;
              });
          });
      });
  });
}