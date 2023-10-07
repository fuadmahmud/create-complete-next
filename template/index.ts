import { install, installComponent } from '../helpers/install';

import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { cyan, bold } from 'picocolors';
import { InstallTemplateArgs } from './types';
import { copy } from '../helpers/copy';

export const SRC_DIR_NAMES = ['app', 'pages', 'styles'];

export async function installTemplate({
  appName,
  root,
  packageManager,
  isOnline,
  template,
  mode,
  tailwind,
  eslint,
  version,
  swr,
  shadcn
}: InstallTemplateArgs) {
  console.log(bold(`Using ${packageManager}.`));

  /**
   * Copy the template files to the target directory.
   */
  console.log('\nInitializing project with template:', template, '\n');
  const templatePath = path.join(__dirname, template, mode);
  const copySource = ['**']
  if (!eslint) copySource.push('!eslintrc.json')
  if (!tailwind)
    copySource.push(
      mode == 'ts' ? 'tailwind.config.ts' : '!tailwind.config.js',
      '!postcss.config.js'
    );

  await copy(copySource, root, {
    parents: true,
    cwd: templatePath,
    rename(name) {
      switch (name) {
        case 'gitignore':
        case 'eslintrc.json': {
          return `.${name}`
        }
        // README.md is ignored by webpack-asset-relocator-loader used by ncc:
        // https://github.com/vercel/webpack-asset-relocator-loader/blob/e9308683d47ff507253e37c9bcbb99474603192b/src/asset-relocator.js#L227
        case 'README-template.md': {
          return 'README.md'
        }
        default: {
          return name
        }
      }
    },
  })

  const tsconfigFile = path.join(
    root,
    mode === 'js' ? 'jsconfig.json' : 'tsconfig.json'
  )
  await fs.writeFile(
    tsconfigFile,
    (await fs.readFile(tsconfigFile, 'utf8'))
  )

  /** Create a package.json for the new project and write it to disk. */
  const packageJson: any = {
    name: appName,
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
    },
    /**
     * Default dependencies.
     */
    dependencies: {
      react: '^18',
      'react-dom': '^18',
      next: process.env.NEXT_PRIVATE_TEST_VERSION ?? version,
    },
    devDependencies: {},
  }

  if (mode === 'ts') {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      typescript: '^5',
      '@types/node': '^20',
      '@types/react': '^18',
      '@types/react-dom': '^18',
    }
  }

  /* Add Tailwind CSS dependencies. */
  if (tailwind) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      autoprefixer: '^10',
      postcss: '^8',
      tailwindcss: '^3',
    }
  }

  /* Default ESLint dependencies. */
  if (eslint) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      eslint: '^8',
      'eslint-config-next': version,
    }
  }

  if (swr) {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      swr: '^2'
    }
  }

  const devDeps = Object.keys(packageJson.devDependencies).length;
  if (!devDeps) delete packageJson.devDependencies;

  await fs.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2) + os.EOL
  )

  console.log('\nInstalling dependencies:')
  for (const dependency in packageJson.dependencies)
    console.log(`- ${cyan(dependency)}`)

  if (devDeps) {
    console.log('\nInstalling devDependencies:')
    for (const dependency in packageJson.devDependencies)
      console.log(`- ${cyan(dependency)}`)
  }

  await install(packageManager, isOnline)

  if (shadcn.length) {
    console.log('\nAdding shadcn component:')
    for (const component of shadcn)
      console.log(`- ${cyan(component)}`)

    await installComponent(isOnline, shadcn);
  }

}