import * as vscode from "vscode";
import * as Shell from 'node-powershell';
import { execSync } from 'child_process';
import { Progress, SuccessMsg, ErrorMsg, TaskMessage } from './helpers';

export function powershell() {
  return new Shell({
    executionPolicy: 'Bypass',
    verbose: true,
    noProfile: true
  });
}

export const RELOAD_CHOCO_ENV_CMD = "$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')";
export const RELOAD_PATH_IF_CMD_MISSING = (cmd: string) => `If (-Not (Get-Command ${cmd} -errorAction SilentlyContinue )) { ${RELOAD_CHOCO_ENV_CMD} }`;
export const RELOAD_CHOCO_ENV_IF_NEEDED = RELOAD_PATH_IF_CMD_MISSING('choco');

export function chocolateyVersion() {
  return inShell('choco -v');
}

export function isChocolateyInstalled(): Thenable<boolean> {
  return chocolateyVersion().then((result) => result.success);
}

export function inElevatedShell(command: string, options?: { requiredCmd?: string, disableChocoCheck?: boolean }): Thenable<TaskMessage> {
  const ps = powershell();
  const cmd = `Start-Process -FilePath "powershell" -Wait -Verb RunAs -ArgumentList "-noprofile", "-command &{${command.replace(/(\r\n|\n|\r)/gm, "").replace(/"/g, '`"')}}"`;
  if (options?.disableChocoCheck !== true) {
    ps.addCommand(RELOAD_CHOCO_ENV_IF_NEEDED);
  }
  if (options?.requiredCmd) {
    ps.addCommand(RELOAD_PATH_IF_CMD_MISSING(options?.requiredCmd));
  }
  ps.addCommand(cmd);
  return ps.invoke().then((res) => SuccessMsg(res)).catch((err: Error) => ErrorMsg(`${err.name}: ${err.message}`));
}

export function inShell(command: string, options?: { requiredCmd?: string, disableChocoCheck?: boolean }): Thenable<TaskMessage> {
  const ps = powershell();
  if (options?.disableChocoCheck !== true) {
    ps.addCommand(RELOAD_CHOCO_ENV_IF_NEEDED);
  }
  if (options?.requiredCmd) {
    ps.addCommand(RELOAD_PATH_IF_CMD_MISSING(options?.requiredCmd));
  }
  ps.addCommand(command);
  return ps.invoke().then((res) => SuccessMsg(res)).catch((error: Error) => ErrorMsg(`${error.name}: ${error.message}`));
}

export function vscodeInstallChocolatey(
  rootProgress: Progress,
  progressOnSuccess: number) {
  return vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Install Chocolatey',
    cancellable: false
  }, (_progress, _token) => {
    return installChocolatey().then((taskMsg) => {
      if (taskMsg.success) {
        rootProgress.report({ message: 'Chocolatey installed', increment: progressOnSuccess });
        return true;
      }
      vscode.window.showErrorMessage(taskMsg.error);
      return false;
    });
  });
}

export function installChocolatey(logPath?: string): Thenable<TaskMessage> {
  return chocolateyVersion().then((versionMsg) => {
    if (versionMsg.success) {
      return versionMsg;
    }
    const logTo = logPath ? `Tee-Object -FilePath ${logPath} | Write-Output` : 'Write-Output';

    return inElevatedShell(
      `if (-Not (Test-Path -Path "$env:ProgramData\\Chocolatey")) {
          if ('RemoteSigned', 'AllSigned' -notcontains '$(Get-ExecutionPolicy)') {
            Set-ExecutionPolicy -f -ExecutionPolicy RemoteSigned
          }
          Invoke-Expression((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1')) | ${logTo}
        } else {
          echo "Chocolatey already installed"
        }`
    ).then((output) => {
      return chocolateyVersion().then((versionMsg) => {
        if (versionMsg.success) {
          return versionMsg;
        }
        return ErrorMsg('Could not install chocolatey. Try to install it manually.');
      });
    });
  });
}

let _programDataPath: string | undefined = undefined;
export function programDataPath() {
  if (_programDataPath) {
    return _programDataPath;
  }
  _programDataPath = execSync('echo %ProgramData%').toString().trim();
  return _programDataPath;
}

export function logSummaryPath() {
  return `${programDataPath()}\\chocolatey\\logs\\choco.summary.log`;
}

export function logSummary(): Promise<string> {
  const ps = powershell();
  ps.addCommand(`Get-Content -Path ${logSummaryPath()}`);
  return ps.invoke();
}

export function logSummaryLineCount(): Promise<number> {
  const ps = powershell();
  ps.addCommand(`(gc ${logSummaryPath()}).count`);
  return ps.invoke().then((lineCount) => {
    return Number.parseInt(lineCount, 10);
  }).catch(() => {
    return 0;
  });
}

export function uninstall(pkg: string, version?: string) {
  if (version) {
    return inElevatedShell(`cuninst -y ${pkg} --version ${version}`);
  }
  return inElevatedShell(`cuninst -y ${pkg}`);
}

export function setExecutionPolicy() {
  return getExecutionPolicy().then((policy) => {
    if (policy === 'RemoteSigned' || policy === 'AllSigned') {
      return policy;
    }
    return inElevatedShell('Set-ExecutionPolicy -f -ExecutionPolicy RemoteSigned').then(() => 'RemoteSigned');
  });
}

export function getExecutionPolicy() {
  const ps = powershell();
  ps.addCommand('Get-ExecutionPolicy');
  return ps.invoke().then((result) => {
    return result.trim();
  });
}