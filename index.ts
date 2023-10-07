#! /usr/bin/env node
import { green, cyan, red } from 'picocolors'
import Commander from 'commander'
import packageJson from './package.json'
import prompts from 'prompts';
import path from 'path';
import fs from 'fs';
import { isFolderEmpty } from './helpers/is-folder-empty';
import { getPkgManager } from './helpers/get-pkg-manager';
import createApp from './create-app';
import { getLatestVersion } from './helpers/get-version';
import { getOnline } from './helpers/is-online';
import { shadcnComponent } from './helpers/shadcn-component';

let projectPath = "";

const handleSigTerm = () => process.exit(0);

process.on("SIGTERM", handleSigTerm);
process.on("SIGINT", handleSigTerm);

const onPromptState = (state: any) => {
  if (state.aborted) {
    // If we don't re-enable the terminal cursor before exiting
    // the program, the cursor will remain hidden
    process.stdout.write('\x1B[?25h')
    process.stdout.write('\n')
    process.exit(1)
  }
}

const program = new Commander.Command(packageJson.name)
  .version(packageJson.version)
  .argument('<project-directory>')
  .usage(`${green('<project-directory>')}`)
  .action((name) => {
    projectPath = name
  })
  .parse(process.argv);

const packageManager = getPkgManager();

async function run(): Promise<void> {
  if (typeof projectPath === 'string') {
    projectPath = projectPath.trim();
  }

  if (!projectPath) {
    const res = await prompts({
      onState: onPromptState,
      type: 'text',
      name: 'path',
      message: 'What is your project name?',
      initial: 'my-app'
    });

    if (typeof res.path === 'string') {
      projectPath = res.path.trim();
    }
  }

  if (!projectPath) {
    console.log(
      '\nPlease specify the project directory:\n' +
        `  ${cyan(program.name())} ${green('<project-directory>')}\n` +
        'For example:\n' +
        `  ${cyan(program.name())} ${green('my-next-app')}\n\n` +
        `Run ${cyan(`${program.name()} --help`)} to see all options.`
    )
    process.exit(1)
  }

  const preferences = {
    swr: true,
    shadcn: [] as string[]
  };

  const { swr } = await prompts(
    {
      type: 'toggle',
      name: 'swr',
      message: `Would you like to use swr?`,
      initial: true,
      active: 'Yes',
      inactive: 'No',
    },
    {
      /**
             * User inputs Ctrl+C or Ctrl+D to exit the prompt. We should close the
             * process and not write to the file system.
             */
      onCancel: () => {
        console.error('Exiting.')
        process.exit(1)
      },
    }
  )

  preferences.swr = Boolean(swr);

  const { shadcn } = await prompts(
    {
      type: 'multiselect',
      name: 'shadcn',
      message: `What component would you like to bootstrap (shadcn-ui)?`,
      choices: shadcnComponent,
      hint: '- Space to select. Return to submit'
    },
    {
      /**
             * User inputs Ctrl+C or Ctrl+D to exit the prompt. We should close the
             * process and not write to the file system.
             */
      onCancel: () => {
        console.error('Exiting.')
        process.exit(1)
      },
    }
  )

  preferences.shadcn = shadcn;


  const resolvedProjectPath = path.resolve(projectPath);

  const root = path.resolve(resolvedProjectPath)
  const appName = path.basename(root)
  const folderExists = fs.existsSync(root)

  if (folderExists && !isFolderEmpty(root, appName)) {
    process.exit(1)
  }

  const useYarn = packageManager === 'yarn';
  const isOnline = !useYarn || (await getOnline());
  const version = getLatestVersion({isOnline, packageManager});
  console.log(green(`Creating project ${projectPath} using next.js version ${version}`));

  await createApp({
    appPath: resolvedProjectPath,
    packageManager,
    typescript: true,
    eslint: true,
    tailwind: true,
    appRouter: true,
    srcDir: false,
    importAlias: '@/*',
    version,
    ...preferences,
  });
}

run()
  .catch(async (reason) => {
    console.log()
    console.log('Aborting installation.')
    if (reason.command) {
      console.log(`  ${cyan(reason.command)} has failed.`)
    } else {
      console.log(
        red('Unexpected error. Please report it as a bug:') + '\n',
        reason
      )
    }
    console.log();

    process.exit(1)
  })