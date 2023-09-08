import fs from 'fs-extra'
import { execa } from 'execa'
import { PathUtils } from '@nicepkg/gpt-runner-shared/node'

const dirname = PathUtils.getCurrentDirName(import.meta.url, () => __dirname)
const root = PathUtils.join(dirname, '..')
const dist = PathUtils.join(root, 'dist')

async function dev() {
  // remove <root>/dist
  await fs.remove(dist)

  // make symlink from <root>/node_modules/@nicepkg/gpt-runner-web/dist to <root>/dist/web
  const webDistPath = PathUtils.join(root, 'dist/web')
  const webDistPathExists = await fs.pathExists(webDistPath)
  if (!webDistPathExists) {
    await fs.ensureSymlink(
      PathUtils.join(root, 'node_modules/@nicepkg/gpt-runner-web/dist'),
      webDistPath,
    )
  }

  // make symlink from <root>/node_modules/@nicepkg/gpt-runner-shared/dist/json-schema to <root>/dist/json-schema
  const jsonSchemaDistPath = PathUtils.join(root, 'dist/json-schema')
  const jsonSchemaDistPathExists = await fs.pathExists(jsonSchemaDistPath)
  if (!jsonSchemaDistPathExists) {
    await fs.ensureSymlink(
      PathUtils.join(root, 'node_modules/@nicepkg/gpt-runner-shared/dist/json-schema'),
      jsonSchemaDistPath,
    )
  }

  await execa('tsup', ['--watch', 'src', '--sourcemap'], { cwd: root, stdio: 'inherit' })
}

dev()
