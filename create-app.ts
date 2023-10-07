import path from 'path';
import { isWriteable } from './helpers/is-writeable';
import { isFolderEmpty } from './helpers/is-folder-empty';
import { makeDir } from './helpers/make-dir';
import { getOnline } from './helpers/is-online';
import { green, cyan } from 'picocolors';
import { installTemplate } from './template';
import { tryGitInit } from './helpers/git';

type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export default async function createApp({
  appPath,
  packageManager,
  tailwind,
  eslint,
  srcDir,
  importAlias,
  version,
  swr,
  shadcn
}: {
  appPath: string
  packageManager: PackageManager
  typescript: boolean
  tailwind: boolean
  eslint: boolean
  appRouter: boolean
  srcDir: boolean
  importAlias: string
  version: string
  swr: boolean
  shadcn: string[]
}): Promise<void> {
  const root = path.resolve(appPath)

  if (!(await isWriteable(path.dirname(root)))) {
    console.error(
      'The application path is not writable, please check folder permissions and try again.'
    )
    console.error(
      'It is likely you do not have write permissions for this folder.'
    )
    process.exit(1)
  }

  const appName = path.basename(root);

  await makeDir(root);
  if (!isFolderEmpty(root, appName)) {
    process.exit(1);
  }

  const useYarn = packageManager === 'yarn';
  const isOnline = !useYarn || (await getOnline());
  const originalDirectory = process.cwd();

  console.log(`Creating a new Next.js app in ${green(root)}.`);
  console.log()

  process.chdir(root);

  await installTemplate({
    appName,
    root,
    template: 'app-tw',
    mode: 'ts',
    packageManager,
    isOnline,
    tailwind,
    eslint,
    srcDir,
    importAlias,
    version,
    swr,
    shadcn
  });

  if (tryGitInit(root)) {
    console.log('Initialized a git repository.')
    console.log()
  }

  let cdpath: string
  if (path.join(originalDirectory, appName) === appPath) {
    cdpath = appName
  } else {
    cdpath = appPath
  }

  console.log(`${green('Success!')} Created ${appName} at ${appPath}`)

  console.log('Inside that directory, you can run several commands:')
  console.log()
  console.log(cyan(`  ${packageManager} ${useYarn ? '' : 'run '}dev`))
  console.log('    Starts the development server.')
  console.log()
  console.log(cyan(`  ${packageManager} ${useYarn ? '' : 'run '}build`))
  console.log('    Builds the app for production.')
  console.log()
  console.log(cyan(`  ${packageManager} start`))
  console.log('    Runs the built app in production mode.')
  console.log()
  console.log('We suggest that you begin by typing:')
  console.log()
  console.log(cyan('  cd'), cdpath)
  console.log(`  ${cyan(`${packageManager} ${useYarn ? '' : 'run '}dev`)}`)
  console.log();
}