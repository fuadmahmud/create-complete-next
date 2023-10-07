import { PackageManager } from "./get-pkg-manager";
import { yellow, green } from "picocolors";
import spawn from 'cross-spawn'

export function getLatestVersion({
  isOnline, packageManager
}: { isOnline: boolean; packageManager: PackageManager }) {
  let args: string[] = ['view', 'next', 'version'];
  let version = '^13';
  if (!isOnline) {
    console.log(
      yellow('You appear to be offline.\nFalling back to the local cache.')
    )
    args.push('--offline')
  }

  const res = spawn.sync(packageManager, args, { encoding: 'utf-8', stdio: 'pipe' }).output;
  // Pick output and replace newline from result
  version = res.filter(out => !!out)[0]?.replace(/(\r\n|\n|\r)/gm, "") || version;
  
  return version;
}